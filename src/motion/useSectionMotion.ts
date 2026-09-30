import { useRef, type RefObject } from 'react';
import { ensureGsap, gsap, useGSAP } from './gsap';
import { debug, motionEnabled } from './prefs';

export type MotionCtx = {
  root: HTMLElement;
  q: <T extends Element = HTMLElement>(sel: string) => T | null;
  qa: <T extends Element = HTMLElement>(sel: string) => T[];
  desktop: boolean;
  markers: boolean;
  /** Register a non-GSAP undo step (e.g. restoring text a helper replaced). */
  onRevert: (fn: (() => void) | void) => void;
};

/**
 * Scoped GSAP setup for one section. Nothing runs with reduced motion, so the
 * markup's resting state (fully visible) is the final state. Content is never
 * hidden in CSS; GSAP sets start states before first paint.
 */
export function useSectionMotion<T extends HTMLElement = HTMLElement>(build: (c: MotionCtx) => void, deps: unknown[] = []): RefObject<T | null> {
  const ref = useRef<T>(null);
  useGSAP(() => {
    ensureGsap();
    const root = ref.current;
    if (!root || !motionEnabled()) return;
    const undo: Array<() => void> = [];
    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, ctx => {
      build({
        root,
        q: sel => root.querySelector(sel),
        qa: sel => Array.from(root.querySelectorAll(sel)),
        desktop: !!ctx.conditions?.desktop,
        markers: debug(),
        onRevert: fn => { if (fn) undo.push(fn); },
      });
      return () => { undo.splice(0).reverse().forEach(f => f()); };
    });
    return () => mm.revert();
  }, { scope: ref, dependencies: deps });
  return ref;
}
