import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import { ensureGsap, gsap, ScrollTrigger } from './gsap';
import { motionEnabled } from './prefs';

/** Live scroll numbers shared with non-React code (WebGL stage, track map). */
export const scrollState = { y: 0, progress: 0, velocity: 0, direction: 0 as -1 | 0 | 1, locked: false };

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

const navOffset = () => -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navh')) || 64);
const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * One scroll source for the whole page. Lenis sets the real scroll position
 * inside the GSAP ticker, then ScrollTrigger updates in the same frame, so
 * pins, scrubbed tweens and the WebGL stage never drift apart.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const locks = useRef(0);

  useEffect(() => {
    ensureGsap();
    const update = (y: number, limit: number, velocity: number, direction: number) => {
      scrollState.y = y;
      scrollState.progress = limit > 0 ? y / limit : 0;
      scrollState.velocity = velocity;
      scrollState.direction = (Math.sign(direction) as -1 | 0 | 1);
    };

    if (!motionEnabled()) {
      const onScroll = () => update(window.scrollY, document.documentElement.scrollHeight - innerHeight, 0, 0);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, touchMultiplier: 1.25, autoRaf: false });
    lenisRef.current = lenis;
    (window as unknown as { lenis?: Lenis }).lenis = lenis;
    lenis.on('scroll', (l: Lenis) => {
      update(l.scroll, l.limit, l.velocity, l.direction);
      ScrollTrigger.update();
    });
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
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
        lenis.scrollTo(el ?? 0, { offset: typeof el === 'number' ? 0 : navOffset(), duration: 1.2, easing: expoOut, immediate: opts?.immediate });
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
      if (lenisRef.current) lenisRef.current.start();
      else document.documentElement.style.overflow = '';
    },
  }), []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
