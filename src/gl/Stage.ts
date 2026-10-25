import * as THREE from 'three';
import { whenIdle } from '@/lib/idle';
import { gsap } from '@/motion/gsap';
import { isMobile, isTouch } from '@/motion/prefs';
import { scrollState } from '@/motion/SmoothScroll';
import { createField } from './field';
import { createLap } from './lap/createLap';
import { FrameBudget } from './stage/FrameBudget';
import { configureRenderer, HelmetLayer } from './stage/HelmetLayer';
import { type Box, type Lens, type Pointer, trackFocus, trackPointer } from './stage/input';
import { bindSectionColours } from './stage/sectionColours';
import { lapMarks, lapState } from './state';

/**
 * Pixel ratio ceiling, and a drawing-buffer budget so big screens don't fill 8M+ pixels a frame.
 * Phones get a higher ceiling: their screens are small (about 0.4M CSS pixels), so even 2x stays
 * well inside the budget, and at 1.5x on a 3x screen the lines and the helmet edge go soft.
 */
const MAX_DPR = 1.5, MAX_DPR_PHONE = 2, MAX_PIXELS = 3.2e6;

/**
 * The page's WebGL, on two canvases:
 *   - behind the page: the contour background, or the lap scene alone while it is pinned;
 *   - above the page: the helmet (HelmetLayer).
 * They render only when something changes: scrolling, a tween, the pointer, or the
 * background's steady 30fps idle drift (the helmet holds still then, so its canvas keeps
 * its last frame). Everything stops while the tab is hidden or a dialog has locked scrolling.
 */
export class Stage {
  private renderer: THREE.WebGLRenderer;
  private helmet: HelmetLayer;
  private field = createField();
  /** The lap scene: built in idle time after start-up, or on first use if that comes sooner (a #timeline link). */
  private lapScene: ReturnType<typeof createLap> | null = null;
  private get lap() { return (this.lapScene ??= createLap()); }
  private pointer: Pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  /** The contour lens under the cursor (desktop only). */
  private lens: Lens = { x: 0.5, y: 0.5, on: 0, target: 0 };
  /** The keyboard-focused element's box in page px: the helmet steps back if it covers it. */
  private focus: Box | null = null;
  private cleanups: Array<() => void> = [];
  /** Tweens running on the stage's values (the helmet's reveal, the section colours). */
  private busy = 0;
  private lastRender = 0;
  /** The last ticker call, drawn or not: a frame right after a drawn one measures that frame. */
  private lastTick = 0;
  /** Animation clock that only advances while frames render, so drift resumes without a jump. */
  private clock = 0;
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
  private budget = new FrameBudget(() => this.resize(), () => this.goDark());
  private size = { w: 0, h: 0, scale: 0 };
  /** Touchscreens keep the contour background still while scrolling (no scroll parallax or stretch). */
  private still = isTouch();

  /** Called when WebGL goes away (a lost context, the helmet failing to build, frames far too slow). */
  onLost?: () => void;

