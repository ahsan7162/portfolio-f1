import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';
import { DUR, EASE } from './tokens';

let ready = false;

/** Register plugins once, in the browser only (the page is also prerendered in Node). */
export function ensureGsap() {
  if (ready || typeof window === 'undefined') return;
  ready = true;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, useGSAP);
  gsap.defaults({ ease: EASE.out, duration: DUR.m });
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
