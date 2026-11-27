// GSAP for the products pages: the setup both pages share (src/motion/gsap.ts), and the
// reduced-motion setting from the one place it's read.
import { ensureGsap, Flip, gsap, ScrollTrigger, SplitText, useGSAP } from '@/motion/gsap';

ensureGsap();

/** True when the visitor asked for less motion: skip scrubs, splits and wipes, keep fades. */
export { reducedMotion } from '@/motion/reduced';

export { Flip, gsap, ScrollTrigger, SplitText, useGSAP };

/**
 * The motion language in numbers, for GSAP (CSS has the same steps as --t-* in tokens.css). An entrance runs
 * `enter` with `stagger` between items and lands with `ease`; a quick state change runs `quick`. DESIGN.md, Motion.
 */
export const MOTION = {
  enter: 0.5,
  enterLong: 0.7,
  quick: 0.3,
  stagger: 0.05,
  ease: 'expo.out',
  easeOut: 'power3.out',
  easeIn: 'power2.in',
} as const;
