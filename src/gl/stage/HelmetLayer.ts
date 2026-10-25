import * as THREE from 'three';
import { gsap } from '@/motion/gsap';
import { onIntroDone } from '@/motion/intro';
import { scrollState } from '@/motion/SmoothScroll';
import { EASE } from '@/motion/tokens';
import { bindFlight, type Flight } from '../flight/flight';
import { garageScene } from '../garage';
import { buildHelmet, type Helmet } from '../helmet/buildHelmet';
import type { Box, Pointer } from './input';
import type { Busy } from './sectionColours';

const FOV = 30, CAM_Z = 8;
/** World units per CSS pixel at the helmet's depth (z = 0), per pixel of viewport height. */
const HALF_H = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;

/** The settings both of the page's renderers share. */
export function configureRenderer(r: THREE.WebGLRenderer) {
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.0;
  r.autoClear = false;
}

/**
 * The helmet, on its own see-through, click-through canvas above the page, so it can fly
 * in front of the text and land in layout boxes (flight/flight.ts). There are no scene
 * lights: it is lit only by a pit garage baked once into a reflection map. Its canvas is
 * hidden while it is off screen, and fades back while it covers the keyboard focus.
 */
export class HelmetLayer {
  readonly renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private scene = new THREE.Scene();
  private env: THREE.Texture;
  private helmet: Helmet | null = null;
  private flight: ReturnType<typeof bindFlight> | null = null;
  private at: Flight = { x: 0, y: 0, size: 1, stand: 0, rx: 0, ry: 0, rz: 0, loose: 1 };
  /** The intro's reveal (0..1.05), handed to the shell's dissolve on every drawn frame. */
  private intro = { value: 0 };
  /** The helmet's box at scale 1 and rotation 0, in world units (for fitting it to a layout box). */
  private base = { w: 1, cx: 0, cy: 0, minY: 0 };
  /** The flight as last drawn: idle frames redraw only if it changed (a jump, the podium building). */
  private drawn = { x: Infinity, y: Infinity, size: Infinity, ry: Infinity };
  private shown = true;
  private dimmed = false;
  private disposed = false;
  /** The helmet changed without anything moving (its reveal ended, a resize): draw it on the next frame. */
  dirty = true;
  /** The float clock: advances only while something moves, so the helmet holds still when idle. */
  private clock = 0;

  constructor(canvas: HTMLCanvasElement, private readonly busy: Busy) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    configureRenderer(this.renderer);
    this.renderer.setClearColor(0x000000, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const garage = garageScene();
    this.env = pmrem.fromScene(garage.scene, 0.02).texture;
    this.scene.environment = this.env;
    garage.dispose();
    pmrem.dispose();
    this.camera.position.set(0, 0, CAM_Z);
  }

  get ready() { return this.helmet !== null; }

  /** Build the helmet, bind its flight, compile its shaders, and reveal it once the intro is done. */
  async load() {
    const helmet = await buildHelmet({ anisotropy: Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) });
    if (this.disposed) { helmet.dispose(); return; }
    this.helmet = helmet;
    this.scene.add(helmet.group);
    const box = new THREE.Box3().setFromObject(helmet.group), dims = box.getSize(new THREE.Vector3());
    this.base = { w: dims.x || 1, cx: (box.min.x + box.max.x) / 2, cy: (box.min.y + box.max.y) / 2, minY: box.min.y };
    this.flight = bindFlight();
    // Compile shaders before the reveal so the first frames don't stutter.
    this.renderer.compile(this.scene, this.camera);
    onIntroDone(() => { if (!this.disposed) this.playReveal(); });
  }

  /** Wireframe draws itself, the painted shell dissolves in, the wireframe fades. */
  private playReveal() {
    const h = this.helmet!;
    this.busy.start();
    // Ends dirty: a reveal that finished in one tick (a background tab) still gets drawn.
    gsap.timeline({ onComplete: () => { this.busy.end(); this.dirty = true; } })
      .fromTo(h.wire, { draw: 0 }, { draw: 1, duration: 1.3, ease: EASE.wipe })
      .fromTo(this.intro, { value: 0 }, { value: 1.05, duration: 1.6, ease: 'power2.inOut' }, 0.7)
      .to(h.wire, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 1.8);
  }

  resize(pixelRatio: number, w: number, h: number) {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h, false);
    this.dirty = true; // resizing cleared its canvas
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  advance(dt: number) { this.clock += dt; }

  /**
   * Place the helmet on its flight and draw it, or hide the canvas while it is off screen.
   * While nothing moves, it redraws only if the flight changed: an instant jump (a deep
   * link, a rail drag) or the layout moving under it.
   */
  draw(moving: boolean, W: number, H: number, pointer: Pointer, focus: Box | null) {
    const h = this.helmet!, g = h.group, f = this.at;
    this.flight!.sample(scrollState.y, W, H, f);
    const d = this.drawn;
    const changed = Math.abs(f.x - d.x) > 0.1 || Math.abs(f.y - d.y) > 0.1 || Math.abs(f.size - d.size) > 0.1 || Math.abs(f.ry - d.ry) > 1e-4;
    if (!moving && !this.dirty && !changed) return;
    this.dirty = false;
    d.x = f.x; d.y = f.y; d.size = f.size; d.ry = f.ry;
    const unit = (2 * HALF_H) / H; // world units per CSS px at z = 0
    const s = (f.size * unit) / this.base.w;
    // Gentle pointer follow (desktop), eased every drawn frame, and a slow float.
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const t = this.clock, loose = f.loose;
    // The anchor point is the box's centre, or for a standing anchor its top edge (the
    // helmet's bottom goes there); the group's origin is offset by the helmet's own box.
    const offY = this.base.cy + (this.base.minY - this.base.cy) * f.stand;
    const x = f.x - (this.base.cx * s) / unit, y = f.y + (offY * s) / unit;
    g.position.set((x - W / 2) * unit, (H / 2 - y) * unit + Math.sin(t * 0.9) * 0.03 * loose, 0);
    g.rotation.set(f.rx + pointer.y * 0.14 * loose, f.ry + (pointer.x * 0.2 + Math.sin(t * 0.6) * 0.03) * loose, f.rz);
    g.scale.setScalar(s);
    h.reveal.value = this.intro.value;
    h.update();

    const half = f.size * 0.75;
    const on = f.x + half > 0 && f.x - half < W && f.y + half > 0 && f.y - half < H;
    this.show(on);
    if (!on) return;
    const top = scrollY;
    this.dim(!!focus && focus.r > f.x - half && focus.l < f.x + half && focus.b - top > f.y - half && focus.t - top < f.y + half);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  show(on: boolean) {
    if (on === this.shown) return;
    this.shown = on;
    this.renderer.domElement.toggleAttribute('data-off', !on);
  }

  private dim(dim: boolean) {
    if (dim === this.dimmed) return;
    this.dimmed = dim;
    this.renderer.domElement.toggleAttribute('data-dim', dim);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.flight?.dispose();
    this.helmet?.dispose();
    this.env.dispose();
    this.renderer.dispose();
    // A context that is already lost can't be lost again (the browser warns).
    if (!this.renderer.getContext().isContextLost()) this.renderer.forceContextLoss();
  }
}
