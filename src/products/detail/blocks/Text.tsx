// Plain paragraphs under an optional label and heading, in a readable measure; the lines fade up.
import { useId, useRef } from 'react';
import { gsap, SplitText } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';

export function Text({ block, n }: BlockProps<'text'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ qa, enter }) => {
    for (const el of qa('.dt-text-head, .dt-text-body p')) {
      SplitText.create(el, {
        type: 'lines',
        autoSplit: true,
        // A lines-only split keeps the words whole and readable; no aria-label on a <p>.
        aria: 'none',
        onSplit: self => gsap.from(self.lines, { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.04, scrollTrigger: enter(el, 'top 92%') }),
      });
    }
  });

  // With a label, the label is the section's heading and `head` sits under it; without one, `head` is.
  const Head = block.label ? 'h3' : 'h2';
  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={block.label || block.head ? id : undefined}>
      {block.label && <Label n={n} id={id}>{block.label}</Label>}
      <div className={`dt-text${block.label ? ' dt-text--labelled' : ''}`}>
        {block.head && <Head className="dt-text-head" id={block.label ? undefined : id}>{block.head}</Head>}
        <div className="dt-text-body">{block.body.map(p => <p key={p}>{p}</p>)}</div>
      </div>
    </section>
  );
}
