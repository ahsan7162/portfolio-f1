// One big sentence that lights up word by word with the scroll, a paragraph beside it, and short points.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';

/** The sentence as words; `*starred*` runs (even mid-word, e.g. "*fast*,") are marked for the accent. */
function words(head: string) {
  let acc = false;
  return head.split(/\s+/).filter(Boolean).map((tok, i) => ({
    id: `${i}${tok}`,
    parts: tok.split('*').map((text, j) => {
      if (j > 0) acc = !acc;
      return { text, acc, id: `${j}` };
    }).filter(p => p.text),
  }));
}

export function Statement({ block, n }: BlockProps<'statement'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const head = q('.dt-why-head');
    if (head) {
      gsap.fromTo(qa('.dt-w'), { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: head, start: 'top 82%', end: 'bottom 48%', scrub: true },
      });
    }
    const body = q('.dt-why-body');
    if (body) gsap.from(body, { y: 24, autoAlpha: 0, duration: 0.5, scrollTrigger: enter(body) });
    const chips = qa('.dt-chip');
    if (chips[0]) gsap.from(chips, { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.025, scrollTrigger: enter(chips[0], 'top 94%') });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <div className="dt-why">
        <p className="dt-why-head">
          {words(block.head).map(w => (
            <span key={w.id}>
              <span className="dt-w">{w.parts.map(p => (p.acc ? <em key={p.id}>{p.text}</em> : <span key={p.id}>{p.text}</span>))}</span>{' '}
            </span>
          ))}
        </p>
        <p className="dt-why-body">{block.body}</p>
      </div>
      {block.points && block.points.length > 0 && (
        <ul className="dt-chips">{block.points.map(p => <li className="dt-chip" key={p}>{p}</li>)}</ul>
      )}
    </section>
  );
}
