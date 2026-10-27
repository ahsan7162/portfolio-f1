import * as THREE from 'three';
import { groundShade, onPalette, PALETTE } from '@/art/palette';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { EASE } from '@/motion/tokens';
import type { createField } from '../field';

type FieldUniforms = ReturnType<typeof createField>['uniforms'];
/** Counts running tweens, so the stage keeps drawing while one runs. */
export type Busy = { start: () => void; end: () => void };

/**
 * The contour field's two ground colours follow the section on screen (its data-bg, in F1's
 * grounds, carried onto the livery's own by groundShade). Every section's ground is dark,
 * so the lines keep their colour. A livery change repaints at once. Returns a cleanup.
 */
export function bindSectionColours(u: FieldUniforms, busy: Busy, redraw: () => void) {
  let at = ['#0b0b0c', '#141417'], tween: gsap.core.Timeline | null = null; // F1's carbon and panel, the field's start
  const to = (a: string, b: string) => {
    at = [a, b];
    const A = new THREE.Color(groundShade(a)), B = new THREE.Color(groundShade(b));
    // One blend at a time: an older one left running would outlive a livery change (onPalette).
    if (tween) { tween.kill(); busy.end(); }
    busy.start();
    tween = gsap.timeline({ onComplete: () => { busy.end(); tween = null; } })
      .to(u.uColA.value, { r: A.r, g: A.g, b: A.b, duration: 0.9, ease: EASE.wipe }, 0)
      .to(u.uColB.value, { r: B.r, g: B.g, b: B.b, duration: 0.9, ease: EASE.wipe }, 0);
  };
  const triggers = [...document.querySelectorAll<HTMLElement>('[data-bg]')].map(sec => {
    const [a, b] = sec.dataset.bg!.split(',');
    return ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1,
      onEnter: () => to(a, b), onEnterBack: () => to(a, b),
    });
  });
  // A livery change: the section's colours at once (finishing any blend into them), and a redraw.
  const offPalette = onPalette(() => {
    tween?.progress(1);
    u.uColA.value.set(groundShade(at[0])); u.uColB.value.set(groundShade(at[1]));
    u.uLine.value.set(PALETTE.fg); u.uAccent.value.set(PALETTE.ac);
    redraw();
  });
  return () => { offPalette(); triggers.forEach(st => st.kill()); };
}
