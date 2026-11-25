// How to get the product, on a full-bleed band in the product's colour.
import { useId, useRef } from 'react';
import { gsap } from '../../motion';
import { CopyStatus, Label, Out, StoreButtons, SwapLabel, useBlockMotion, useCopy, type BlockProps } from './shared';

/** The line wraps before the last word (the URL), never inside it; on a phone the URL may also break after a slash. */
function Command({ text }: { text: string }) {
  const cut = text.lastIndexOf(' ') + 1;
  // Parts end after each slash that starts one ("github.com/", not between the two slashes of "https://"); each keyed by its offset.
  // They are inline blocks, not <wbr>s, because Chrome breaks at a <wbr> even inside white-space: nowrap.
  const parts = text.slice(cut).split(/(?<=\/)(?=[^/])/).map((part, i, all) => ({ part, from: all.slice(0, i).join('').length }));
  return (
    <code className="dt-cmd-text">
      {text.slice(0, cut)}
      <span className="dt-cmd-arg">{parts.map(({ part, from }) => <span key={from}>{part}</span>)}</span>
    </code>
  );
}

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
              <Command text={via.command} />
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
