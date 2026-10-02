import { useEffect, useRef } from 'react';
import { gsap } from './gsap';
import { isTouch, motionEnabled } from './prefs';
import { DUR, EASE } from './tokens';

type Tilt = { rx: gsap.QuickToFunc; ry: gsap.QuickToFunc; s: gsap.QuickToFunc };

/**
 * Pointer effects for a bento grid (desktop, motion on): an accent spotlight
 * that trails the cursor across the whole grid, and a small tilt on the
 * `[data-tilt]` tile under it. Both run through gsap.quickTo, so the tilt eases
 * toward the cursor and settles flat on leave, and React never re-renders.
 */
export function useBentoPointer<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || isTouch() || !motionEnabled()) return;
    const spot = { x: -999, y: -999 };
    const paint = () => {
      host.style.setProperty('--mx', `${spot.x.toFixed(0)}px`);
      host.style.setProperty('--my', `${spot.y.toFixed(0)}px`);
    };
    const quick = { duration: DUR.split, ease: EASE.out, onUpdate: paint };
    const mx = gsap.quickTo(spot, 'x', quick), my = gsap.quickTo(spot, 'y', quick);
    const tilts = new Map<HTMLElement, Tilt>();
    const tiltOf = (el: HTMLElement) => {
      let t = tilts.get(el);
      if (!t) {
        gsap.set(el, { transformPerspective: 1000 });
        const v = { duration: DUR.split, ease: EASE.out };
        t = { rx: gsap.quickTo(el, 'rotationX', v), ry: gsap.quickTo(el, 'rotationY', v), s: gsap.quickTo(el, 'scale', v) };
        tilts.set(el, t);
      }
      return t;
    };
    let tile: HTMLElement | null = null;
    const release = (el: HTMLElement) => {
      delete el.dataset.tilting;
      const t = tiltOf(el);
      t.rx(0); t.ry(0); t.s(1);
    };
    let first = true;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      // Jump on entry so the spotlight doesn't slide in from the last exit point.
      if (first) { first = false; spot.x = x; spot.y = y; paint(); }
      mx(x); my(y);
      const t = (e.target as Element).closest<HTMLElement>('[data-tilt]');
      if (t !== tile) {
        if (tile) release(tile);
        tile = t;
        if (t) t.dataset.tilting = '';
      }
      if (!t) return;
      const b = t.getBoundingClientRect();
      // The cursor in the tile's own space, for per-tile spotlights (.card-spot).
      t.style.setProperty('--tx', `${(e.clientX - b.left).toFixed(0)}px`);
      t.style.setProperty('--ty', `${(e.clientY - b.top).toFixed(0)}px`);
      const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
      const q = tiltOf(t);
      q.rx(-py * 4); q.ry(px * 4); q.s(1.015);
    };
    const onEnter = () => host.style.setProperty('--spot', '1');
    const onLeave = () => {
      host.style.setProperty('--spot', '0');
      first = true;
      if (tile) release(tile);
      tile = null;
    };
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(spot);
      tilts.forEach((_, el) => { gsap.killTweensOf(el); gsap.set(el, { clearProps: 'transform' }); delete el.dataset.tilting; });
    };
  }, []);
  return ref;
}
