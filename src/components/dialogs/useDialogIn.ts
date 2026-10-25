import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from '@/motion/gsap';
import { digitRoll } from '@/motion/digitRoll';
import { revealWithin } from '@/motion/reveals';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';
import type { Origin } from './context';
import { centre, clip, opening, reach } from './wipe';

// A row lands: its stat rolls (numbers) or rises (words), and its before/after bars race at
// the same speed (ease none), so the faster result stops almost at once. Returns digitRoll's
// restore. Opacity, not autoAlpha: a row waiting to land must stay focusable, or the Close
// button loses focus as the dialog opens and Tab skips rows below the fold.
function rowIn(row: Element, tl: gsap.core.Timeline) {
  tl.fromTo(row, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: EASE.out });
  row.querySelectorAll<HTMLElement>('[data-bar]').forEach(b => {
    const k = Number(b.dataset.k);
    tl.fromTo(b, { scaleX: 0 }, { scaleX: k, duration: 1.2 * k, ease: EASE.none }, 0.25);
  });
  const stat = row.querySelector<HTMLElement>('[data-dstat]');
  if (!stat) return;
  if (/^[~\d]/.test(stat.textContent ?? '')) return digitRoll(stat, { timeline: tl, at: 0.1 });
  tl.fromTo(stat, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: DUR.split, ease: EASE.out }, 0.1);
}

/**
 * Wipe in from the click point, then the rows land: the ones on screen right after
 * the wipe starts, the rest as they scroll into view inside the dialog. Without the
 * wipe (`wipe` false: a loader already covers the screen) only the rows land.
 */
export function useDialogIn(ref: RefObject<HTMLDivElement | null>, origin: Origin | undefined, wipe = true) {
  useLayoutEffect(() => {
    const el = ref.current!;
    el.querySelector<HTMLElement>('[data-dclose]')?.focus({ preventScroll: true });
    if (!motionEnabled()) return;
    const o = origin ?? centre();
    // Shared title: the card's title flies into the dialog heading (FLIP with one
    // uniform scale, so the text never stretches), alongside the circle wipe.
    const head = origin?.title ? el.querySelector<HTMLElement>('h2[data-din]') : null;
    const items = [...el.querySelectorAll('[data-din], [data-dhead]')].filter(n => n !== head);
    let raf = 0, stop: (() => void) | undefined;
    const state: { tl?: gsap.core.Timeline; cancelled?: boolean } = {};
    const restores: (() => void)[] = [];
    opening.set(el, state);
    const ctx = gsap.context(() => {
      if (wipe) gsap.set(el, { clipPath: clip(o, 0) });
      // Each row's entrance, built paused up front: digitRoll rewrites the stats before the title is measured.
      const rows = new Map(items.map(it => {
        const tl = gsap.timeline({ paused: true });
        const restore = rowIn(it, tl);
        if (restore) restores.push(restore);
        return [it, tl] as const;
      }));
      if (head && origin?.title) {
        const to = head.getBoundingClientRect(), from = origin.title;
        gsap.set(head, { x: from.left - to.left, y: from.top - to.top, scale: from.height / to.height, transformOrigin: '0 0' });
      }
      const onScreen = items.filter(it => it.getBoundingClientRect().top < innerHeight * 0.92);
      const below = items.filter(it => !onScreen.includes(it));
      // Start a frame after mount, so the cost of rendering the dialog isn't eaten by the tween.
      // ctx.add: this runs after the context function returned, and must still be reverted with it.
      raf = requestAnimationFrame(() => ctx.add(() => {
        if (state.cancelled) return;
        state.tl = gsap.timeline({ onComplete: () => { gsap.set(el, { clearProps: 'clipPath' }); } });
        // Fast-start ease: the circle's area grows with its radius squared, so an ease-in would look stuck.
        if (wipe) state.tl.to(el, { clipPath: clip(o, reach(o)), duration: DUR.open, ease: EASE.out });
        if (head) state.tl.to(head, { x: 0, y: 0, scale: 1, duration: DUR.open, ease: EASE.out }, 0);
        onScreen.forEach((it, i) => gsap.delayedCall(0.15 + (0.15 * i) / Math.max(1, onScreen.length - 1), () => rows.get(it)!.play()));
        stop = revealWithin(el, below, batch => ctx.add(() => batch.forEach((it, i) => gsap.delayedCall(i * 0.06, () => rows.get(it)!.play()))));
      }));
    }, el);
    return () => { cancelAnimationFrame(raf); stop?.(); ctx.revert(); restores.forEach(r => r()); };
  }, [ref, origin, wipe]);
}
