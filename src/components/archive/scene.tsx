import { useEffect, useRef, type ReactNode } from 'react';
import { onPalette } from '@/art/palette';
import { AC, DIM, FG, finished, type Fx, INK, label, LINE, makeFx, PANEL, replayOnHover, SceneSvg, sceneText, t } from '@/components/scene-kit';
import { ensureGsap, gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';

// An archive scene's runtime. The markup is its last frame (as for the featured scenes), but
// the grid decides when it plays: a card's reveal primes it as the curtain opens and plays it
// once the curtain lifts; the project view plays its own (autoplay). Nothing loops. Hovering a
// finished scene replays it.

export type SceneApi = { prime: () => void; play: () => void };
export type SceneProps = { autoplay?: number; handle?: (api: SceneApi | null) => void };

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
    const text = sceneText();
    let ctx = gsap.context(() => {}, svg);
    let tl: gsap.core.Timeline | undefined, started = false;
    // Built on first use, not on mount: ten timelines at once would stall the dialog's wipe.
    const prime = () => {
      if (tl) return;
      ctx.add(() => {
        tl = gsap.timeline({ paused: true, defaults: { ease: EASE.out, duration: 0.4 } });
        build(makeFx(svg, tl, text));
        tl.progress(0);
        text.toStart();
      });
    };
    const play = () => { prime(); started = true; text.toStart(); tl!.restart(); };
    // A livery change drops a built timeline once it settles (it holds PALETTE's colours): the
    // scene is back at the markup's last frame, and its next play builds it in the new colours.
    const offPalette = onPalette(() => {
      if (!tl) return;
      ctx.revert();
      text.toEnd();
      tl = undefined;
      started = false;
      ctx = gsap.context(() => {}, svg);
    }, true);
    handle?.({ prime, play });
    const timer = autoplay === undefined ? 0 : window.setTimeout(play, autoplay * 1000);
    const offHover = replayOnHover(svg, '[data-tile]', () => { if (started && tl && finished(tl)) play(); });
    return () => {
      offPalette();
      clearTimeout(timer);
      handle?.(null);
      offHover();
      ctx.revert();
      text.toEnd();
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

/** A pill: an outlined chip, or a filled one. */
export const Pill = ({ x, y, w, text, tone = 'line' }: { x: number; y: number; w: number; text: string; tone?: 'line' | 'ac' | 'dim' }) => (
  <g>
    <rect x={x} y={y} width={w} height="12" rx="6" fill={tone === 'dim' ? DIM : 'none'} stroke={tone === 'ac' ? AC : tone === 'line' ? LINE : 'none'} />
    <text x={x + w / 2} y={y + 8.2} textAnchor="middle" {...t(5.8, tone === 'ac' ? INK : FG, 600)}>{text}</text>
  </g>
);
