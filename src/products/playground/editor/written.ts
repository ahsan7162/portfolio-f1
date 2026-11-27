// Blocks written in the playground: their TSX, their CSS, and the props a new copy on the page starts with.
import type { Source } from '../protocol';

export interface WrittenBlock extends Source {
  /** The props a new copy starts with, as a literal (read with parse(), never run). */
  props: string;
}

export function starter(name: string): WrittenBlock {
  return {
    name,
    code: `// ${name}: a block written in the playground. It is given \`block\` (its data is block.props) and \`product\`.
// It can import react, the motion and format helpers, the block helpers in ../shared and ../MediaView, and its
// own CSS. Saved, it becomes src/products/detail/blocks/saved/${name}.tsx.
import { useId, useRef } from 'react';
import { gsap, MOTION } from '../../../motion';
import { Label, useBlockMotion, type BlockProps } from '../shared';
import './${name}.css';

type Plan = { name: string; price: string; points: string[]; pick?: boolean };

export function ${name}({ block }: BlockProps<'custom'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const plans = (block.props.plans ?? []) as Plan[];

  // entrances play once as the block comes into view; with reduced motion it is simply drawn
  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.cx-plans');
    if (grid) gsap.from(qa('.cx-plan'), { y: 28, autoAlpha: 0, duration: MOTION.enter, stagger: MOTION.stagger, scrollTrigger: enter(grid) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      <ul className="cx-plans">
        {plans.map(p => (
          <li key={p.name} className="cx-plan" data-pick={p.pick ? '' : undefined}>
            <h3 className="pp-lede">{p.name}</h3>
            <p className="pp-display cx-price">{p.price}</p>
            <ul className="cx-points">{p.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
`,
    css: `/* ${name}: every value comes from tokens.css, so the block sits with the rest of the page in any product's colour. */
.cx-plans { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: var(--gap-track); margin-top: var(--flow-label); }
.cx-plan { display: grid; gap: var(--sp-16); align-content: start; padding: var(--sp-24); border-radius: var(--r-14); box-shadow: inset 0 0 0 var(--stroke) var(--line); }
.cx-plan[data-pick] { background: var(--acc); color: var(--on-acc); box-shadow: none; }
.cx-price { font-size: clamp(56px, 7vw, 104px); }
.cx-points { list-style: none; display: grid; gap: var(--sp-8); font-size: var(--fs-15); }
`,
    props: `{
  plans: [
    { name: 'Solo', price: '$0', points: ['One repository', 'Notes on this machine'] },
    { name: 'Team', price: '$8', points: ['Every repository', 'Shared notes', 'Search across the team'], pick: true },
  ],
}`,
  };
}
