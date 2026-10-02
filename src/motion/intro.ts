import { gsap } from './gsap';
import { motionEnabled } from './prefs';

// One master intro timeline. The loader plays it; the hero (and the WebGL
// helmet) add their reveals at the 'reveal' label, so everything lands together.
let tl: gsap.core.Timeline | null = null;
let done = false;
const waiters: Array<() => void> = [];

export const INTRO_KEY = 'v2-intro-seen';

/** Loader runs on first visit only, never with a URL hash or reduced motion. */
export function loaderWanted() {
  if (typeof window === 'undefined' || !motionEnabled()) return false;
  if (location.hash || new URLSearchParams(location.search).has('nointro')) return false;
  try { return !sessionStorage.getItem(INTRO_KEY); } catch { return true; }
}

export function introTimeline() {
  if (!tl) {
    // Created outside any section's gsap.context, so a section's cleanup (React
    // StrictMode runs effects twice in dev) never reverts the shared timeline.
    let made!: gsap.core.Timeline;
    gsap.context(() => {}).ignore(() => {
      made = gsap.timeline({ paused: true, onComplete: () => { done = true; waiters.splice(0).forEach(f => f()); } });
    });
    tl = made;
    tl.addLabel('reveal', 0);
  }
  return tl;
}

export const introDone = () => done;
export function onIntroDone(fn: () => void) { if (done) fn(); else waiters.push(fn); }

/** Start the reveal (called by the loader, or straight away when it is skipped). */
export function playIntro(speed = 1) {
  const t = introTimeline();
  t.timeScale(speed).play(0);
  try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
}

/** Repeat visit or no loader: jump every intro tween to its end state. */
export function skipIntro() {
  const t = introTimeline();
  // Render from the start, then the end: tweens added after an earlier skip
  // (StrictMode re-runs effects) would otherwise keep their hidden from-state.
  t.progress(0, true).progress(1);
}
