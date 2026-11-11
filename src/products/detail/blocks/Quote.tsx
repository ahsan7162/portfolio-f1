// One large pull quote: a huge opening mark in the accent, the words set large, who said it in mono.
// The lines rise out of masks as it enters.
import { useRef } from 'react';
import { gsap, SplitText } from '../../motion';
import { useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Quote({ block }: BlockProps<'quote'>) {
  const root = useRef<HTMLElement>(null);

  useBlockMotion(root, ({ q, enter }) => {
    const text = q('.bc-quote-text');
    const fig = q('.bc-quote');
    if (!text || !fig) return;
    gsap.from(q('.bc-quote-mark'), { yPercent: 30, autoAlpha: 0, duration: 0.6, scrollTrigger: enter(fig, 'top 88%') });
    gsap.from(q('.bc-quote-by'), { autoAlpha: 0, y: 16, duration: 0.45, scrollTrigger: enter(fig, 'top 88%') });
    SplitText.create(text, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      aria: 'none',
      onSplit: self => gsap.from(self.lines, { yPercent: 110, duration: 0.6, stagger: 0.06, scrollTrigger: enter(fig, 'top 88%') }),
    });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-label="Quote">
      <figure className="bc-quote">
        <span className="bc-quote-mark pp-display" aria-hidden="true">“</span>
        <blockquote><p className="bc-quote-text pp-lede">{block.text}</p></blockquote>
        {(block.by || block.role) && (
          <figcaption className="bc-quote-by pp-mono">
            {block.by && <span>{block.by}</span>}
            {block.role && <span className="pp-dim">{block.role}</span>}
          </figcaption>
        )}
      </figure>
    </section>
  );
}
