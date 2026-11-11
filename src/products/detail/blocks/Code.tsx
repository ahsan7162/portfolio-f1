// A piece of code with Copy and, optionally, the screen it produces beside it. The code is plain
// text: nothing is run or highlighted.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { MediaView } from './MediaView';
import { CopyStatus, Label, SwapLabel, useBlockMotion, useCopy, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Code({ block, product, n }: BlockProps<'code'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [copied, copy] = useCopy();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const pair = q('.bc-code');
    if (pair) gsap.from(qa('.bc-code > *'), { y: 32, autoAlpha: 0, duration: 0.55, stagger: 0.1, scrollTrigger: enter(pair) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.note && <p className="bc-note">{block.note}</p>}
      <div className="bc-code" data-pair={block.result ? '' : undefined}>
        <figure className="bc-code-panel">
          <figcaption className="bc-code-bar pp-mono">
            <span>{block.title}</span>
            <button type="button" className="bc-code-copy pp-mono" onClick={() => copy(block.code)}><SwapLabel on={copied} off="Copy" onText="Copied" /></button>
          </figcaption>
          <pre className="bc-code-pre"><code>{block.code}</code></pre>
        </figure>
        {block.result && (
          <figure className="bc-code-result">
            <MediaView media={block.result} product={product} />
            {block.caption && <figcaption className="bc-code-cap pp-mono">{block.caption}</figcaption>}
          </figure>
        )}
      </div>
      <CopyStatus copied={copied} text="Code copied" />
    </section>
  );
}
