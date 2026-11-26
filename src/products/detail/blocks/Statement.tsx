// One big sentence that lights up word by word with the scroll, a paragraph beside it, and short points.
import { useId, useRef, type CSSProperties } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';

/** Three or four columns, whichever leaves the fuller last row: six points sit 3 + 3, not 4 + 2. */
const cols = (n: number) => { const full = (c: number) => (n % c || c) / c; return full(4) >= full(3) ? 4 : 3; };

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

export function Statement({ block }: BlockProps<'statement'>) {
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
    const points = qa('.dt-point');
    if (points[0]) gsap.from(points, { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.025, scrollTrigger: enter(points[0], 'top 94%') });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      <div className="dt-why">
        <p className="dt-why-head pp-lede">
          {words(block.head).map(w => (
            <span key={w.id}>
              <span className="dt-w">{w.parts.map(p => (p.acc ? <em key={p.id}>{p.text}</em> : <span key={p.id}>{p.text}</span>))}</span>{' '}
            </span>
          ))}
        </p>
        <p className="dt-why-body">{block.body}</p>
      </div>
      {block.points && block.points.length > 0 && (
        <ul className="dt-points" style={{ '--cols': cols(block.points.length) } as CSSProperties}>{block.points.map(p => <li className="dt-point" key={p}>{p}</li>)}</ul>
      )}
    </section>
  );
}
