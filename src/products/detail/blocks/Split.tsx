// A screen on one side, words on the other. The screen slides in from its side and settles; the words rise.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { MediaView } from './MediaView';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

export function Split({ block, product, n }: BlockProps<'split'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const dir = block.side === 'left' ? -1 : 1;

  useBlockMotion(root, ({ q, qa, enter }) => {
    const media = q('.bv-split-media');
    if (media) gsap.from(media, { xPercent: 14 * dir, rotation: 5 * dir, autoAlpha: 0, duration: 0.75, ease: 'expo.out', scrollTrigger: enter(media, 'top 88%') });
    const words = qa('.bv-split-words > *');
    if (words[0]) gsap.from(words, { y: 28, autoAlpha: 0, duration: 0.5, stagger: 0.05, scrollTrigger: enter(words[0], 'top 92%') });
  });

  // With a label, the label is the section's heading; a split without one continues the run above it.
  const Head = block.label ? 'h3' : 'h2';
  return (
    <section className={`dt-block dt-sec pp-wrap bv-split bv-split--${block.side}${block.label ? '' : ' bv-split--cont'}`} ref={root} aria-labelledby={id}>
      {block.label && <Label n={n} id={id}>{block.label}</Label>}
      <div className="bv-split-grid">
        <div className="bv-split-media"><MediaView media={block.media} product={product} className="bv-split-frame" /></div>
        <div className="bv-split-words">
          <Head className="bv-split-head pp-lede" id={block.label ? undefined : id}>{block.head}</Head>
          <p className="bv-split-body">{block.body}</p>
          {block.points && block.points.length > 0 && <ul className="bv-points">{block.points.map(p => <li key={p}>{p}</li>)}</ul>}
        </div>
      </div>
    </section>
  );
}
