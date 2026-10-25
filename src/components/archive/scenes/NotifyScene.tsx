import { PALETTE } from '@/art/palette';
import { AC, CARBON, Cursor, DIM, FG, type Fx, INK, label, LINE, MUTE, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Pill, Scene, type SceneProps, Win } from '../scene';

// In-platform notifications: one update, sent once, lights up 500+ partners

const COLS = 26, ROWS = 20;
const DOTS = Array.from({ length: COLS * ROWS }, (_, i) => ({ x: 161 + (i % COLS) * 5.4, y: 44 + Math.floor(i / COLS) * 5.4 }));

function buildNotify({ tl, q, qa, type, count, click }: Fx) {
  const cur = q('[data-pointer]'), dots = qa('[data-dot]');
  tl.fromTo(q('[data-comp]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(q('[data-grid]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0.12);
  type(q('[data-title]'), 0.3, 0.6);
  tl.fromTo(cur, { autoAlpha: 0, x: 150, y: 200 }, { autoAlpha: 1, x: 74, y: 156, duration: 0.45, ease: 'power2.inOut' }, 0.95);
  click(cur, 1.42);
  tl.to(q('[data-send]'), { scale: 0.96, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, 1.44)
    // The update fans out across the partner grid from the side it was sent from.
    .fromTo(dots, { fill: PALETTE.fg, opacity: 0.16 }, { fill: PALETTE.ac, opacity: 1, duration: 0.38, stagger: { each: 0.042, grid: [ROWS, COLS], from: 10 * COLS } }, 1.56)
    .to(cur, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 1.7);
  count(q('[data-reach]'), 0, 1.56, 1.3);
  type(q('[data-status]'), 2.9, 0.3);
}

export function NotifyScene(p: SceneProps) {
  return (
    <Scene build={buildNotify} {...p}>
      <g data-comp>
        <Win x={14} y={14} w={130} h={172} title="NEW UPDATE" />
        <rect x="24" y="42" width="110" height="44" rx="2" fill={CARBON} stroke={LINE} />
        <path d="M34 78 L50 60 L62 72 L70 64 L86 78 Z" fill={DIM} />
        <circle cx="76" cy="54" r="4" fill={DIM} />
        <text x="128" y="82" textAnchor="end" {...label()}>CLOUDFRONT</text>
        <text data-title x="24" y="100" {...t(7.2, FG, 700)}>Partner CSV export</text>
        <rect x="24" y="106" width="96" height="3" rx="1.5" fill={DIM} />
        <rect x="24" y="113" width="74" height="3" rx="1.5" fill={DIM} />
        <text x="24" y="132.5" {...t(6, MUTE)}>To</text>
        <Pill x={38} y={124.5} w={62} text="All partners" />
        <g data-send>
          <rect x="24" y="148" width="110" height="15" rx="2" fill={AC} />
          <text x="79" y="158" textAnchor="middle" {...t(6.6, CARBON, 700)} letterSpacing="0.8">SEND</text>
        </g>
        <text data-status x="24" y="178" {...t(6, MUTE)}>Delivered ✓</text>
      </g>
      <g data-grid>
        <Win x={152} y={14} w={154} h={172} title="PARTNERS" />
        {DOTS.map(d => <circle key={`${d.x} ${d.y}`} data-dot cx={d.x} cy={d.y} r="1.25" fill={AC} />)}
        <line x1="152" y1="156" x2="306" y2="156" stroke={LINE} />
        <text x="162" y="174" {...label()}>REACHED</text>
        <text data-reach x="296" y="176" textAnchor="end" {...t(14, INK, 700)}>500+</text>
      </g>
      <Cursor />
    </Scene>
  );
}
