import * as THREE from 'three';
import { whenIdle } from '@/lib/idle';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { onIntroDone } from '@/motion/intro';
import { isMobile, isTouch } from '@/motion/prefs';
import { scrollState } from '@/motion/SmoothScroll';
import { EASE } from '@/motion/tokens';
import { createField } from './field';
import { bindFlight, type Flight } from './flight/flight';
import { garageScene } from './garage';
import { buildHelmet, type Helmet } from './helmet/buildHelmet';
import { createLap } from './lap';
import { lapMarks, lapState } from './state';

const FOV = 30, CAM_Z = 8;
/**
 * Pixel ratio ceiling, and a drawing-buffer budget so big screens don't fill 8M+ pixels a frame.
 * Phones get a higher ceiling: their screens are small (about 0.4M CSS pixels), so even 2x stays
 * well inside the budget, and at 1.5x on a 3x screen the lines and the helmet edge go soft.
 */
const MAX_DPR = 1.5, MAX_DPR_PHONE = 2, MAX_PIXELS = 3.2e6, MIN_SCALE = 0.55;
/** A frame this long (ms) is far over budget: the page can't keep up with the scenes at all. */
const OVER_BUDGET = 50;
/** World units per CSS pixel at the helmet's depth (z = 0), per pixel of viewport height. */
const HALF_H = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;

/**
 * The page's WebGL, on two canvases:
 *   - behind the page: the contour background, or the lap scene alone while it is pinned;
 *   - above the page (see-through, click-through): the helmet, so it can fly in front of
 *     the text and land in layout boxes (flight/flight.ts), as on landonorris.com.
 * They render only when something changes: scrolling, a tween, the pointer, or the
 * background's steady 30fps idle drift (the helmet holds still then, so its canvas keeps
 * its last frame). Everything stops while the tab is hidden or a dialog has locked
 * scrolling, and the helmet's canvas is hidden while the helmet is off screen.
 */
export class Stage {
  private renderer: THREE.WebGLRenderer;
  /** The helmet's own renderer, on the see-through canvas above the page. */
  private hr: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private scene = new THREE.Scene();
  private field = createField();
  private lap = createLap();
  private helmet: Helmet | null = null;
  private flight: ReturnType<typeof bindFlight> | null = null;
  private at: Flight = { x: 0, y: 0, size: 1, stand: 0, rx: 0, ry: 0, rz: 0, loose: 1 };
  /** The intro's reveal (0..1.05), handed to the shell's dissolve on every drawn frame. */
  private intro = { value: 0 };
  /** The helmet's box at scale 1 and rotation 0, in world units (for fitting it to a layout box). */
  private base = { w: 1, cx: 0, cy: 0, minY: 0 };
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  /** The contour lens under the cursor: a quicker copy of the pointer, and its strength (desktop only). */
  private lens = { x: 0.5, y: 0.5, on: 0, target: 0 };
  /** The keyboard-focused element's box in page px: the helmet steps back if it covers it. */
  private focus: { l: number; t: number; r: number; b: number } | null = null;
  private overlay = { shown: true, dim: false };
  /** The helmet changed without anything moving (its reveal ended, a resize): draw it on the next frame. */
  private helmetDirty = true;
  /** The flight as last drawn: idle frames redraw only if it changed (a jump, the podium building). */
  private drawn = { x: Infinity, y: Infinity, size: Infinity, ry: Infinity };
  private cleanups: Array<() => void> = [];
  private busy = 0;
  private lastRender = 0;
  /** The last ticker call, drawn or not: a frame right after a drawn one measures that frame. */
  private lastTick = 0;
  /** Animation clock that only advances while frames render, so drift resumes without a jump. */
  private clock = 0;
  /** The helmet's float clock: only advances while something moves, so it holds still when idle. */
  private helmetClock = 0;
  private lastInput = 0;
  private dead = false;
  private disposed = false;
  /** The lap progress and veil last drawn, to tell when the lap needs a new frame. */
  private lapP = 0;
  private lapV = 1;
  /** The lap asked for another frame (its car's rain light is still settling). */
  private lapMore = false;
  /** Draw the lap once, unseen, on the next background frame (see frame()). */
  private warmLap = false;
  /** Adaptive resolution: drops when frames miss vsync while moving, recovers slowly. */
  private quality = { scale: 1, vsync: 1000 / 60, slow: 0, fast: 0, cooldown: 0, over: 0 };
  private size = { w: 0, h: 0, scale: 0 };
  /** Touchscreens keep the contour background still while scrolling (no scroll parallax or stretch). */
  private still = isTouch();

