// Two or three screens fanned out like cards on a soft light in the product's colour. The fan is the
// CSS final state on each card (translate/rotate/scale); the scrubbed scroll moves an inner wrapper
// from a tight stack back to nothing, so reduced motion simply shows the fan. (GSAP would fold the
// card's own translate/rotate into its transform, so it never touches the card itself.)
import { useId, useRef, type CSSProperties } from 'react';
import { gsap } from '../../motion';
import { MediaView } from './MediaView';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

/** Each card's place in the fan: -1 left, 0 centre, 1 right (two cards sit at ±0.5). */
const slots = (count: number) => (count >= 3 ? [-1, 0, 1] : count === 2 ? [-0.5, 0.5] : [0]);

export function Showcase({ block, product, n }: BlockProps<'showcase'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const media = block.media.slice(0, 3);
  const at = slots(media.length);

  useBlockMotion(root, ({ q, qa }) => {
    const stage = q('.bv-show-stage');
    if (!stage) return;
    const cards = qa('.bv-card-in');
    const tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 90%', end: 'center 50%', scrub: true } });
    cards.forEach((card, i) => {
      const s = at[i] ?? 0;
      // Undo the fan: pull each card back over the centre, upright. xPercent is % of the card's width, as --fx is.
      const fx = Number.parseFloat(getComputedStyle(card).getPropertyValue('--fx')) || 0;
      tl.fromTo(card, { xPercent: -fx * s, rotation: -6 * s, y: 40 }, { xPercent: 0, rotation: 0, y: 0, ease: 'power2.out' }, 0);
    });
    tl.fromTo(q('.bv-show-light'), { opacity: 0.3, scale: 0.7 }, { opacity: 1, scale: 1, ease: 'none' }, 0);
  });

  return (
    <section className="dt-block dt-sec pp-wrap bv-show" ref={root} aria-labelledby={block.label ? id : undefined} aria-label={block.label ? undefined : 'Showcase'}>
      {block.label && <Label n={n} id={id}>{block.label}</Label>}
      <div className={`bv-show-stage bv-show-stage--${product.kind}`}>
        <span className="bv-show-light" aria-hidden="true" />
        {media.map((m, i) => {
          const s = at[i] ?? 0;
          return (
            <div key={'src' in m ? m.src : `s${i}`} className={`bv-card${s === 0 ? ' bv-card--front' : ''}`} style={{ '--s': s, '--z': 3 - Math.abs(s) * 2 } as CSSProperties}>
              <div className="bv-card-in"><MediaView media={m} product={product} className="bv-card-frame" /></div>
            </div>
          );
        })}
      </div>
      {block.caption && <p className="bv-show-cap pp-mono pp-dim">{block.caption}</p>}
    </section>
  );
}
