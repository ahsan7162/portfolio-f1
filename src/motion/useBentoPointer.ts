import { useEffect, useRef } from 'react';
import { isTouch, motionEnabled } from './prefs';

/**
 * Pointer effects for a bento grid (desktop, motion on): an accent spotlight
 * that follows the cursor across the whole grid, and a small tilt on the
 * `[data-tilt]` tile under it. Writes CSS variables and transforms directly,
 * so React never re-renders on pointer moves.
 */
export function useBentoPointer<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || isTouch() || !motionEnabled()) return;
    let tile: HTMLElement | null = null;
    const release = (el: HTMLElement) => {
      delete el.dataset.tilting;
      el.style.transform = '';
    };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      host.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
      host.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
      const t = (e.target as Element).closest<HTMLElement>('[data-tilt]');
      if (t !== tile) {
        if (tile) release(tile);
        tile = t;
        if (t) t.dataset.tilting = '';
      }
      if (!t) return;
      const b = t.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
      t.style.transform = `perspective(1000px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg) scale(1.015)`;
    };
    const onEnter = () => host.style.setProperty('--spot', '1');
    const onLeave = () => {
      host.style.setProperty('--spot', '0');
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
      onLeave();
    };
  }, []);
  return ref;
}
