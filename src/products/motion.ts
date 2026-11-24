// GSAP for the products pages: the setup both pages share (src/motion/gsap.ts), plus the
// plugins only these pages use, and the reduced-motion setting from the one place it's read.
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { ensureGsap, Flip, gsap, ScrollTrigger, SplitText, useGSAP } from '@/motion/gsap';

ensureGsap([Draggable, InertiaPlugin]);

/** True when the visitor asked for less motion: skip scrubs, splits and wipes, keep fades. */
export { reducedMotion } from '@/motion/reduced';

export { Draggable, Flip, gsap, ScrollTrigger, SplitText, useGSAP };
