import { PALETTE } from '@/art/palette';
import { AC, CARBON, clear, Cursor, DIM, FG, type Fx, INK, label, LINE, MUTE, PANEL, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { LoopingScene } from '../LoopingScene';

// Dineout partner operations dashboard: bookings arrive live, export a CSV, support chats fade away

const ROWS = [
  { time: '20:45', what: 'Table for 2', tag: 'BOOKED' },
  { time: '20:40', what: 'Walk-in, 3 guests', tag: 'WALK-IN' },
  { time: '20:30', what: 'Table for 4', tag: 'BOOKED' },
  { time: '20:15', what: 'Table for 6', tag: 'BOOKED' },
];

function buildOps({ tl, q, qa, count, scramble, from, click }: Fx) {
  const cur = q('[data-pointer]'), rows = qa('[data-row]'), flash = qa('[data-flash]'), exp = q('[data-exp]');
  const A = 0.6, B = 1.6;
  tl.fromTo(q('[data-dash]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(q('[data-dot]'), { opacity: 1 }, { opacity: 0.25, duration: 0.5, repeat: 9, yoyo: true, ease: 'sine.inOut' }, 0)
    // A walk-in arrives, then a booking: older rows slide down, the new one lands on top.
    .fromTo(rows.slice(2), { y: -36 }, { y: -18, duration: 0.4 }, A)
    .fromTo(rows[1], { autoAlpha: 0, x: -6, y: -18 }, { autoAlpha: 1, x: 0, duration: 0.4 }, A)
    .fromTo(flash[1], { opacity: 0.35 }, { opacity: 0, duration: 0.9, ease: EASE.in }, A + 0.1)
    .to(rows.slice(1), { y: 0, duration: 0.4 }, B)
    .fromTo(rows[0], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.4 }, B)
    .fromTo(flash[0], { opacity: 0.35 }, { opacity: 0, duration: 0.9, ease: EASE.in }, B + 0.1);
  count(q('[data-wi]'), 95, A, 0.4);
  count(q('[data-bk]'), 1283, B, 0.4);
  // Export: the button flashes and a CSV file pops out.
  tl.fromTo(cur, { autoAlpha: 0, x: 300, y: 196 }, { autoAlpha: 1, x: 252, y: 60, duration: 0.5, ease: 'power2.inOut' }, 2.3);
  click(cur, 2.85);
  tl.fromTo(exp.querySelector('rect'), { fill: clear(PALETTE.ac) }, { fill: PALETTE.ac, duration: 0.1, yoyo: true, repeat: 1, repeatDelay: 0.15 }, 2.9)
    .to(exp.querySelector('text'), { fill: PALETTE.carbon, duration: 0.1, yoyo: true, repeat: 1, repeatDelay: 0.15 }, 2.9)
    .fromTo(q('[data-file]'), { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: -20, duration: 0.35 }, 2.95)
    .to(q('[data-file]'), { autoAlpha: 0, duration: 0.25, ease: EASE.in }, 3.55)
    .to(cur, { autoAlpha: 0, duration: 0.2 }, 3.3)
    // Support chats: the pile shrinks to one.
    .fromTo(qa('[data-bub]').slice(1), { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.5, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.08, ease: EASE.in }, 3.6);
  const sup = q('[data-sup]');
  from(sup, '500+');
  scramble(sup, '500+', '<20', 3.7, 0.5);
}

export function OpsScene() {
  return (
    <LoopingScene build={buildOps}>
      <g data-dash>
        <rect x="14" y="16" width="292" height="168" rx="4" fill={PANEL} stroke={LINE} />
        <text x="26" y="33" {...label()}>BOOKINGS TODAY</text>
        <circle data-dot cx="272" cy="31" r="2.2" fill={AC} />
        <text x="296" y="33" textAnchor="end" {...label(INK)}>LIVE</text>

        <rect x="24" y="42" width="84" height="32" rx="2" fill={CARBON} stroke={LINE} />
        <text x="32" y="53" {...label()}>BOOKINGS</text>
        <text data-bk x="32" y="67" {...t(11, FG, 700)}>1,284</text>
        <rect x="114" y="42" width="84" height="32" rx="2" fill={CARBON} stroke={LINE} />
        <text x="122" y="53" {...label()}>WALK-INS</text>
        <text data-wi x="122" y="67" {...t(11, FG, 700)}>96</text>
        <g data-exp>
          <rect x="204" y="42" width="92" height="32" rx="2" fill="transparent" stroke={AC} />
          <text x="250" y="60.5" textAnchor="middle" {...t(7, INK, 700)} letterSpacing="0.6">EXPORT CSV</text>
        </g>

        {ROWS.map((r, i) => {
          const top = 82 + i * 18, walk = r.tag === 'WALK-IN';
          return (
            <g key={r.time} data-row>
              <rect data-flash x="24" y={top} width="272" height="16" rx="2" fill={AC} opacity="0" />
              <text x="32" y={top + 10.5} {...t(6.5, MUTE)}>{r.time}</text>
              <text x="64" y={top + 10.5} {...t(7)}>{r.what}</text>
              <rect x="246" y={top + 3.5} width="44" height="9" rx="4.5" fill={walk ? 'none' : DIM} stroke={walk ? AC : 'none'} strokeWidth="0.8" />
              <text x="268" y={top + 10} textAnchor="middle" {...t(5, walk ? INK : FG, 700)}>{r.tag}</text>
            </g>
          );
        })}

        <line x1="24" y1="160" x2="296" y2="160" stroke={LINE} />
        <text x="26" y="175" {...label()}>SUPPORT CHATS</text>
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} data-bub opacity={i ? 0 : 1} transform={`translate(${104 + i * 13} 167)`}>
            <rect width="10" height="7" rx="2" fill={i ? DIM : MUTE} />
            <path d="M2 7 L2 9.5 L4.5 7 Z" fill={i ? DIM : MUTE} />
          </g>
        ))}
        <text data-sup x="296" y="176" textAnchor="end" {...t(9, INK, 700)}>&lt;20</text>
      </g>
      <g data-file opacity="0" transform="translate(244 48)">
        <path d="M0 0 H9 L13 4 V16 H0 Z" fill={FG} />
        <text x="6.5" y="12" textAnchor="middle" {...t(3.8, CARBON, 700)}>CSV</text>
      </g>
      <Cursor />
    </LoopingScene>
  );
}
