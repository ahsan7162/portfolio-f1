import { useEffect } from 'react';
import { ensureGsap, gsap, ScrollTrigger } from './gsap';
import { isTouch, motionEnabled } from './prefs';
import { scrollState } from './SmoothScroll';

const MAX = 3; // degrees at a hard flick
const GAIN = 0.05; // degrees per unit of Lenis velocity (px per frame)

/**
 * Speed skew: display headings marked `data-speed` lean with how fast you scroll
 * and settle back when you stop, direction aware. One ticker function eases
 * toward Lenis's (already smooth) velocity at any frame rate and writes skewY
 * through quickSetter, only to the headings on screen. Mouse and trackpad only:
 * touch velocity is not smoothed by Lenis and would jitter.
 */
export function useSpeedSkew() {
  useEffect(() => {
    ensureGsap();
    if (!motionEnabled() || isTouch()) return;
    const els = gsap.utils.toArray<HTMLElement>('[data-speed]');
    const set = new Map(els.map(el => [el, gsap.quickSetter(el, 'skewY', 'deg') as (v: number) => void]));
    const live = new Set<HTMLElement>();
    let skew = 0, written = 0;
    const tick = () => {
      const r = gsap.ticker.deltaRatio(60);
      const target = gsap.utils.clamp(-MAX, MAX, -scrollState.velocity * GAIN);
      skew += (target - skew) * (1 - Math.pow(0.86, r));
      if (Math.abs(skew) < 0.01 && target === 0) skew = 0;
      if (skew === written) return;
      written = skew;
      live.forEach(el => set.get(el)!(skew));
    };
    const triggers = els.map(el => ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'bottom top',
      onToggle: self => {
        if (self.isActive) live.add(el);
        else { live.delete(el); set.get(el)!(0); }
        if (live.size) gsap.ticker.add(tick); else { gsap.ticker.remove(tick); skew = written = 0; }
      },
    }));
    return () => {
      gsap.ticker.remove(tick);
      triggers.forEach(t => t.kill());
      gsap.set(els, { skewY: 0 });
    };
  }, []);
}
