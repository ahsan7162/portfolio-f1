// How to get the product, on a full-bleed band in the product's colour.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { CopyStatus, Label, Out, StoreButtons, SwapLabel, useBlockMotion, useCopy, type BlockProps } from './shared';

export function Get({ block, n }: BlockProps<'get'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [copied, copy] = useCopy();
  const { via } = block;

  useBlockMotion(root, ({ q, enter }) => {
    const main = q('.dt-get-main');
    if (main) gsap.from(main, { y: 36, autoAlpha: 0, duration: 0.55, scrollTrigger: enter(main, 'top 94%') });
  });

  return (
    <section className="dt-block dt-get" ref={root} aria-labelledby={id}>
      <div className="pp-wrap">
        <Label n={n} id={id}>{block.label}</Label>
        <div className="dt-get-main">
          {via.kind === 'command' && (
            <div className="dt-cmd">
              <code className="dt-cmd-text">{via.command}</code>
              <button type="button" className="dt-get-btn" onClick={() => copy(via.command)}><SwapLabel on={copied} off="Copy" onText="Copied" /></button>
            </div>
          )}
          {via.kind === 'stores' && <div className="dt-get-row"><StoreButtons className="dt-get-btn dt-get-btn--lg" /></div>}
          {via.kind === 'link' && <a className="dt-get-btn dt-get-btn--lg" href={via.href} target="_blank" rel="noopener noreferrer">{via.label} <Out /></a>}
        </div>
        <p className="dt-get-note">{block.note}</p>
        <CopyStatus copied={copied} />
      </div>
    </section>
  );
}
