// What the product does, as a grid split by hairlines: an index, a title and one sentence each.
import { useId, useRef } from 'react';
import { pad } from '../../format';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';

export function Features({ block, n }: BlockProps<'features'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.dt-feats');
    if (!grid) return;
    gsap.timeline({ scrollTrigger: enter(grid, 'top 88%') })
      .from(qa('.dt-feat-rule'), { scaleX: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04 })
      .from(qa('.dt-feat-in'), { y: 32, autoAlpha: 0, duration: 0.5, stagger: 0.05 }, 0.05);
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <ul className="dt-feats">
        {block.items.map((f, i) => (
          <li key={f.title} className="dt-feat">
            <span className="dt-feat-rule" aria-hidden="true" />
            <div className="dt-feat-in">
              <span className="dt-feat-n pp-mono">{pad(i + 1)}</span>
              <h3 className="dt-feat-title pp-lede">{f.title}</h3>
              <p className="dt-feat-body">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
