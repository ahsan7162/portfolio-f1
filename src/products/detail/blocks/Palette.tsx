// The product's own colours as tall swatches (click one to copy its hex) and its typefaces as
// specimens. Each swatch takes black or bone text by its own luminance, via brandVars.
import { useId, useRef, useState } from 'react';
import { brandVars } from '../../brand';
import { gsap } from '../../motion';
import { Label, SwapLabel, useBlockMotion, useCopy, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Palette({ block, n }: BlockProps<'palette'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [copied, copy] = useCopy();
  const [which, setWhich] = useState('');

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-swatches');
    if (list) {
      // Clip the inner fill, not the button, so the focus ring is never clipped.
      gsap.fromTo(qa('.bc-swatch-fill'), { clipPath: 'inset(94% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.out', stagger: 0.05, clearProps: 'clipPath', scrollTrigger: enter(list, 'top 82%'),
      });
    }
    const faces = q('.bc-faces');
    if (faces) gsap.from(qa('.bc-face'), { y: 28, autoAlpha: 0, duration: 0.5, stagger: 0.05, scrollTrigger: enter(faces, 'top 92%') });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <ul className="bc-swatches">
        {block.colours.map(c => {
          const done = copied && which === c.hex;
          return (
            <li key={c.hex + c.name}>
              <button
                type="button"
                className="bc-swatch"
                style={brandVars(c.hex)}
                aria-label={`${c.name}, ${c.hex}. Copy hex`}
                onClick={() => { setWhich(c.hex); copy(c.hex); }}
              >
                <span className="bc-swatch-fill pp-mono">
                  <span className="bc-swatch-name">{c.name}</span>
                  <span className="bc-swatch-hex"><SwapLabel on={done} off={c.hex} onText="Copied" /></span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <span className="pp-sr" role="status">{copied ? `${which} copied` : ''}</span>
      {block.faces && (
        <ul className="bc-faces">
          {block.faces.map(f => (
            <li key={f.name} className="bc-face">
              <span className="pp-mono pp-dim">{f.name}</span>
              <span className="bc-face-sample">{f.sample}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
