import Lenis, { type LenisOptions } from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

/**
 * Smooth scrolling for both pages: Lenis moves the page inside the GSAP ticker and ScrollTrigger
 * updates on every scroll, so pins and scrubbed tweens read the same frame. Each page brings its
 * own feel (`options`); `first` runs Lenis ahead of everything else on the ticker.
 */
export function startLenis(options: LenisOptions, { onScroll, first = false }: { onScroll?: (lenis: Lenis) => void; first?: boolean } = {}) {
  const lenis = new Lenis({ ...options, autoRaf: false });
  lenis.on('scroll', (l: Lenis) => {
    onScroll?.(l);
    ScrollTrigger.update();
  });
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick, false, first);
  return { lenis, stop: () => { gsap.ticker.remove(tick); lenis.destroy(); } };
}
