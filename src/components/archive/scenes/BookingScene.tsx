import type { ReactNode } from 'react';
import { FG, type Fx, INK, label, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Pill, Scene, type SceneProps, Win } from '../scene';

// Booking concurrency fix: two writers claim one booking, the version check stops the second

const Step = ({ x, y, w, text, tone }: { x: number; y: number; w: number; text: string; tone?: 'ac' | 'dim' }) => <g data-step><Pill x={x} y={y} w={w} text={text} tone={tone ?? 'line'} /></g>;

function buildBooking({ tl, q, qa, type, count }: Fx) {
  const lane = (n: string) => ({ who: q(`[data-lane="${n}"] [data-who]`), steps: qa(`[data-lane="${n}"] [data-step]`), end: q(`[data-lane="${n}"] [data-end]`) });
  const a = lane('a'), b = lane('b'), r = lane('r');
  tl.fromTo(q('[data-win]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    // Both writers read version 7 at the same moment.
    .fromTo([a.who, b.who, a.steps[0], b.steps[0]], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.04 }, 0.3)
    // A writes version 8 first and is saved.
    .fromTo(a.steps[1], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.3 }, 0.75)
    .fromTo(a.end, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.95)
    // B's write of version 8 is stale: the lock turns it away.
    .fromTo(b.steps[1], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.3 }, 1.15)
    .to(b.steps[1], { keyframes: { x: [0, -2.5, 2.5, -1.5, 1.5, 0] }, duration: 0.35, ease: EASE.none }, 1.4);
  type(b.end, 1.45, 0.35);
  // It reads again and saves version 9.
  tl.fromTo([r.who, ...r.steps], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.15 }, 1.95)
    .fromTo(r.end, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.45)
    .fromTo(q('[data-pay]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 2.55);
  type(q('[data-paid]'), 2.7, 0.5);
  count(q('[data-tx]'), 0, 2.7, 0.9);
}

export function BookingScene(p: SceneProps) {
  const lane = (id: string, y: number, who: string, steps: ReactNode, end: ReactNode) => (
    <g data-lane={id}>
      <text data-who x="24" y={y + 8.2} {...label()}>{who}</text>
      {steps}
      {end}
    </g>
  );
  return (
    <Scene build={buildBooking} {...p}>
      <g data-win><Win x={14} y={14} w={292} h={124} title="booking #4821" right={<text x="296" y="26.2" textAnchor="end" {...label(INK)}>OPTIMISTIC LOCK</text>} /></g>
      {lane('a', 42, 'WRITER A', <><Step x={86} y={42} w={44} text="read v7" /><Step x={138} y={42} w={50} text="write v8" /></>,
        <text data-end x="296" y="50.2" textAnchor="end" {...t(6.4, FG, 700)}>saved ✓</text>)}
      {lane('b', 72, 'WRITER B', <><Step x={86} y={72} w={44} text="read v7" /><Step x={138} y={72} w={50} text="write v8" tone="ac" /></>,
        <text data-end x="296" y="80.2" textAnchor="end" {...t(6.4, INK, 700)}>version conflict</text>)}
      {lane('r', 102, 'RETRY', <><Step x={86} y={102} w={44} text="read v8" /><Step x={138} y={102} w={50} text="write v9" /></>,
        <text data-end x="296" y="110.2" textAnchor="end" {...t(6.4, FG, 700)}>saved ✓</text>)}
      <g data-pay>
        <Win x={14} y={146} w={292} h={40} />
        <text x="24" y="160" {...label()}>PAYOUT</text>
        <text data-paid x="24" y="175" {...t(7.2)}>Paid once, traceable</text>
        <text x="296" y="160" textAnchor="end" {...label()}>TRANSACTIONS</text>
        <text data-tx x="296" y="177" textAnchor="end" {...t(13, INK, 700)}>1,500+</text>
      </g>
    </Scene>
  );
}
