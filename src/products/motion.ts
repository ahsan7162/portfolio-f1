// GSAP for the products pages: one registration, one place to read the reduced-motion setting.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, Draggable, InertiaPlugin, ScrambleTextPlugin, useGSAP);
gsap.defaults({ ease: 'expo.out', duration: 0.9 });

/** True when the visitor asked for less motion: skip scrubs, splits and wipes, keep fades. */
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { Draggable, Flip, gsap, ScrollTrigger, SplitText, useGSAP };
