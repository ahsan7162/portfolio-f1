import { useLayoutEffect, type RefObject } from 'react';
import { ensureGsap, gsap } from '@/motion/gsap';
import { curtainReveal, revealWithin } from '@/motion/reveals';
import { finePointer, motionEnabled } from '@/motion/prefs';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import type { SceneApi } from './scene';

type Cards = {
  apis: RefObject<(SceneApi | null)[]>;
  boxes: RefObject<(HTMLDivElement | null)[]>;
  /** Cards that have landed; one the project view closes into early is landed on the spot. */
  landed: RefObject<Set<number>>;
};

/**
 * Cards on scroll: each rises into place (a row lands left to right), its scene opens
 * through the red oval curtain and plays once the curtain has lifted. On desktop the
 * scenes drift a little inside their frames as the dialog scrolls.
 */
export function useCardReveal(dref: RefObject<HTMLDivElement | null>, { apis, boxes, landed }: Cards) {
  useLayoutEffect(() => {
    const root = dref.current;
    if (!root || !motionEnabled()) return;
    ensureGsap();
    const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
    const panels: (() => void)[] = [];
    let stop: (() => void) | undefined, offDrift = () => {}, first = true;
    const ctx = gsap.context(() => {
      // Opacity, not autoAlpha: a card waiting to land stays focusable.
      gsap.set(cards, { opacity: 0, y: 48 });
      stop = revealWithin(root, cards, batch => ctx.add(() => {
        // The first cards wait for the dialog's wipe to be well under way.
        const base = first ? 0.3 : 0;
        first = false;
        batch.filter(el => !landed.current.has(Number((el as HTMLElement).dataset.card))).forEach((el, k) => {
          const card = el as HTMLElement, i = Number(card.dataset.card);
          landed.current.add(i);
          const tl = gsap.timeline({ delay: base + k * STAGGER.card });
          tl.to(card, { opacity: 1, y: 0, duration: DUR.reveal, ease: EASE.out, clearProps: 'transform' }, 0)
            .from(card.querySelectorAll('[data-cardtxt]'), { opacity: 0, y: 14, duration: DUR.wipe, ease: EASE.out, stagger: 0.06, clearProps: 'transform' }, 0.3)
            .call(() => apis.current[i]?.prime(), undefined, 0.05);
          const rm = curtainReveal(boxes.current[i], { timeline: tl, at: 0.05 });
          if (rm) panels.push(rm);
          tl.call(() => apis.current[i]?.play(), undefined, 0.05 + DUR.reveal);
        });
      }));
      // From a card's top at the dialog's bottom to its bottom at the top. A scroll listener,
      // not ScrollTrigger, for the reason in revealWithin (reveals.ts).
      if (finePointer() && matchMedia('(min-width: 768px)').matches) {
        const drifts = cards.map(card => gsap.fromTo(card.querySelector('[data-drift]'), { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: EASE.none, paused: true }));
        const drift = () => {
          const box = root.getBoundingClientRect(), rects = cards.map(c => c.getBoundingClientRect()); // every read before any write
          drifts.forEach((tw, i) => tw.progress(gsap.utils.clamp(0, 1, (box.bottom - rects[i].top) / (box.height + rects[i].height))));
        };
        drift();
        root.addEventListener('scroll', drift, { passive: true });
        offDrift = () => root.removeEventListener('scroll', drift);
      }
    }, root);
    return () => { stop?.(); offDrift(); panels.forEach(p => p()); ctx.revert(); };
  }, [dref, apis, boxes, landed]);
}
