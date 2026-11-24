// GSAP for the products pages: the setup both pages share (src/motion/gsap.ts), and the
// reduced-motion setting from the one place it's read.
import { ensureGsap, Flip, gsap, ScrollTrigger, SplitText, useGSAP } from '@/motion/gsap';

ensureGsap();

/** True when the visitor asked for less motion: skip scrubs, splits and wipes, keep fades. */
export { reducedMotion } from '@/motion/reduced';

export { Flip, gsap, ScrollTrigger, SplitText, useGSAP };
