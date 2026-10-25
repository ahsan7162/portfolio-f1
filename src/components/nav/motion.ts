import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from '@/motion/gsap';
import { introDone, introTimeline } from '@/motion/intro';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

/**
 * The bar's entrance: the wordmark and the buttons drop in as the lights go out, on the
 * loader's master timeline with the hero. A layout effect, so it joins before the intro is
 * skipped (repeat visits, #links). The bar's children only, never the <header>, whose
 * transform would trap the fixed menu panel inside a 64 px box.
 */
export function useNavEntrance(header: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const bar = header.current?.querySelector('nav[aria-label=Primary]');
    if (!bar || !motionEnabled() || introDone()) return;
    const ctx = gsap.context(() => {
      // The wordmark and the buttons' wrapper (the .btn elements have CSS transitions that would fight GSAP).
      introTimeline().from([bar.firstElementChild, bar.lastElementChild], {
        autoAlpha: 0, y: -14, duration: DUR.reveal, ease: EASE.out, stagger: 0.08, clearProps: 'transform,opacity,visibility',
      }, 'reveal+=0.2');
    });
    return () => ctx.revert();
  }, [header]);
}

/**
 * The menu panel: opening wipes it down from the top, then the rows rise in (about 0.8 s
 * in all). Closing is its own quicker move: rows and side drop out, then the wipe closes.
 */
export function useMenuWipe(panel: RefObject<HTMLDivElement | null>, open: boolean) {
  const tl = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    const p = panel.current!;
    if (!motionEnabled()) { gsap.set(p, { autoAlpha: open ? 1 : 0 }); return; }
    if (!open && !tl.current) return; // first render: the menu starts closed
    const rows = p.querySelectorAll('[data-mrow]'), side = p.querySelectorAll('[data-mside]');
    tl.current?.kill();
    tl.current = open
      ? gsap.timeline()
        .set(p, { autoAlpha: 1 })
        .fromTo(p, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: EASE.wipe })
        .fromTo(rows, { yPercent: 110 }, { yPercent: 0, duration: 0.5, stagger: 0.025, ease: EASE.out }, 0.15)
        .fromTo(side, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04, ease: EASE.out }, 0.25)
      : gsap.timeline()
        .to(rows, { yPercent: 110, duration: 0.2, ease: EASE.in })
        .to(side, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 0)
        .to(p, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.3, ease: EASE.in }, 0.1)
        .set(p, { autoAlpha: 0 });
  }, [panel, open]);
  useEffect(() => () => { tl.current?.kill(); }, []);
}
