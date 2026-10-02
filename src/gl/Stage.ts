import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { onIntroDone } from '@/motion/intro';
import { loaded } from '@/motion/loading';
import { isMobile, isTouch } from '@/motion/prefs';
import { scrollState } from '@/motion/SmoothScroll';
import { EASE } from '@/motion/tokens';
import { createField } from './field';
import { bindHelmetPath, perch, type Pose } from './helmetPath';
import { buildHelmet, type Helmet } from './helmet/buildHelmet';
import { createLap } from './lap';
import { lapState } from './state';

const FOV = 30, CAM_Z = 8;
/**
 * Pixel ratio ceiling, and a drawing-buffer budget so big screens don't fill 8M+ pixels a frame.
 * Phones get a higher ceiling: their screens are small (about 0.4M CSS pixels), so even 2x stays
 * well inside the budget, and at 1.5x on a 3x screen the lines and the helmet edge go soft.
 */
const MAX_DPR = 1.5, MAX_DPR_PHONE = 2, MAX_PIXELS = 3.2e6, MIN_SCALE = 0.55;

/**
 * The single WebGL renderer for the page. Draw order per frame:
 *   1. contour background  2. helmet  (or the lap scene while it is pinned)
 * It renders only when something changes: scrolling, a tween, the pointer, or
 * a steady 30fps idle drift. It stops entirely
 * when the tab is hidden or a dialog has locked scrolling.
 */
export class Stage {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private scene = new THREE.Scene();
  private field = createField();
  private lap = createLap();
  private helmet: Helmet | null = null;
  /** The helmet's size at scale 1, in world units (for perching it on a DOM element). */
  private base = { w: 1, cx: 0, minY: 0 };
  private pose: Pose = { x: 0.5, y: 0, s: 1, rx: 0, ry: -0.65, rz: 0 };
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private cleanups: Array<() => void> = [];
  private busy = 0;
  private lastRender = 0;
  /** Animation clock that only advances while frames render, so drift resumes without a jump. */
  private clock = 0;
  /** The helmet's float clock: only advances while something moves, so it holds still when idle. */
  private helmetClock = 0;
  private lastInput = 0;
  private dead = false;
  /** Eased copy of the lap progress, so the camera glides instead of stepping. */
  private lapP = 0;
  private lapV = 1;
  /** Adaptive resolution: drops when frames miss vsync while moving, recovers slowly. */
  private quality = { scale: 1, vsync: 1000 / 60, slow: 0, fast: 0, cooldown: 0 };
  private size = { w: 0, h: 0, scale: 0 };
  /** Touchscreens keep the contour background still while scrolling (no scroll parallax or stretch). */
  private still = isTouch();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.autoClear = false;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = env;
    pmrem.dispose();
    this.cleanups.push(() => env.dispose());

    // No scene lights: the helmet is lit only by the room environment map
    // (image-based reflections), which keeps shading cheap.
    this.camera.position.set(0, 0, CAM_Z);

