import { gsap } from '@/motion/gsap';
import { loadingNow, loadProgress } from '@/motion/loading';
import { EASE } from '@/motion/tokens';

export const LIGHTS = 5;
const MIN_FILL = 1.4; // seconds: the lights never fill faster than this, however quick the load
const MAX_WAIT = 2; // seconds of lights before the start goes ahead without whatever is still loading

export type StartTimelines = { enter: gsap.core.Timeline; lights: gsap.core.Timeline[]; exit: gsap.core.Timeline };

/**
 * The start sequence's timelines, all paused: the gantry lowering in, one per light, and
 * lights out after a random `hold`: the frame clears, a red line draws across the middle and
 * the screen splits open on it (`onSplit` as it starts, `onDone` at the end).
 */
export function startTimelines(root: HTMLElement, hold: number, onSplit: () => void, onDone: () => void): StartTimelines {
  const q = (s: string) => root.querySelectorAll<HTMLElement>(s);
  const enter = gsap.timeline({ paused: true })
    .from(q('[data-ibeam]'), { scaleX: 0, duration: 0.6, ease: EASE.wipe })
    .from(q('[data-ipod]'), { yPercent: -60, autoAlpha: 0, duration: 0.55, stagger: 0.05, ease: EASE.out }, 0.1)
    .from(q('[data-iframe]'), { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06, ease: EASE.out }, 0.15);

  const lights = [...q('[data-ipod]')].map((pod, i) => gsap.timeline({ paused: true })
    .to(pod.querySelector('[data-light]'), { opacity: 1, duration: 0.06, ease: 'none' })
    .fromTo(pod.querySelector('[data-halo]'), { opacity: 0, scale: 0.6 }, { opacity: 0.75, scale: 1, duration: 0.35, ease: EASE.out }, 0)
    .to(q('[data-iglow]'), { opacity: (i + 1) / LIGHTS, duration: 0.3, ease: EASE.out }, 0));

  const exit = gsap.timeline({ paused: true })
    .addLabel('out', hold)
    .to(q('[data-light], [data-halo]'), { opacity: 0, duration: 0.05, ease: 'none' }, 'out')
    .to(q('[data-iglow]'), { opacity: 0, duration: 0.25 }, 'out')
    .to(q('[data-istatus]'), { yPercent: -50, duration: 0.45, ease: EASE.out }, 'out')
    .to(q('[data-icontent]'), { autoAlpha: 0, scale: 0.97, duration: 0.35, ease: EASE.out }, 'out+=0.45')
    .fromTo(q('[data-iline]'), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: EASE.wipe }, 'out+=0.5')
    .addLabel('split', 'out+=0.85')
    .add(onSplit, 'split')
    .to(q('[data-ihalf="top"]'), { yPercent: -100, duration: 0.9, ease: EASE.wipe }, 'split')
    .to(q('[data-ihalf="bottom"]'), { yPercent: 100, duration: 0.9, ease: EASE.wipe }, 'split')
    .to(q('[data-iline]'), { autoAlpha: 0, scaleY: 6, duration: 0.5, ease: EASE.out }, 'split')
    .add(onDone);
  return { enter, lights, exit };
}

/** Any click, key or scroll: `onInput` once. Returns a stop. */
export function onFirstInput(onInput: () => void) {
  const evts = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  const stop = () => evts.forEach(e => window.removeEventListener(e, fire));
  const fire = () => { stop(); onInput(); };
  evts.forEach(e => window.addEventListener(e, fire, { passive: true }));
  return stop;
}

/**
 * The ticker step that plays the sequence: the gantry, then one light per fifth of the real
 * load (fonts and page assets, motion/loading.ts) with the counter and caption showing what
 * is in, then lights out. `pace.skipped` stops waiting on the load; `pace.speed` fast-forwards.
 * Stepped by hand with each frame's time capped: the site turns GSAP's lag smoothing off,
 * so a long first-load frame (shader compile) would otherwise skip lights.
 */
export function lightsDriver({ enter, lights, exit }: StartTimelines, readout: { count: HTMLElement; bar: HTMLElement; cap: HTMLElement }, pace: { speed: number; skipped: boolean }) {
  const advance = (t: gsap.core.Timeline, d: number) => t.time(Math.min(t.duration(), t.time() + d));
  let waited = 0; // seconds of lights so far
  let shown = 0; // the progress the lights and counter show, 0 to 1
  let on = 0; // lights lit
  let caption = '';
  const step = (_t: number, dt: number) => {
    const d = (Math.min(dt, 50) / 1000) * pace.speed;
    advance(enter, d);
    if (enter.time() < 0.35) return; // lights start once the gantry is down
    if (shown < 1) {
      lights.forEach(l => { if (l.time() > 0) advance(l, d); });
      waited += d;
      const target = pace.skipped || waited > MAX_WAIT ? 1 : loadProgress();
      shown = Math.min(target, shown + d / MIN_FILL);
      for (; on < LIGHTS && shown >= (on + 1) / LIGHTS - 1e-6; on++) advance(lights[on], 0.001);
      readout.count.textContent = String(Math.floor(shown * 100)).padStart(3, '0');
      readout.bar.style.transform = `scaleX(${shown})`;
      const part = loadingNow();
      const now = shown >= 1 ? 'Ready' : part ? `Loading ${part}` : 'Systems check';
      if (now !== caption) readout.cap.textContent = caption = now;
      // Settle the last light's bloom before lights out, so nothing fights the switch-off.
      if (shown >= 1) lights.forEach(l => l.progress(1));
      return;
    }
    advance(exit, d);
    if (exit.progress() === 1) gsap.ticker.remove(step);
  };
  return step;
}
