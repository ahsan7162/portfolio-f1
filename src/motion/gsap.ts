import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';
import { DUR, EASE } from './tokens';

let ready = false;

/**
 * GSAP for both pages, the portfolio and the products section: the plugins they share, the
 * defaults and the ticker, set once, in the browser only (the portfolio is also prerendered in
 * Node). Each page passes the plugins only it uses, so they stay in its bundle (vite.config.ts).
 */
export function ensureGsap(own: object[] = []) {
  if (typeof window === 'undefined') return;
  if (!ready) {
    ready = true;
    gsap.registerPlugin(ScrollTrigger, SplitText, Flip, useGSAP);
    gsap.defaults({ ease: EASE.out, duration: DUR.reveal });
    gsap.ticker.lagSmoothing(0);
    if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });
  }
  if (own.length) gsap.registerPlugin(...own);
}

export { Flip, gsap, ScrollTrigger, SplitText, useGSAP };