  constructor(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    configureRenderer(this.renderer);
    const busy = { start: () => { this.busy++; }, end: () => { this.busy--; } };
    this.helmet = new HelmetLayer(overlay, busy);

    this.resize();
    const onResize = () => { this.resize(); this.kick(); };
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));
    if (!isTouch()) {
      this.cleanups.push(trackPointer(this.pointer, this.lens, () => { this.lastInput = performance.now(); }, () => this.kick()));
    }
    // The helmet must never hide a focus ring: it fades back while it covers the focused element.
    this.cleanups.push(trackFocus(box => { this.focus = box; this.kick(); }));

    // Without a context a canvas would stay blank over the hidden fallbacks: dropping
    // `gl-on` brings back the contour pattern and the Lap's flat circuit, and closes the
    // About sentence's helmet slot (GLCanvas.tsx).
    const onLost = (e: Event) => { e.preventDefault(); this.goDark(); };
    for (const c of [canvas, overlay]) {
      c.addEventListener('webglcontextlost', onLost);
      this.cleanups.push(() => c.removeEventListener('webglcontextlost', onLost));
    }

    this.cleanups.push(bindSectionColours(this.field.uniforms, busy, () => this.kick()));
    const tick = () => this.frame();
    gsap.ticker.add(tick);
    this.cleanups.push(() => gsap.ticker.remove(tick));
    // The lap is only drawn once the visitor reaches the Timeline: keep building it out of
    // this start-up task (curve sampling, ribbons, the run-off layout and atlas).
    whenIdle(() => { if (!this.dead) this.lapScene ??= createLap(); }, 2000, 500);

    this.lastInput = performance.now();
    // goDark, not just onLost: the page falls back, and the render loop stops drawing to a hidden canvas.
    void this.helmet.load().then(() => this.warmUpLap(), err => { console.warn('[gl] helmet failed', err); this.goDark(); });
  }

  /** WebGL is out for this visit: free everything (contexts, listeners, triggers), then fall back. */
  private goDark() {
    if (this.dead) return;
    this.dispose();
    this.onLost?.();
  }

  /** Ask for renders for a short while (after resizes, tweens starting, etc.). */
  private kick(ms = 600) { this.lastInput = Math.max(this.lastInput, performance.now() + ms - 1500); this.helmet.dirty = true; }

  private resize() {
    // The canvas's own size (100lvh), not the window's: on phones innerHeight changes as the
    // address bar slides, and sizing to it stretched the whole scene for a moment.
    const c = this.renderer.domElement;
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    if (w === this.size.w && h === this.size.h && this.size.scale === this.budget.scale) return;
    this.size = { w, h, scale: this.budget.scale };
    const dpr = Math.min(devicePixelRatio, isMobile() ? MAX_DPR_PHONE : MAX_DPR, Math.sqrt(MAX_PIXELS / (w * h)));
    // Adaptive scaling never takes the canvas below 1x CSS pixels (unless the budget already does).
    const pr = Math.max(Math.min(1, dpr), dpr * this.budget.scale);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.helmet.resize(pr, w, h);
    this.field.uniforms.uRes.value.set(w, h);
  }

  /**
   * Warm up what first appears mid-scroll (the lap's car and run-off logos) in idle time,
   * so their shader compiles and texture uploads don't land on a scrolling frame.
   */
  private warmUpLap() {
    whenIdle(() => {
      if (this.dead) return;
      void this.renderer.compileAsync(this.lap.scene, this.lap.camera)
        .catch(() => {}).finally(() => { if (!this.dead) this.warmLap = true; });
    }, 3000, 1000);
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
    if (prevTick === this.lastRender && this.budget.overBudget(now - this.lastRender)) return;
    if (moving) this.budget.adapt(now - this.lastRender);
    const dt = Math.min(now - this.lastRender, 50) / 1000;
    this.clock += dt;
    if (moving) this.helmet.advance(dt);
    this.lastRender = now;

    this.updateField();
    const r = this.renderer;
    r.clear();
    if (lapState.active) {
      const { scene, camera } = this.lap;
      this.lapP = lapState.progress; // scrubbed to the pin by the Lap section
      this.lapV = lapState.veil;
      this.lapMore = this.lap.update(this.lapP, this.size.w, this.size.h, this.lapV, lapState.stage);
      lapMarks.sink?.(); // the DOM sector marks follow in this same frame
      r.render(scene, camera);
      this.warmLap = false;
      this.helmet.show(false); // away while the lap has the canvas
      return;
    }
    // Once, after the idle warm-up: the lap drawn under this frame's background, so its
    // first real frame (mid-scroll, as the section arrives) doesn't stall on GPU setup.
    if (this.warmLap) { this.warmLap = false; this.lap.warm(r, this.size.w, this.size.h); r.clear(); }
    r.render(this.field.scene, this.field.camera);
    if (this.helmet.ready) this.helmet.draw(moving, this.size.w, this.size.h, this.pointer, this.focus);
  }

  /** The contour field's time, scroll, and the lens that follows the pointer a little behind (like the cursor ring). */
  private updateField() {
    const u = this.field.uniforms, L = this.lens;
    u.uTime.value = this.clock;
    L.x += ((this.pointer.tx * 0.5 + 0.5) - L.x) * 0.25;
    L.y += ((0.5 - this.pointer.ty * 0.5) - L.y) * 0.25;
    L.on += (L.target - L.on) * 0.08;
    u.uPointer.value.set(L.x, L.y);
    u.uLens.value = L.on;
    if (!this.still) {
      u.uScroll.value = scrollState.progress;
      u.uVel.value += (scrollState.velocity - u.uVel.value) * 0.15;
    }
  }

  /** Safe to call twice: going dark disposes, and so does unmounting (GLCanvas). */
  dispose() {
    if (this.disposed) return;
    this.disposed = this.dead = true;
    this.cleanups.splice(0).reverse().forEach(f => f());
    this.helmet.dispose();
    this.field.dispose();
    this.lapScene?.dispose();
    this.renderer.dispose();
  }
}
