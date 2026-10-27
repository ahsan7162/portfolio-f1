import { useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { archive } from '@/content/data';
import { Flip, gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

export const N = archive.length;
/** Opening and closing a project: one shape between card and view. */
export const MORPH = { duration: 0.55, ease: EASE.out };

/** origin: the card the view opened from (hidden while it is open); sel: the project shown. */
export type View = { origin: number; sel: number };

type Cards = {
  tiles: RefObject<(HTMLButtonElement | null)[]>;
  boxes: RefObject<(HTMLDivElement | null)[]>;
  landed: RefObject<Set<number>>;
};

/** A window keydown handler (capture phase) that always sees the latest render; true = handled. */
function useKeys(handler: (e: KeyboardEvent) => boolean) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (ref.current(e)) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}

/**
 * The full project view over the archive grid. A card opens into it with GSAP Flip (the
 * scene grows from the card into the view) and it shrinks back into the card on close;
 * the arrows step to the next or previous project. Returns the view, its actions, and the
 * elements its markup attaches (ProjectView).
 */
export function useProjectView(dref: RefObject<HTMLDivElement | null>, { tiles, boxes, landed }: Cards) {
  const [view, setView] = useState<View | null>(null);
  const pane = useRef<HTMLDivElement>(null), bg = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLDivElement>(null), info = useRef<HTMLDivElement>(null), back = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);

  const open = (i: number) => {
    if (busy.current || view) return;
    const state = motionEnabled() ? Flip.getState(boxes.current[i]) : null;
    flushSync(() => setView({ origin: i, sel: i }));
    back.current?.focus({ preventScroll: true });
    if (!state) return;
    busy.current = true;
    gsap.timeline({ onComplete: () => { busy.current = false; } })
      .add(Flip.from(state, { targets: big.current, scale: true, ...MORPH }), 0)
      .fromTo(bg.current, { opacity: 0 }, { opacity: 1, duration: DUR.split, ease: EASE.out }, 0)
      .fromTo([bar.current, info.current], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: DUR.wipe, ease: EASE.out, stagger: 0.06, clearProps: 'transform' }, 0.15);
  };

  const close = () => {
    const v = view;
    if (!v || busy.current) return;
    const done = () => {
      flushSync(() => setView(null));
      busy.current = false;
      tiles.current[v.sel]?.focus({ preventScroll: true });
    };
    const root = dref.current, tile = boxes.current[v.sel];
    if (!motionEnabled() || !root || !tile || !big.current) { done(); return; }
    busy.current = true;
    // Behind the view, bring the card it closes into on screen, so the shape has a place to land.
    const r = tile.getBoundingClientRect();
    if (r.bottom < 64 || r.top > innerHeight) root.scrollBy({ top: r.top - (innerHeight - r.height) / 2 });
    // A card not yet revealed (reached with the arrow keys) lands at once, so the shape has it to land in.
    if (!landed.current.has(v.sel)) {
      landed.current.add(v.sel);
      gsap.set(tile.closest('[data-card]'), { opacity: 1, clearProps: 'transform' });
    }
    const state = Flip.getState(big.current);
    gsap.set(big.current, { opacity: 0 });
    // The card's scene, lifted above the view while it shrinks back into place.
    gsap.set(tile, { visibility: 'visible', zIndex: 30 });
    gsap.timeline({ onComplete: () => { gsap.set(tile, { clearProps: 'visibility,zIndex' }); done(); } })
      .to([bar.current, info.current, bg.current], { opacity: 0, duration: 0.25, ease: EASE.in }, 0)
      .add(Flip.from(state, { targets: tile, scale: true, ...MORPH }), 0);
  };

  /** The next or previous project inside the view: out on ease-in, in on expo-out. */
  const step = (d: 1 | -1) => {
    const v = view;
    if (!v || busy.current) return;
    const next = { ...v, sel: (v.sel + d + N) % N };
    if (!motionEnabled()) { setView(next); if (pane.current) pane.current.scrollTop = 0; return; }
    busy.current = true;
    gsap.to([big.current, info.current], { x: -40 * d, opacity: 0, duration: 0.2, ease: EASE.in, onComplete: () => {
      flushSync(() => setView(next));
      if (pane.current) pane.current.scrollTop = 0;
      gsap.fromTo([big.current, info.current], { x: 60 * d, opacity: 0 }, {
        x: 0, opacity: 1, duration: DUR.split, ease: EASE.out, stagger: 0.05, clearProps: 'transform',
        onComplete: () => { busy.current = false; },
      });
    } });
  };

  // Keys while a project is open. Capture phase: Escape closes the view before the dialog.
  useKeys(e => {
    // With a modifier the arrows are the browser's (Alt+← is Back).
    if (!view || e.altKey || e.ctrlKey || e.metaKey) return false;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else return false;
    return true;
  });
  // While a project is open, the dialog header behind it leaves the Tab order.
  useEffect(() => {
    const head = dref.current?.querySelector<HTMLElement>('[data-dhead]');
    if (head) head.inert = !!view;
  }, [view, dref]);

  return { view, open, close, step, els: { pane, bg, bar, big, info, back } };
}

export type ViewEls = ReturnType<typeof useProjectView>['els'];
