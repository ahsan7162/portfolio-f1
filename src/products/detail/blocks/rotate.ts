// What the tabbed and stepped blocks (cases, tour, scenes) share: the index maths and the self-advancing timer.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { gsap } from '../../motion';
import { useBlockMotion } from './shared';

export type Move = 'next' | 'prev' | number;

/** The index after a move, wrapping at both ends. A count of 0 or 1 always gives 0. */
export function stepIndex(index: number, count: number, move: Move): number {
  if (count <= 1) return 0;
  const to = move === 'next' ? index + 1 : move === 'prev' ? index - 1 : Math.trunc(move);
  return ((to % count) + count) % count;
}

/**
 * Which item is showing, and the clock that moves it on. The clock is one tween on the active item's
 * fill bar (`[data-rot="<i>"] .bv-rot-fill`, scaleX 0 to 1 over `hold` seconds); finishing it steps to
 * the next item. It runs only while the block is on screen, keyboard focus is outside it and the
 * reader has not paused. Hover does not hold it: these blocks fill the screen, so the pointer is nearly
 * always over them and the clock would never run. Choosing an item (`go`) pauses it there, so Play carries on from that
 * item, unless `keep` says the choice should carry on at once. Taking over the demo itself (`take`) stops it for good.
 * With reduced motion it never starts.
 */
export function useRotate(
  root: RefObject<HTMLElement | null>,
  { count, hold, onTick }: { count: number; hold: number; onTick?: (progress: number) => void },
) {
  const [index, setIndex] = useState(0);
  const [live, setLive] = useState(false); // motion allowed and the page revealed
  const [stopped, setStopped] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const tween = useRef<gsap.core.Tween | null>(null);
  const holds = useRef({ paused: false, out: true, focus: false });
  const tick = useRef(onTick);
  useEffect(() => { tick.current = onTick; });
  const rotating = live && count > 1 && !stopped;

  useBlockMotion(root, () => {
    setLive(true);
    return () => setLive(false);
  });

  const apply = useCallback(() => {
    const t = tween.current;
    if (!t) return;
    const h = holds.current;
    if (h.paused || h.out || h.focus) t.pause(); else t.play();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const h = holds.current;
    const io = new IntersectionObserver(entries => {
      const on = entries[entries.length - 1].isIntersecting;
      h.out = !on;
      setInView(on);
      apply();
    });
    io.observe(el);
    // Keyboard focus only: a mouse click also focuses the tab it lands on, and must not freeze the clock.
    const focusIn = (e: FocusEvent) => { h.focus = e.target instanceof Element && e.target.matches(':focus-visible'); apply(); };
    const focusOut = (e: FocusEvent) => { if (!el.contains(e.relatedTarget as Node | null)) { h.focus = false; apply(); } };
    el.addEventListener('focusin', focusIn);
    el.addEventListener('focusout', focusOut);
    return () => {
      io.disconnect();
      el.removeEventListener('focusin', focusIn);
      el.removeEventListener('focusout', focusOut);
    };
  }, [root, apply]);

  useEffect(() => {
    holds.current.paused = paused;
    apply();
  }, [paused, apply]);

  useEffect(() => {
    if (!rotating) return;
    const fill = root.current?.querySelector<HTMLElement>(`[data-rot="${index}"] .bv-rot-fill`);
    if (!fill) return;
    const t = gsap.fromTo(fill, { scaleX: 0 }, {
      scaleX: 1, ease: 'none', duration: hold, paused: true,
      // the first render happens inside gsap.fromTo, before `t` exists
      onUpdate: () => { if (tween.current) tick.current?.(tween.current.progress()); },
      onComplete: () => setIndex(i => stepIndex(i, count, 'next')),
    });
    tween.current = t;
    apply();
    return () => {
      t.kill();
      tween.current = null;
      gsap.set(fill, { clearProps: 'transform' });
    };
  }, [rotating, index, hold, count, apply, root]);

  return {
    index, live, inView, stopped, paused, rotating,
    /** Pick an item. Pauses the clock on it (Play carries on from there); `keep` carries on at once. */
    go: (move: Move, keep = false) => { setIndex(i => stepIndex(i, count, move)); if (!keep) setPaused(true); },
    /** The reader took over something else (the demo itself): stop the clock for good. */
    take: () => setStopped(true),
    /** Back to the first item with the clock running. */
    restart: () => { setIndex(0); setStopped(false); setPaused(false); },
    toggle: () => setPaused(p => !p),
  };
}

export type Rot = ReturnType<typeof useRotate>;
