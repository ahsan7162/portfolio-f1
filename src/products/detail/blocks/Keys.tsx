// Keyboard shortcuts as rows: keycaps on the left, what they do on the right. The rows rise,
// then each keycap does one soft press in turn. The caps are <kbd>, decorative, never buttons.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';

export function Keys({ block, n }: BlockProps<'keys'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.dt-keys');
    if (!list) return;
    gsap.timeline({ scrollTrigger: enter(list, 'top 88%') })
      .from(qa('.dt-keys-row'), { y: 28, autoAlpha: 0, duration: 0.45, stagger: 0.04 })
      .to(qa('.dt-key-face'), { yPercent: 9, duration: 0.09, ease: 'power2.in', yoyo: true, repeat: 1, stagger: 0.04 }, 0.3);
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.note && <p className="dt-keys-note">{block.note}</p>}
      <ul className="dt-keys">
        {block.keys.map(k => (
          <li key={k.does} className="dt-keys-row">
            <span className="dt-keys-caps">
              {k.keys.map(key => <kbd key={key} className="dt-key"><span className="dt-key-face">{key}</span></kbd>)}
            </span>
            <span className="dt-keys-does">{k.does}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
