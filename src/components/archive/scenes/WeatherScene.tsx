import { AC, DIM, FG, type Fx, INK, label, LINE, MUTE, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneProps, Win } from '../scene';

// Weather forecasting AI: the forecast map, and where it placed

const ISO = [
  'M60 100 C60 70 120 64 140 88 C160 112 134 146 100 142 C70 138 60 124 60 100 Z',
  'M74 102 C74 82 116 78 128 94 C140 110 122 132 100 130 C82 128 74 118 74 102 Z',
  'M88 104 C88 94 108 92 114 100 C120 108 112 118 102 118 C94 118 88 112 88 104 Z',
  'M30 60 C50 40 110 36 150 50 C180 60 190 90 186 120 C182 160 140 178 96 176 C50 174 26 150 26 112',
];

function buildWeather({ tl, q, qa, count, from, scramble }: Fx) {
  const iso = qa('[data-iso]');
  tl.fromTo(q('[data-map]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    // The pressure lines draw in, the storm cell last.
    .fromTo(iso, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut', stagger: 0.15 }, 0.2)
    .fromTo(qa('[data-stn]'), { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.07 }, 0.9)
    // The forecast: the cell moves on across the region.
    .fromTo(q('[data-cell]'), { x: -14, y: 8 }, { x: 0, y: 0, duration: 1.1, ease: 'power1.inOut' }, 1.0)
    .fromTo(q('[data-ml]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.2)
    // Where it placed.
    .fromTo(q('[data-board]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.6)
    .fromTo(qa('[data-place]'), { autoAlpha: 0, x: 6 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.1 }, 1.75)
    .fromTo(q('[data-ours]'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.4, ease: EASE.wipe }, 2.2);
  count(q('[data-teams]'), 0, 2.3, 0.9);
  const third = q('[data-third]');
  from(third, '');
  scramble(third, '', '3rd', 2.6, 0.35);
}

export function WeatherScene(p: SceneProps) {
  return (
    <Scene build={buildWeather} {...p}>
      <g data-map><Win x={14} y={14} w={188} h={172} title="FORECAST" /></g>
      {ISO.map((d, i) => i === 2
        ? <g key={d} data-cell><path data-iso d={d} stroke={AC} strokeWidth="1.2" /></g>
        : <path key={d} data-iso d={d} stroke={FG} strokeOpacity={0.28 - i * 0.04} strokeWidth="1" />)}
      {[[44, 150], [160, 70], [150, 150], [70, 56]].map(([x, y]) => <circle key={x} data-stn cx={x} cy={y} r="1.6" fill={MUTE} />)}
      <text data-ml x="24" y="176" {...label()}>ALIBABA CLOUD · ML</text>
      <g data-board><Win x={210} y={14} w={96} h={172} title="RESULTS" /></g>
      <rect data-ours x="214" y="78" width="88" height="16" rx="2" fill={DIM} />
      {['01', '02', '03'].map((n, i) => (
        <g key={n} data-place>
          <text x="220" y={49 + i * 20} {...t(6.6, i === 2 ? INK : MUTE, 700)}>{n}</text>
          <rect x="236" y={44.5 + i * 20} width={i === 2 ? 40 : 52 - i * 6} height="3" rx="1.5" fill={i === 2 ? FG : DIM} />
        </g>
      ))}
      <text x="220" y="114" {...t(6.6, MUTE)}>⋮</text>
      <line x1="210" y1="140" x2="306" y2="140" stroke={LINE} />
      <text data-teams x="220" y="156" {...label()}>OF 2,520 TEAMS</text>
      <text data-third x="296" y="176" textAnchor="end" {...t(14, INK, 700)}>3rd</text>
    </Scene>
  );
}
