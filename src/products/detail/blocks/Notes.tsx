// The honest small print: limits and things to know before installing. A warning carries the product's colour.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Notes({ block, n }: BlockProps<'notes'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-notes');
    if (list) gsap.from(qa('.bc-note-item'), { y: 28, autoAlpha: 0, duration: 0.5, stagger: 0.05, scrollTrigger: enter(list) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <ul className="bc-notes">
        {block.items.map(it => (
          <li key={it.title} className="bc-note-item" data-warn={it.warn ? '' : undefined}>
            <p className="bc-note-kind pp-mono">{it.warn ? 'Heads up' : 'Note'}</p>
            <h3 className="bc-note-title pp-lede">{it.title}</h3>
            <p className="bc-note-body">{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
