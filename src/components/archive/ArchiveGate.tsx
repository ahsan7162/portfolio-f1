import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DialogProps } from '@/components/Dialogs';
import type { Origin } from '@/components/dialog-context';
import { ensureGsap, gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

// All projects loads its own code the first time it is opened, not with the page. Until it
// has arrived, the AH04 loader covers the screen: red, wiped in from the click, the mark
// running laps. Once the screen is ready, at the next moment the mark is whole, the red
// drains away through an oval (the cards' curtain) and the screen is under it, its rows
// landing. Later opens find the code loaded and skip the loader.

type Screen = typeof import('./Showcase').default;

const load = () => import('./Showcase');
let loaded: Screen | undefined;

export function ArchiveGate(props: DialogProps) {
  const [Screen, setScreen] = useState<Screen | undefined>(() => loaded);
  // covered: the loader ran, so the screen opens without its own wipe.
  const [covered] = useState(!loaded);
  const [show, setShow] = useState(!!loaded);
  const [loader, setLoader] = useState(!loaded);
  const { onClose } = props;

  useEffect(() => {
    if (loaded) return;
    let alive = true;
    load().then(m => { loaded = m.default; if (alive) setScreen(() => m.default); }, () => { if (alive) onClose(); });
    return () => { alive = false; };
  }, [onClose]);

  const onExit = useCallback(() => setShow(true), []);
  const onGone = useCallback(() => setLoader(false), []);

  return (
    <>
      {show && Screen && <Screen {...props} wipe={!covered} />}
      {loader && <Loader origin={props.origin} ready={!!Screen} onExit={onExit} onGone={onGone} />}
    </>
  );
}

const WORD = ['A', 'H', '0', '4'];
/** Seconds into a lap when the mark is whole and its line drawn; the loader leaves from here. */
const HOLD = 0.85;
/** How long the mark holds before it rolls out into the next lap. */
const STAY = 0.35;

function Loader({ origin, ready, onExit, onGone }: { origin?: Origin; ready: boolean; onExit: () => void; onGone: () => void }) {
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
      const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
      const r = Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
      gsap.fromTo(el, { clipPath: `circle(0px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${r}px at ${o.x}px ${o.y}px)`, duration: DUR.wipe, ease: EASE.out, clearProps: 'clipPath' });
      // A lap: the letters rise in one by one, leaning forward as they arrive, the line draws
      // under them, the mark holds, then it all rolls out and the next lap starts.
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
