// Events in order along a line: across the page on a wide screen, down the left on a narrow one.
// The line draws from its start (scale from 0 with a top-left origin works for both directions),
// then the events rise in turn.
import { useId, useRef, type CSSProperties } from 'react';
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Timeline({ block, n }: BlockProps<'timeline'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-tl');
    if (!list) return;
    gsap.timeline({ scrollTrigger: enter(list, 'top 82%') })
      .from(q('.bc-tl-line'), { scale: 0, duration: 0.7, ease: 'expo.out' })
      .from(qa('.bc-tl-dot'), { scale: 0, duration: 0.35, ease: 'back.out(2.4)', stagger: 0.06 }, 0.1)
      .from(qa('.bc-tl-body'), { y: 28, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.15);
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <div className="bc-tl-wrap">
        <span className="bc-tl-line" aria-hidden="true" />
        <ol className="bc-tl" style={{ '--n': block.events.length } as CSSProperties}>
          {block.events.map(e => (
            <li key={e.when + e.title} className="bc-tl-event">
              <span className="bc-tl-dot" aria-hidden="true" />
              <div className="bc-tl-body">
                <p className="bc-tl-when pp-mono">{e.when}</p>
                <h3 className="bc-tl-title pp-lede">{e.title}</h3>
                {e.body && <p className="bc-tl-text">{e.body}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
