// The page's scroller. With smooth scrolling on, every programmatic scroll has to go through Lenis.
import type Lenis from 'lenis';

let lenis: Lenis | null = null;
export function setLenis(l: Lenis | null) { lenis = l; }

let jumping = false;
/** True while the page is being scrolled somewhere on purpose (a button, a link), not by the visitor. */
export const isJumping = () => jumping;

export function scrollToY(y: number, immediate = false) {
  if (lenis) {
    jumping = true;
    lenis.scrollTo(y, { immediate, force: true, onComplete: () => { jumping = false; } });
  } else {
    window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' });
  }
}

/** Move keyboard focus to a place on the page that is not a control (a heading, a section), so Tab carries on from there. */
export function focusOn(el: Element | null | undefined) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/** Scroll until `el` sits `gap` px below the top of the screen, and take keyboard focus there. */
export function scrollToEl(el: Element | null | undefined, gap = 0, immediate = false) {
  if (!el) return;
  scrollToY(el.getBoundingClientRect().top + window.scrollY - gap, immediate);
  focusOn(el);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Glide to a position in a fixed time, and do not let further scrolling interrupt it. */
export function stepToY(y: number, done: () => void) {
  if (lenis) lenis.scrollTo(y, { lock: true, duration: 0.65, easing: easeInOut, onComplete: done });
  else { window.scrollTo({ top: y, behavior: 'smooth' }); window.setTimeout(done, 700); }
}

/** What a section sees of a wheel gesture. */
export type Wheel = { deltaY: number; event: Event };
type Gate = (wheel: Wheel) => boolean;
let gate: Gate | null = null;

/** A section may take over wheel gestures while it is on screen: its gate returns false to swallow one. */
export function setWheelGate(fn: Gate | null) { gate = fn; }
/** Given to the smooth scroller: asks the current gate, if any. */
export const wheelGate: Gate = wheel => (gate ? gate(wheel) : true);
