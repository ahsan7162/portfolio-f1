import { useEffect, useRef, type ReactNode } from 'react';
import { onPalette } from '@/art/palette';
import { type Fx, label, LINE, makeFx, PANEL, SceneSvg, setText } from '@/components/scene-kit';
import { ensureGsap, gsap } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';

// The archive's scenes keep the featured scenes' contract (ProjectVisuals): the markup is
// the scene's last frame, so it reads the same prerendered and with motion off. But the
// grid decides when one plays: a card's reveal primes its scene (start frame) as the
// curtain opens and plays it once the curtain lifts; the project view plays its scene on
// its own (autoplay). Nothing loops. Hovering a finished scene replays it (not on touch).

export type SceneApi = { prime: () => void; play: () => void };

export function Scene({ build, autoplay, handle, children }: {
  build: (fx: Fx) => void;
  /** Play this many seconds after mounting. */
  autoplay?: number;
  /** Hands the scene's prime and play to whoever reveals it (null on unmount). */
  handle?: (api: SceneApi | null) => void;
  children: ReactNode;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !motionEnabled()) return;
    ensureGsap();
    const finals = new Map<Element, string>(); // the markup's text, restored on cleanup
    const keep = (el: Element) => { if (!finals.has(el)) finals.set(el, el.textContent ?? ''); return finals.get(el)!; };
    const resets: (() => void)[] = [];
    const reset = () => resets.forEach(r => r());
    let ctx = gsap.context(() => {}, svg);
    let tl: gsap.core.Timeline | undefined, started = false;
    // Built on first use, not on mount: ten timelines at once would stall the dialog's wipe.
    const prime = () => {
      if (tl) return;
      ctx.add(() => {
        tl = gsap.timeline({ paused: true, defaults: { ease: EASE.out, duration: 0.4 } });
        build(makeFx(svg, tl, keep, resets));
        tl.progress(0);
        reset();
      });
    };
    const play = () => { prime(); started = true; reset(); tl!.restart(); };
    // A livery change drops a built timeline once it settles (it holds PALETTE's colours): the
    // scene is back at the markup's last frame, and its next play builds it in the new colours.
    const offPalette = onPalette(() => {
      if (!tl) return;
      ctx.revert();
      finals.forEach((s, el) => setText(el, s));
      resets.length = 0;
      tl = undefined;
      started = false;
      ctx = gsap.context(() => {}, svg);
    }, true);
    handle?.({ prime, play });
    const timer = autoplay === undefined ? 0 : window.setTimeout(play, autoplay * 1000);
    const tile = !isTouch() && svg.closest('[data-tile]');
    const replay = () => { if (started && tl && tl.time() >= tl.duration() - 0.01) play(); };
    if (tile) tile.addEventListener('pointerenter', replay);
    return () => {
      offPalette();
      clearTimeout(timer);
      handle?.(null);
      if (tile) tile.removeEventListener('pointerenter', replay);
      ctx.revert();
      finals.forEach((s, el) => setText(el, s));
    };
  }, [build, autoplay, handle]);
  return <SceneSvg ref={ref}>{children}</SceneSvg>;
}

/** A window: panel, title bar dots and a label. */
export const Win = ({ x, y, w, h, title, right, fill = PANEL }: { x: number; y: number; w: number; h: number; title?: string; right?: ReactNode; fill?: string }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="4" fill={fill} stroke={LINE} />
    {title !== undefined && (
      <>
        <text x={x + 12} y={y + 12.2} {...label()}>{title}</text>
        {right}
        <line x1={x} y1={y + 19} x2={x + w} y2={y + 19} stroke={LINE} />
      </>
    )}
  </g>
);
