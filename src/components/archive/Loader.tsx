import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Origin } from '@/components/dialogs/context';
import { centre, clip, reach } from '@/components/dialogs/wipe';
import { ensureGsap, gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

const WORD = ['A', 'H', '0', '4'];
/** Seconds into a lap when the mark is whole and its line drawn; the loader leaves from here. */
const HOLD = 0.85;
/** How long the mark holds before it rolls out into the next lap. */
const STAY = 0.35;

/** The AH04 mark running laps on red, while the All projects code loads. */
export function Loader({ origin, ready, onExit, onGone }: { origin?: Origin; ready: boolean; onExit: () => void; onGone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const lap = useRef<gsap.core.Timeline | null>(null);
  const want = useRef(false), leave = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const el = root.current!;
    if (!motionEnabled()) return;
    ensureGsap();
    const chars = el.querySelectorAll('[data-ch]'), line = el.querySelector('[data-line]');
    const ctx = gsap.context(() => {
      // In: a red circle from the click point, like the dialogs' wipe.
      const o = origin ?? centre();
      gsap.fromTo(el, { clipPath: clip(o, 0) }, { clipPath: clip(o, reach(o)), duration: DUR.wipe, ease: EASE.out, clearProps: 'clipPath' });
      // A lap: the letters rise in leaning forward, the line draws under them, the mark holds, it rolls out.
      lap.current = gsap.timeline({ repeat: -1 })
        .fromTo(chars, { yPercent: 115, skewX: -16 }, { yPercent: 0, skewX: 0, duration: 0.6, ease: EASE.out, stagger: 0.07 }, 0.05)
        .fromTo(line, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.55, ease: EASE.wipe }, 0.25)
        .call(() => { if (want.current) leave.current(); }, undefined, HOLD)
        .to(chars, { yPercent: -115, skewX: 16, duration: 0.4, ease: EASE.in, stagger: 0.05 }, HOLD + STAY)
        .to(line, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.35, ease: EASE.in }, HOLD + STAY);
    }, el);
    // Out: the mark rolls away and the red drains down through an oval, the screen under it.
    leave.current = () => {
      want.current = false;
      lap.current?.pause();
      onExit();
      ctx.add(() => gsap.timeline({ onComplete: onGone })
        .to(chars, { yPercent: -115, skewX: 16, duration: 0.35, ease: EASE.in, stagger: 0.04 }, 0)
        .to(line, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.3, ease: EASE.in }, 0)
        .fromTo(el, { clipPath: 'ellipse(150% 150% at 50% 100%)' }, { clipPath: 'ellipse(150% 0% at 50% 100%)', duration: DUR.wipe, ease: EASE.wipe }, 0.15));
    };
    return () => { lap.current = null; ctx.revert(); };
  }, [origin, onExit, onGone]);

  // Ready: leave now if the mark is whole, else at the next lap's hold.
  useEffect(() => {
    if (!ready) return;
    const tl = lap.current;
    if (!tl) { onExit(); onGone(); return; }
    const t = tl.time();
    if (t >= HOLD && t < HOLD + STAY) leave.current();
    else want.current = true;
  }, [ready, onExit, onGone]);

  return (
    <div ref={root} role="status" className="fixed inset-0 z-[80] grid place-items-center bg-ac text-carbon">
      <span className="sr-only">Loading all projects</span>
      <div aria-hidden="true" className="flex flex-col items-stretch">
        {/* Clipped top and bottom only, so the lean isn't cut at the sides. */}
        <div className="display flex text-[clamp(4.5rem,22vw,18rem)] leading-[0.9]" style={{ overflowX: 'visible', overflowY: 'clip' }}>
          {WORD.map(c => <span key={c} data-ch className="block">{c}</span>)}
        </div>
        <span data-line className="mt-[3vw] block h-1.5 bg-carbon md:mt-6 md:h-2.5" />
      </div>
    </div>
  );
}
