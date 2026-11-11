// A few huge numbers: plain numbers count up from 0 as they enter; anything else ("<1", "2×") fades in.
import { useRef } from 'react';
import { gsap } from '../../motion';
import { countUp, useBlockMotion, type BlockProps } from './shared';

export function Stats({ block }: BlockProps<'stats'>) {
  const root = useRef<HTMLElement>(null);

  useBlockMotion(root, ({ qa, enter }) => {
    const undo = qa('[data-count]').map(el => {
      const st = enter(el, 'top 94%');
      const counted = countUp(el, { scrollTrigger: st });
      if (!counted) gsap.from(el, { autoAlpha: 0, y: 24, duration: 0.5, scrollTrigger: st });
      return counted;
    });
    return () => { for (const f of undo) f?.(); };
  });

  return (
    <section className="dt-block dt-sec dt-sec--stats pp-wrap" ref={root} aria-label="In numbers">
      <ul className="dt-stats">
        {block.stats.map(s => (
          <li key={s.label}>
            <b className="dt-stat-num pp-display"><span data-count>{s.value}</span>{s.unit && <small>{s.unit}</small>}</b>
            <span className="dt-stat-label pp-mono pp-dim">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