    this.resize();
    const onResize = () => { this.resize(); this.kick(); };
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));

    if (!isTouch()) {
      const onMove = (e: PointerEvent) => {
        this.pointer.tx = (e.clientX / innerWidth) * 2 - 1;
        this.pointer.ty = (e.clientY / innerHeight) * 2 - 1;
        this.lastInput = performance.now();
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      this.cleanups.push(() => window.removeEventListener('pointermove', onMove));
    }

    const onLost = (e: Event) => { e.preventDefault(); this.dead = true; };
    canvas.addEventListener('webglcontextlost', onLost);
    this.cleanups.push(() => canvas.removeEventListener('webglcontextlost', onLost));

    this.bindSectionColours();
    const tick = () => this.frame();
    gsap.ticker.add(tick);
    this.cleanups.push(() => gsap.ticker.remove(tick));

    this.lastInput = performance.now();
    // The loader counts the helmet in once it is built and compiled (or failed).
    void this.loadHelmet().finally(() => loaded('helmet'));
    if (import.meta.env.DEV) (window as unknown as { __stage: Stage }).__stage = this;
  }

  /** Ask for renders for a short while (after resizes, tweens starting, etc.). */
  private kick(ms = 600) { this.lastInput = Math.max(this.lastInput, performance.now() + ms - 1500); }

  private resize() {
    // The canvas's own size (100lvh), not the window's: on phones innerHeight changes as the
    // address bar slides, and sizing to it stretched the whole scene for a moment.
    const c = this.renderer.domElement;
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    if (w === this.size.w && h === this.size.h && this.size.scale === this.quality.scale) return;
    this.size = { w, h, scale: this.quality.scale };
    const dpr = Math.min(devicePixelRatio, isMobile() ? MAX_DPR_PHONE : MAX_DPR, Math.sqrt(MAX_PIXELS / (w * h)));
    // Adaptive scaling never takes the canvas below 1x CSS pixels (unless the budget already does).
    this.renderer.setPixelRatio(Math.max(Math.min(1, dpr), dpr * this.quality.scale));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.field.uniforms.uRes.value.set(w, h);
  }

  private async loadHelmet() {
    const helmet = await buildHelmet({ anisotropy: Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) });
    if (this.dead) { helmet.dispose(); return; }
    this.helmet = helmet;
    this.scene.add(helmet.group);
    const box = new THREE.Box3().setFromObject(helmet.group), dims = box.getSize(new THREE.Vector3());
    this.base = { w: dims.x || 1, cx: (box.min.x + box.max.x) / 2, minY: box.min.y };
    this.cleanups.push(bindHelmetPath(this.pose), () => helmet.dispose());
    // Compile shaders before the reveal so the first frames don't stutter.
    this.renderer.compile(this.scene, this.camera);
    onIntroDone(() => this.playReveal());
  }

  /** Wireframe draws itself, the painted shell dissolves in, the wireframe fades. */
  private playReveal() {
    const h = this.helmet!;
    this.busy++;
    gsap.timeline({ onComplete: () => { this.busy--; } })
      .fromTo(h.wire, { draw: 0 }, { draw: 1, duration: 1.3, ease: EASE.wipe })
      .fromTo(h.reveal, { value: 0 }, { value: 1.05, duration: 1.6, ease: 'power2.inOut' }, 0.7)
      .to(h.wire, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 1.8);
  }

  private bindSectionColours() {
    const u = this.field.uniforms;
    const light = new THREE.Color('#f4f4ed'), dark = new THREE.Color('#141416');
    const to = (a: string, b: string) => {
      const A = new THREE.Color(a), B = new THREE.Color(b);
      const isLight = A.r + A.g + A.b > 1.5;
      this.busy++;
      const L = isLight ? dark : light;
      gsap.timeline({ onComplete: () => { this.busy--; } })
        .to(u.uColA.value, { r: A.r, g: A.g, b: A.b, duration: 0.9, ease: EASE.wipe }, 0)
        .to(u.uColB.value, { r: B.r, g: B.g, b: B.b, duration: 0.9, ease: EASE.wipe }, 0)
        .to(u.uLine.value, { r: L.r, g: L.g, b: L.b, duration: 0.9, ease: EASE.wipe }, 0)
        .to(u.uLineAlpha, { value: isLight ? 0.13 : 0.09, duration: 0.9 }, 0);
    };
    document.querySelectorAll<HTMLElement>('[data-bg]').forEach(sec => {
      const [a, b] = sec.dataset.bg!.split(',');
      const st = ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1,
        onEnter: () => to(a, b), onEnterBack: () => to(a, b),
      });
      this.cleanups.push(() => st.kill());
    });
  }

  private frame() {
    if (this.dead || document.hidden || scrollState.locked) return;
    const now = performance.now();
    const lapEasing = lapState.active && (lapState.progress !== this.lapP || lapState.veil !== this.lapV);
    const moving = Math.abs(scrollState.velocity) > 0.01 || this.busy > 0 || lapEasing || now - this.lastInput < 1500;
    // Idle: the contour lines keep a steady 30fps drift; the helmet holds still until
    // something moves. The lap scene has no drift, so it draws nothing while idle.
    if (!moving && (lapState.active || now - this.lastRender < 33)) return;
    if (moving) this.adapt(now - this.lastRender);
    const dt = Math.min(now - this.lastRender, 50) / 1000;
    this.clock += dt;
    if (moving) this.helmetClock += dt;
    this.lastRender = now;

    const r = this.renderer, t = this.clock;
    const u = this.field.uniforms;
    u.uTime.value = t;
    if (!this.still) {
      u.uScroll.value = scrollState.progress;
      u.uVel.value += (scrollState.velocity - u.uVel.value) * 0.15;
    }

    r.clear();
    if (lapState.active) {
      const { scene, camera, update } = this.lap;
      this.lapP = lapState.progress; // scrubbed to the pin by the Lap section
      this.lapV = lapState.veil;
      update(this.lapP, this.size.w, this.size.h, this.lapV);
      r.render(scene, camera);
      return;
    }
    r.render(this.field.scene, this.camera);
    if (this.helmet) {
      this.applyPose(this.helmetClock);
      r.clearDepth();
      r.render(this.scene, this.camera);
    }
  }

  /**
   * Watch frame intervals while rendering continuously. Sustained misses
   * (mostly GPU fill on large or weak screens) lower the render scale; a long
   * run of on-time frames raises it again. The page itself keeps scrolling at
   * full rate; only the canvas resolution changes.
   */
  private adapt(delta: number) {
    const q = this.quality;
    if (delta <= 0 || delta > 100) return; // first frame after idle, or a tab switch
    q.vsync = Math.min(q.vsync * 1.002, Math.max(delta, 1000 / 240)); // tracks the display refresh
    if (q.cooldown > 0) { q.cooldown--; return; }
    // Slow means a real drop (under ~45fps), not 60fps on a 120Hz phone, where the
    // browser often halves the frame rate while scrolling.
    if (delta > Math.max(q.vsync * 1.5, 1000 / 45)) { q.slow++; q.fast = 0; } else { q.fast++; q.slow = Math.max(0, q.slow - 0.25); }
    if (q.slow >= 8 && q.scale > MIN_SCALE) {
      q.scale = Math.max(MIN_SCALE, q.scale - 0.15);
      this.resize();
      q.slow = q.fast = 0; q.cooldown = 30;
    } else if (q.fast >= 600 && q.scale < 1) {
      q.scale = Math.min(1, q.scale + 0.1);
      this.resize();
      q.slow = q.fast = 0; q.cooldown = 30;
    }
  }

  private applyPose(t: number) {
    const h = this.helmet!, p = this.pose, g = h.group;
    const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    const halfW = halfH * this.camera.aspect;
    // Gentle pointer follow (desktop), eased every frame.
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.06;
    const fit = Math.min(1.25, halfH / 2.14);
    let { x, y, s, rx, ry, rz } = p;
    // Perched: sit on the element's top edge, about its width, facing the page.
    const k = perch.el ? perch.k : 0;
    if (k > 0.001) {
      const r = perch.el!.getBoundingClientRect(), W = this.size.w, H = this.size.h;
      // Scale so the helmet is about the step's width, then place its measured bottom
      // edge on the step's top edge and its centre over the step's centre.
      const as = ((r.width * 0.95) / W) * 2 * halfW / (this.base.w * fit), world = as * fit;
      const at = {
        x: (((r.left + r.width / 2) / W) * 2 - 1 - (this.base.cx * world) / halfW),
        y: (1 - (r.top / H) * 2) - (this.base.minY * world) / halfH,
        s: as,
        rx: 0.12, ry: -7.55, rz: 0,
      };
      const mix = (a: number, b: number) => a + (b - a) * k;
      x = mix(x, at.x); y = mix(y, at.y); s = mix(s, at.s); rx = mix(rx, at.rx); ry = mix(ry, at.ry); rz = mix(rz, at.rz);
    }
    const loose = 1 - k; // no float or pointer follow while it sits on the step
    g.position.set(x * halfW, y * halfH + Math.sin(t * 0.9) * 0.03 * loose, 0);
    g.rotation.set(rx + this.pointer.y * 0.14 * loose, ry + (this.pointer.x * 0.2 + Math.sin(t * 0.6) * 0.03) * loose, rz);
    g.scale.setScalar(s * fit);
    g.visible = y > -1.6;
    h.update();
  }

  dispose() {
    this.dead = true;
    this.cleanups.splice(0).reverse().forEach(f => f());
    this.field.dispose();
    this.lap.dispose();
    this.renderer.dispose();
  }
}
