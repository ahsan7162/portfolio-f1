import { PALETTE } from '@/art/palette';
import { AC, DIM, FG, type Fx, INK, label, MUTE, PANEL, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneProps, Win } from '../scene';

// Azure telemetry and dashboards: an alert fires, the trace points at the cause

const SPANS = [
  { name: 'gateway', x: 96, w: 200 },
  { name: 'auth', x: 100, w: 10 },
  { name: 'catalog-api', x: 112, w: 24 },
  { name: 'sql · select assets', x: 138, w: 150, hot: true },
  { name: 'render', x: 289, w: 7 },
];

function buildTelemetry({ tl, q, qa, from, type, scramble }: Fx) {
  const names = qa('[data-sname]'), bars = qa('[data-sbar]'), hot = SPANS.findIndex(sp => sp.hot);
  tl.fromTo(q('[data-trace]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(names, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.05 }, 0.2)
    // The request runs: the gateway span stays open while each call inside it starts after the last.
    .fromTo(bars[0], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1.7, ease: EASE.none }, 0.35)
    .fromTo(bars[1], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.08, ease: EASE.none }, 0.37)
    .fromTo(bars[2], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.2, ease: EASE.none }, 0.47)
    // One query runs long, and turns red as it does.
    .fromTo(bars[hot], { scaleX: 0, fill: DIM, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1.3, ease: EASE.none }, 0.69)
    .to(bars[hot], { fill: PALETTE.ac, duration: 0.3 }, 1.2)
    .fromTo(names[hot], { fill: PALETTE.mute }, { fill: PALETTE.ac2, duration: 0.3 }, 1.2)
    .fromTo(bars[4], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.06, ease: EASE.none }, 1.99)
    // Azure Monitor flags it.
    .fromTo(q('[data-alert]'), { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.35 }, 1.35)
    .fromTo(q('[data-pulse]'), { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.8, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 1.5);
  const slow = q('[data-slow]');
  from(slow, '');
  scramble(slow, '', 'SLOW REQUEST', 1.4, 0.4);
  // The cause, found in the trace.
  tl.fromTo(q('[data-cause]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.2);
  type(q('[data-why]'), 2.3, 0.45);
  const less = q('[data-less]');
  from(less, '');
  scramble(less, '', 'TROUBLESHOOTING −30%', 2.85, 0.5);
}

export function TelemetryScene(p: SceneProps) {
  return (
    <Scene build={buildTelemetry} {...p}>
      <g data-trace><Win x={14} y={14} w={292} h={118} title="TRACE · GET /catalog" right={<text data-slow x="296" y="26.2" textAnchor="end" {...label(INK)}>SLOW REQUEST</text>} /></g>
      {SPANS.map((sp, i) => (
        <g key={sp.name}>
          <text data-sname x="24" y={46 + i * 18} {...t(6.2, sp.hot ? INK : MUTE, sp.hot ? 700 : undefined)}>{sp.name}</text>
          <rect data-sbar x={sp.x} y={40 + i * 18} width={sp.w} height="8" rx="1" fill={sp.hot ? AC : DIM} />
        </g>
      ))}
      <g data-alert>
        <rect x="164" y="142" width="142" height="44" rx="4" fill={PANEL} stroke={AC} />
        <circle data-pulse cx="176" cy="156" r="2.4" fill={AC} />
        <text x="184" y="158.4" {...t(6.8, FG, 700)}>Alert · latency anomaly</text>
        <text x="174" y="176" {...label()}>AZURE MONITOR</text>
      </g>
      <text data-cause x="24" y="152" {...label()}>ROOT CAUSE</text>
      <text data-why x="24" y="166" {...t(7)}>Slow SQL query</text>
      <text data-less x="24" y="180" {...label(INK)}>TROUBLESHOOTING −30%</text>
    </Scene>
  );
}
