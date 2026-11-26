// A wall of names: what it works with, what it supports, what it can draw.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Chips({ block }: BlockProps<'chips'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-chips');
    if (list) gsap.from(qa('.bc-chip'), { y: 8, autoAlpha: 0, duration: 0.35, ease: 'power3.out', stagger: 0.03, scrollTrigger: enter(list) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      {block.note && <p className="bc-note">{block.note}</p>}
      <ul className="bc-chips">
        {block.items.map(item => <li key={item} className="bc-chip pp-lede">{item}</li>)}
      </ul>
    </section>
  );
}
