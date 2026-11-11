// A grid of mixed tiles: huge numbers, short claims and cropped screens. The tiles rise in a
// stagger and the numbers count up. Placement comes from layoutBento, so no count leaves a hole.
import { useId, useRef, type CSSProperties } from 'react';
import { gsap } from '../../motion';
import { layoutBento, type Place } from './bentoLayout';
import { MediaView } from './MediaView';
import { countUp, Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

const area = (p: Place) => ({ col: `${p.col + 1} / span ${p.w}`, row: `${p.row + 1} / span ${p.h}` });

export function Bento({ block, product, n }: BlockProps<'bento'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const kinds = block.tiles.map(t => t.kind);
  const three = layoutBento(kinds, 3);
  const two = layoutBento(kinds, 2);

  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.bv-bento');
    if (!grid) return;
    gsap.from(qa('.bv-tile'), { y: 40, autoAlpha: 0, duration: 0.55, stagger: 0.05, scrollTrigger: enter(grid, 'top 88%') });
    const undo = qa('[data-count]').map(el => countUp(el, { scrollTrigger: enter(grid, 'top 88%') }));
    return () => { for (const f of undo) f?.(); };
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <ul className="bv-bento">
        {block.tiles.map((t, i) => {
          const a3 = area(three[i]);
          const a2 = area(two[i]);
          const style = { '--c3': a3.col, '--r3': a3.row, '--c2': a2.col, '--r2': a2.row } as CSSProperties;
          const key = t.kind === 'number' ? `n${t.label}` : t.kind === 'text' ? `t${t.title}` : `m${i}`;
          return (
            <li key={key} className={`bv-tile bv-tile--${t.kind}`} style={style}>
              {t.kind === 'number' && (
                <>
                  <b className="bv-tile-num pp-display"><span data-count>{t.value}</span>{t.unit && <small>{t.unit}</small>}</b>
                  <span className="bv-tile-label pp-mono pp-dim">{t.label}</span>
                </>
              )}
              {t.kind === 'text' && (
                <>
                  <h3 className="bv-tile-title pp-lede">{t.title}</h3>
                  <p className="bv-tile-body">{t.body}</p>
                </>
              )}
              {t.kind === 'media' && (
                <>
                  {t.caption && <span className="bv-tile-cap pp-mono">{t.caption}</span>}
                  <MediaView media={t.media} product={product} className="bv-tile-media" />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
