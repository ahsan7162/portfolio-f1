import { useRef, type RefObject } from 'react';
import { ensureGsap, gsap, ScrollTrigger, useGSAP } from './gsap';
import { debug, motionEnabled, SHORT_SCREEN } from './prefs';

export type MotionCtx = {
  root: HTMLElement;
  q: <T extends Element = HTMLElement>(sel: string) => T | null;
  qa: <T extends Element = HTMLElement>(sel: string) => T[];
  desktop: boolean;
  /** At least 1024 px wide (room for split layouts). */
  wide: boolean;
  /** Too short to pin (see SHORT_SCREEN). */
  short: boolean;
  markers: boolean;
  /** Register a non-GSAP undo step (e.g. restoring text a helper replaced). */
  onRevert: (fn: (() => void) | void) => void;
};

/**
 * Scoped GSAP setup for one section. Nothing runs with reduced motion, so the
 * markup's resting state (fully visible) is the final state. Content is never
 * hidden in CSS; GSAP sets start states before first paint.
 *
 * `fit`: for sections that pin only when their content fits the screen.
 * Their setup is rebuilt when the viewport height crosses a
 * few steps, and once more when web fonts finish loading: the first measure
 * can run on the wider fallback font and wrongly skip the pin, which would
 * also throw off the helmet path timed against it.
 */
export function useSectionMotion<T extends HTMLElement = HTMLElement>(build: (c: MotionCtx) => void, deps: unknown[] = [], opts: { fit?: boolean } = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  useGSAP(() => {
    ensureGsap();
    const root = ref.current;
    if (!root || !motionEnabled()) return;
    const undo: Array<() => void> = [];
    const conditions: Record<string, string> = { desktop: '(min-width: 768px)', mobile: '(max-width: 767px)', wide: '(min-width: 1024px)', short: SHORT_SCREEN };
    if (opts.fit) Object.assign(conditions, { h1: '(min-height: 560px)', h2: '(min-height: 760px)', h3: '(min-height: 960px)' });
    const setup = () => {
      const mm = gsap.matchMedia();
      mm.add(conditions, ctx => {
        build({
          root,
          q: sel => root.querySelector(sel),
          qa: sel => Array.from(root.querySelectorAll(sel)),
          desktop: !!ctx.conditions?.desktop,
          wide: !!ctx.conditions?.wide,
          short: !!ctx.conditions?.short,
          markers: debug(),
          onRevert: fn => { if (fn) undo.push(fn); },
        });
        return () => { undo.splice(0).reverse().forEach(f => f()); };
      });
      return mm;
    };
    let mm = setup();
    let live = true;
    if (opts.fit && document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (!live) return;
        mm.revert();
        mm = setup();
        // Pins may have changed: put every trigger (helmet path included) back in page order.
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
      });
    }
    return () => { live = false; mm.revert(); };
  }, { scope: ref, dependencies: deps });
  return ref;
}