  constructor(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.hr = new THREE.WebGLRenderer({ canvas: overlay, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    for (const r of [this.renderer, this.hr]) {
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.NeutralToneMapping;
      r.toneMappingExposure = 1.0;
      r.autoClear = false;
    }
    this.hr.setClearColor(0x000000, 0);

    // No scene lights: the helmet is lit only by the baked garage map (image-based
    // reflections), which keeps shading cheap. Baked on the helmet's own renderer.
    const pmrem = new THREE.PMREMGenerator(this.hr);
    const garage = garageScene();
    const env = pmrem.fromScene(garage.scene, 0.02).texture;
    this.scene.environment = env;
    garage.dispose();
    pmrem.dispose();
    this.cleanups.push(() => env.dispose());
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
        if (this.lens.target === 0) { this.lens.x = e.clientX / innerWidth; this.lens.y = 1 - e.clientY / innerHeight; }
        this.lens.target = 1;
      };
      const onLeave = (e: PointerEvent) => { if (!e.relatedTarget) { this.lens.target = 0; this.kick(); } };
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerout', onLeave, { passive: true });
      this.cleanups.push(() => { window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerout', onLeave); });
    }

    // The helmet must never hide a focus ring: it fades back while it covers the focused element.
    const onFocus = (e: FocusEvent) => {
      const el = e.target instanceof HTMLElement && e.target.matches(':focus-visible') ? e.target : null;
      const r = el?.getBoundingClientRect();
      this.focus = r ? { l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY } : null;
      this.kick();
    };
    const onBlur = () => { this.focus = null; this.kick(); };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    this.cleanups.push(() => { document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onBlur); });

    // Without a context a canvas would stay blank over the hidden fallbacks: dropping
    // `gl-on` brings back the contour pattern and the Lap's flat circuit, and closes the
    // About sentence's helmet slot (GLCanvas.tsx).
    const onLost = (e: Event) => { e.preventDefault(); this.goDark(); };
    for (const c of [canvas, overlay]) {
      c.addEventListener('webglcontextlost', onLost);
      this.cleanups.push(() => c.removeEventListener('webglcontextlost', onLost));
    }

    this.bindSectionColours();
    const tick = () => this.frame();
    gsap.ticker.add(tick);
    this.cleanups.push(() => gsap.ticker.remove(tick));

    this.lastInput = performance.now();
    // goDark, not just onLost: the page falls back, and the render loop stops drawing to a hidden canvas.
    void this.loadHelmet().catch(err => { console.warn('[gl] helmet failed', err); this.goDark(); });
    if (import.meta.env.DEV) Object.assign(window, { __stage: this });
  }

  /** Called when WebGL goes away (a lost context, the helmet failing to build, frames far too slow). */
  onLost?: () => void;

  /** WebGL is out for this visit: free everything (contexts, listeners, triggers), then fall back. */
  private goDark() {
    if (this.dead) return;
    this.dispose();
    this.onLost?.();
  }

  /** Ask for renders for a short while (after resizes, tweens starting, etc.). */
  private kick(ms = 600) { this.lastInput = Math.max(this.lastInput, performance.now() + ms - 1500); this.helmetDirty = true; }

  private resize() {
    // The canvas's own size (100lvh), not the window's: on phones innerHeight changes as the
    // address bar slides, and sizing to it stretched the whole scene for a moment.
    const c = this.renderer.domElement;
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    if (w === this.size.w && h === this.size.h && this.size.scale === this.quality.scale) return;
    this.size = { w, h, scale: this.quality.scale };
    const dpr = Math.min(devicePixelRatio, isMobile() ? MAX_DPR_PHONE : MAX_DPR, Math.sqrt(MAX_PIXELS / (w * h)));
    // Adaptive scaling never takes the canvas below 1x CSS pixels (unless the budget already does).
    const pr = Math.max(Math.min(1, dpr), dpr * this.quality.scale);
    for (const r of [this.renderer, this.hr]) { r.setPixelRatio(pr); r.setSize(w, h, false); }
    this.helmetDirty = true; // resizing cleared its canvas
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.field.uniforms.uRes.value.set(w, h);
  }

  private async loadHelmet() {
    const helmet = await buildHelmet({ anisotropy: Math.min(8, this.hr.capabilities.getMaxAnisotropy()) });
    if (this.dead) { helmet.dispose(); return; }
    this.helmet = helmet;
    this.scene.add(helmet.group);
    const box = new THREE.Box3().setFromObject(helmet.group), dims = box.getSize(new THREE.Vector3());
    this.base = { w: dims.x || 1, cx: (box.min.x + box.max.x) / 2, cy: (box.min.y + box.max.y) / 2, minY: box.min.y };
    const flight = bindFlight();
    this.flight = flight;
    this.cleanups.push(() => flight.dispose(), () => helmet.dispose());
    // Compile shaders before the reveal so the first frames don't stutter.
    this.hr.compile(this.scene, this.camera);
    onIntroDone(() => { if (!this.dead) this.playReveal(); });
    // Warm up what first appears mid-scroll (the lap's car and run-off logos) in idle time,
    // so their shader compiles and texture uploads don't land on a scrolling frame.
    whenIdle(() => {
      if (this.dead) return;
      void this.renderer.compileAsync(this.lap.scene, this.lap.camera)
        .catch(() => {}).finally(() => { if (!this.dead) this.warmLap = true; });
    }, 3000, 1000);
  }

  /** Wireframe draws itself, the painted shell dissolves in, the wireframe fades. */
  private playReveal() {
    const h = this.helmet!;
    this.busy++;
    // Ends dirty: a reveal that finished in one tick (a background tab) still gets drawn.
    gsap.timeline({ onComplete: () => { this.busy--; this.helmetDirty = true; } })
      .fromTo(h.wire, { draw: 0 }, { draw: 1, duration: 1.3, ease: EASE.wipe })
      .fromTo(this.intro, { value: 0 }, { value: 1.05, duration: 1.6, ease: 'power2.inOut' }, 0.7)
      .to(h.wire, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 1.8);
  }

  private bindSectionColours() {
    const u = this.field.uniforms;
    const to = (a: string, b: string) => {
      const A = new THREE.Color(a), B = new THREE.Color(b);
    // Every section's ground is dark, so the lines keep their colour: only the two ground colours move.
      this.busy++;
      gsap.timeline({ onComplete: () => { this.busy--; } })
        .to(u.uColA.value, { r: A.r, g: A.g, b: A.b, duration: 0.9, ease: EASE.wipe }, 0)
        .to(u.uColB.value, { r: B.r, g: B.g, b: B.b, duration: 0.9, ease: EASE.wipe }, 0);
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
    const now = performance.now(), prevTick = this.lastTick;
    this.lastTick = now;
    if (this.dead || document.hidden || scrollState.locked) return;
    const lapEasing = lapState.active && (this.lapMore || lapState.progress !== this.lapP || lapState.veil !== this.lapV);
    const moving = Math.abs(scrollState.velocity) > 0.01 || this.busy > 0 || lapEasing || now - this.lastInput < 1500;
    // Idle: the contour lines keep a steady 30fps drift; the helmet holds still until
    // something moves. The lap scene has no drift, so it draws nothing while idle.
    if (!moving && (lapState.active || now - this.lastRender < 33)) return;
    // Back to back with the last drawn frame, so the gap is what that frame cost.
    if (prevTick === this.lastRender && this.overBudget(now - this.lastRender)) return;
    if (moving) this.adapt(now - this.lastRender);
    const dt = Math.min(now - this.lastRender, 50) / 1000;
    this.clock += dt;
    if (moving) this.helmetClock += dt;
    this.lastRender = now;

    const r = this.renderer, t = this.clock;
    const u = this.field.uniforms;
    u.uTime.value = t;
    // Lens: follows the pointer a little behind (like the cursor ring), fades in and out.
    const L = this.lens;
    L.x += ((this.pointer.tx * 0.5 + 0.5) - L.x) * 0.25;
    L.y += ((0.5 - this.pointer.ty * 0.5) - L.y) * 0.25;
    L.on += (L.target - L.on) * 0.08;
    u.uPointer.value.set(L.x, L.y);
    u.uLens.value = L.on;
    if (!this.still) {
      u.uScroll.value = scrollState.progress;
      u.uVel.value += (scrollState.velocity - u.uVel.value) * 0.15;
    }

    r.clear();
    if (lapState.active) {
      const { scene, camera } = this.lap;
      this.lapP = lapState.progress; // scrubbed to the pin by the Lap section
      this.lapV = lapState.veil;
      this.lapMore = this.lap.update(this.lapP, this.size.w, this.size.h, this.lapV, lapState.stage);
      lapMarks.sink?.(); // the DOM sector marks follow in this same frame
      r.render(scene, camera);
      this.warmLap = false;
      this.showHelmet(false); // away while the lap has the canvas
      return;
    }
    // Once, after the idle warm-up: the lap drawn under this frame's background, so its
    // first real frame (mid-scroll, as the section arrives) doesn't stall on GPU setup.
    if (this.warmLap) { this.warmLap = false; this.lap.warm(r, this.size.w, this.size.h); r.clear(); }
    r.render(this.field.scene, this.camera);
    if (this.helmet) this.drawHelmet(moving);
  }

  /**
   * Place the helmet on its flight and draw it on its own canvas, or hide that canvas while
   * it is off screen. While nothing moves, it redraws only if the flight changed: an instant
   * jump (a deep link, a rail drag) or the layout moving under it.
   */
  private drawHelmet(moving: boolean) {
    const h = this.helmet!, g = h.group, f = this.at, { w: W, h: H } = this.size;
    this.flight!.sample(scrollState.y, W, H, f);
    const d = this.drawn;
    const changed = Math.abs(f.x - d.x) > 0.1 || Math.abs(f.y - d.y) > 0.1 || Math.abs(f.size - d.size) > 0.1 || Math.abs(f.ry - d.ry) > 1e-4;
    if (!moving && !this.helmetDirty && !changed) return;
    this.helmetDirty = false;
    d.x = f.x; d.y = f.y; d.size = f.size; d.ry = f.ry;
    const unit = (2 * HALF_H) / H; // world units per CSS px at z = 0
    const s = (f.size * unit) / this.base.w;
    // Gentle pointer follow (desktop), eased every drawn frame, and a slow float.
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.06;
    const t = this.helmetClock, loose = f.loose;
    // The anchor point is the box's centre, or for a standing anchor its top edge (the
    // helmet's bottom goes there); the group's origin is offset by the helmet's own box.
    const offY = this.base.cy + (this.base.minY - this.base.cy) * f.stand;
    const x = f.x - (this.base.cx * s) / unit, y = f.y + (offY * s) / unit;
    g.position.set((x - W / 2) * unit, (H / 2 - y) * unit + Math.sin(t * 0.9) * 0.03 * loose, 0);
    g.rotation.set(f.rx + this.pointer.y * 0.14 * loose, f.ry + (this.pointer.x * 0.2 + Math.sin(t * 0.6) * 0.03) * loose, f.rz);
    g.scale.setScalar(s);
    h.reveal.value = this.intro.value;
    h.update();

    // On screen at all?
    const half = f.size * 0.75;
    const on = f.x + half > 0 && f.x - half < W && f.y + half > 0 && f.y - half < H;
    this.showHelmet(on);
    if (!on) return;
    const fb = this.focus, top = scrollY;
    this.dimHelmet(!!fb && fb.r > f.x - half && fb.l < f.x + half && fb.b - top > f.y - half && fb.t - top < f.y + half);
    this.hr.clear();
    this.hr.render(this.scene, this.camera);
  }

  private showHelmet(on: boolean) {
    if (on === this.overlay.shown) return;
    this.overlay.shown = on;
    this.hr.domElement.toggleAttribute('data-off', !on);
  }

  private dimHelmet(dim: boolean) {
    if (dim === this.overlay.dim) return;
    this.overlay.dim = dim;
    this.hr.domElement.toggleAttribute('data-dim', dim);
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

  /**
   * The backup to the software-renderer check in prefs.ts: frames far over budget, moving
   * or idle, first take the render scale straight to its floor; if they stay that slow
   * there, WebGL is as good as drawn on the CPU, and it is turned off like a lost context
   * (the page falls back to the contour pattern and the flat circuit). Single long frames
   * (a shader compile, a texture upload) are paid back by the quick ones around them.
   */
  private overBudget(delta: number) {
    const q = this.quality;
    if (delta > 1000) return false; // a stall or a tab switch, not a frame
    if (delta <= OVER_BUDGET) { q.over = Math.max(0, q.over - 1); return false; }
    if (++q.over < 8) return false;
    q.over = 0;
    if (q.scale > MIN_SCALE) {
      q.scale = MIN_SCALE;
      this.resize();
      return false;
    }
    this.goDark();
    return true;
  }

  /** Safe to call twice: going dark disposes, and so does unmounting (GLCanvas). */
  dispose() {
    if (this.disposed) return;
    this.disposed = this.dead = true;
    this.cleanups.splice(0).reverse().forEach(f => f());
    this.field.dispose();
    this.lap.dispose();
    this.renderer.dispose();
    this.hr.dispose();
    // A context that is already lost can't be lost again (the browser warns).
    if (!this.hr.getContext().isContextLost()) this.hr.forceContextLoss();
  }
}
