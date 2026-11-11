// Plain facts as rows: what it needs, what it costs, where its data comes from.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Specs({ block, n }: BlockProps<'specs'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-specs');
    if (list) gsap.from(qa('.bc-spec'), { y: 24, autoAlpha: 0, duration: 0.45, stagger: 0.04, scrollTrigger: enter(list) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <dl className="bc-specs">
        {block.rows.map(r => (
          <div key={r.name} className="bc-spec">
            <dt className="bc-spec-name pp-mono">{r.name}</dt>
            <dd className="bc-spec-value">
              <span className="pp-lede">{r.value}</span>
              {r.note && <span className="bc-spec-note">{r.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
