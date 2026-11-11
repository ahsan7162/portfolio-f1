// A short sequence as connected nodes: they rise in turn and the connectors draw between them.
import { useId, useRef, type CSSProperties } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';

export function Steps({ block, n }: BlockProps<'steps'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  // The middle node is the highlighted one (with three steps, the product's own part).
  const mid = Math.floor((block.steps.length - 1) / 2);

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.dt-how');
    if (!list) return;
    const tl = gsap.timeline({ scrollTrigger: enter(list, 'top 88%') });
    for (const el of qa('.dt-node, .dt-conn')) {
      if (el.classList.contains('dt-node')) tl.from(el, { y: 36, autoAlpha: 0, duration: 0.45 }, '-=0.3');
      // px insets past the line's box, so the arrowhead (which overhangs the 1.5px line) is not clipped.
      else tl.fromTo(el, { clipPath: 'inset(-8px 64px 64px -8px)' }, { clipPath: 'inset(-8px -8px -8px -8px)', duration: 0.25, ease: 'power2.out' }, '-=0.15');
    }
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <ol className="dt-how" style={{ '--steps': block.steps.length } as CSSProperties}>
        {block.steps.map((s, i) => (
          <li key={s.title} className="dt-how-item">
            {i > 0 && <span className="dt-conn" aria-hidden="true" />}
            <div className={`dt-node${i === mid && block.steps.length > 1 ? ' dt-node--mid' : ''}`}>
              <span className="pp-mono pp-dim">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
