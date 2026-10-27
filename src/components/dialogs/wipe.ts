import { gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';
import type { Origin } from './context';

// Circular wipe from the click point: the dialog is clipped to a circle that grows from the
// click, its radius exactly the distance to the farthest screen corner, so the wipe has no
// dead time at either end. A clip-path, not a scaled circle: that one was a ~46M-pixel layer.
export const reach = (o: Origin) => Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
export const clip = (o: Origin, r: number) => `circle(${r.toFixed(1)}px at ${o.x.toFixed(1)}px ${o.y.toFixed(1)}px)`;
/** Dialogs opened without a click point (find-in-page) wipe from the middle of the screen. */
export const centre = (): Origin => ({ x: innerWidth / 2, y: innerHeight / 2 });


/** The running open animation per dialog, so a close that starts mid-open can cancel it. */
export const opening = new WeakMap<HTMLElement, { tl?: gsap.core.Timeline; cancelled?: boolean }>();

/** Dialogs already closing: a second Close or Escape mid-wipe is ignored. */
const closing = new WeakSet<HTMLElement>();

/** Content drops out, the circle shrinks back to the click point, then really close. */
export function closeWithWipe(el: HTMLElement | null, origin: Origin | undefined, done: () => void) {
  if (!el || !motionEnabled()) { done(); return; }
  if (closing.has(el)) return;
  closing.add(el);
  const o = origin ?? centre();
  // Closing mid-open: stop the open wipe and shrink from wherever it got to.
  const open = opening.get(el);
  const mid = open?.tl?.isActive() || (open && !open.tl);
  const r = mid ? parseFloat(el.style.clipPath.replace('circle(', '')) || 0 : reach(o);
  if (open) { open.cancelled = true; open.tl?.kill(); }
  gsap.timeline({ onComplete: done })
    .to(el.querySelectorAll('[data-din], [data-dhead]'), { autoAlpha: 0, y: -16, duration: 0.18, ease: EASE.in, overwrite: true })
    .fromTo(el, { clipPath: clip(o, r) }, { clipPath: clip(o, 0), duration: DUR.close, ease: EASE.wipe }, 0.08);
}
