// Questions that open and close: native <details>, uncontrolled, so the toggle and its
// accessibility are the browser's. When motion is allowed, a summary click is taken over only to
// tween the answer's height; with reduced motion no listener exists and the toggle is native.
import { useId, useRef } from 'react';
import { gsap, ScrollTrigger } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Faq({ block, n }: BlockProps<'faq'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.bc-faq');
    if (list) gsap.from(qa('.bc-faq-item'), { y: 24, autoAlpha: 0, duration: 0.45, stagger: 0.04, scrollTrigger: enter(list, 'top 88%') });

    const off: (() => void)[] = [];
    for (const item of qa<HTMLDetailsElement>('.bc-faq-item')) {
      const summary = item.querySelector('summary');
      const panel = item.querySelector<HTMLElement>('.bc-faq-a');
      if (!summary || !panel) continue;
      const done = () => ScrollTrigger.refresh();
      const onClick = (e: Event) => {
        e.preventDefault();
        gsap.killTweensOf(panel);
        // The icon follows the intent at click time, not [open], which flips only after a close.
        const opening = item.dataset.state ? item.dataset.state === 'closed' : !item.open;
        if (opening) {
          // Mid-close it is still open: carry on from its current height.
          const from = item.open ? panel.offsetHeight : 0;
          item.dataset.state = 'open';
          item.open = true;
          gsap.fromTo(panel, { height: from }, { height: 'auto', duration: 0.32, ease: 'expo.out', clearProps: 'height', onComplete: done });
        } else {
          item.dataset.state = 'closed';
          gsap.to(panel, { height: 0, duration: 0.26, ease: 'power3.out', onComplete: () => { item.open = false; gsap.set(panel, { clearProps: 'height' }); done(); } });
        }
      };
      summary.addEventListener('click', onClick);
      off.push(() => {
        summary.removeEventListener('click', onClick);
        delete item.dataset.state;
      });
    }
    return () => { for (const f of off) f(); };
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <div className="bc-faq">
        {block.items.map(it => (
          <details key={it.q} className="bc-faq-item">
            <summary className="bc-faq-q">
              <span className="pp-lede">{it.q}</span>
              <span className="bc-faq-icon" aria-hidden="true" />
            </summary>
            <div className="bc-faq-a"><p>{it.a}</p></div>
          </details>
        ))}
      </div>
    </section>
  );
}
