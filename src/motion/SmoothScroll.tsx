import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import { ensureGsap, gsap, ScrollTrigger } from './gsap';
import { motionEnabled } from './prefs';
import { refreshSoon } from './startup';

/** Live scroll numbers shared with non-React code (WebGL stage, track map). */
export const scrollState = { y: 0, progress: 0, velocity: 0, locked: false };

type Api = {
  scrollTo: (target: string | HTMLElement | number, opts?: { immediate?: boolean }) => void;
  lock: () => void;
  unlock: () => void;
  lenis: () => Lenis | null;
};

const Ctx = createContext<Api | null>(null);
export const useSmoothScroll = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSmoothScroll outside <SmoothScroll>');
  return v;
};

const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * One scroll source for the whole page: Lenis sets the scroll position inside the GSAP
 * ticker and ScrollTrigger updates in the same frame, so pins, scrubbed tweens and the
 * WebGL stage never drift apart.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const locks = useRef(0);

  useEffect(() => {
    ensureGsap();
    const update = (y: number, limit: number, velocity: number) => {
      scrollState.y = y;
      scrollState.progress = limit > 0 ? y / limit : 0;
      scrollState.velocity = velocity;
    };

    if (!motionEnabled()) {
      const onScroll = () => update(window.scrollY, document.documentElement.scrollHeight - innerHeight, 0);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }

    // Touch keeps the browser's own scrolling (syncTouch off), so no touch multiplier applies.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false });
    lenisRef.current = lenis;
    lenis.on('scroll', (l: Lenis) => {
      update(l.scroll, l.limit, l.velocity);
      ScrollTrigger.update();
    });
    // A lock taken before Lenis existed (the loader locks in a layout effect, before this
    // runs) used the overflow fallback: move it over to Lenis, or touch scrolling stays blocked.
    if (locks.current > 0) { lenis.stop(); document.documentElement.style.overflow = ''; }
    const tick = (t: number) => lenis.raf(t * 1000);
    // Prioritized: Lenis runs first in every tick, so everything else on the ticker (the
    // rail, the marquee, speed skew, the WebGL stage) reads this frame's scroll, not the last.
    gsap.ticker.add(tick, false, true);
    void document.fonts?.ready.then(refreshSoon);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const api = useMemo<Api>(() => ({
    lenis: () => lenisRef.current,
    scrollTo(target, opts) {
      const lenis = lenisRef.current;
      const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
      if (lenis) {
        // An instant jump (a #link on load) can come in the same tick as the pins changing
        // the page's height, before Lenis's resize observer has run: re-measure first, or
        // it clamps the jump to the old, shorter page.
        if (opts?.immediate) lenis.resize();
        // No offset: Lenis subtracts the target's scroll-margin-top (the nav height, index.css).
        lenis.scrollTo(el ?? 0, { duration: 1.2, easing: expoOut, immediate: opts?.immediate });
      } else if (typeof el === 'number') {
        window.scrollTo(0, el);
      } else {
        el?.scrollIntoView();
      }
    },
    lock() {
      if (locks.current++ > 0) return;
      scrollState.locked = true;
      if (lenisRef.current) lenisRef.current.stop();
      else document.documentElement.style.overflow = 'hidden';
    },
    unlock() {
      if (locks.current === 0 || --locks.current > 0) return;
      scrollState.locked = false;
      lenisRef.current?.start();
      document.documentElement.style.overflow = ''; // always: the lock may have used the fallback
    },
  }), []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
