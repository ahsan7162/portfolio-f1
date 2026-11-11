// Scores as ring gauges: the ring fills to value / max and the number counts up in its centre.
// The markup is the final state (dashoffset set); motion only tweens from empty.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { countUp, Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

const part = (value: number, max: number) => (max > 0 ? Math.min(1, Math.max(0, value / max)) : 0);
// Real circumference, not pathLength: Chrome does not scale CSS dash values by pathLength.
const C = 2 * Math.PI * 46;

export function Scores({ block, n }: BlockProps<'scores'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-scores');
    if (!list) return;
    const st = enter(list, 'top 82%');
    gsap.from(qa('.bc-ring-fill'), { strokeDashoffset: C, duration: 0.9, ease: 'power3.out', stagger: 0.06, scrollTrigger: st });
    const undo = qa('.bc-score-num').map((el, i) => countUp(el, { delay: i * 0.06, scrollTrigger: st }));
    return () => { for (const f of undo) f?.(); };
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.note && <p className="bc-note">{block.note}</p>}
      <ul className="bc-scores">
        {block.scores.map(s => (
          <li key={s.label} className="bc-score">
            <span className="pp-sr">{`${s.label}: ${s.value} out of ${s.max}`}</span>
            <span className="bc-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle className="bc-ring-track" cx="50" cy="50" r="46" />
                <circle className="bc-ring-fill" cx="50" cy="50" r="46" strokeDasharray={C} strokeDashoffset={C * (1 - part(s.value, s.max))} />
              </svg>
              <b className="bc-score-num pp-display">{s.value}</b>
            </span>
            <span className="bc-score-label pp-mono pp-dim" aria-hidden="true">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
