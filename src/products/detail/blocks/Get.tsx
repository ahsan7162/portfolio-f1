// How to get the product, as the last frame of a trailer: its name as a poster in its colour, the hook, the install as one
// wide ticket, and a credits line, on the black page.
import { useId, useRef } from 'react';
import { ME } from '../../home/hero/shared';
import { gsap } from '../../motion';
import { findBlock, type Product } from '../../types';
import { useFit } from '../fit';
import { IconCopy } from './icons';
import { CopyStatus, Label, Out, StoreButtons, SwapLabel, useBlockMotion, useCopy, type BlockProps } from './shared';
import { Stop } from '../../stop';

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

/** The credits under the ticket, from the product's own facts: its licence, the bb it needs, and who built it. */
function credits(product: Product) {
  const rows = findBlock(product, 'specs')?.rows ?? [];
  const licence = rows.find(r => r.name === 'Licence')?.value ?? product.facts.find(f => /^(MIT|Apache|BSD|ISC|MPL|GPL)/.test(f));
  const bb = rows.find(r => r.name === 'bb')?.value;
  return [licence && 'Free and open source', licence, bb && `for bb ${bb}`, `built by ${ME.name}`].filter(Boolean);
}

export function Get({ block, product }: BlockProps<'get'>) {
  const root = useRef<HTMLElement>(null);
  const name = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [copied, copy] = useCopy();
  const { via } = block;
  useFit(name, 34);

  useBlockMotion(root, ({ qa, enter }) => {
    const parts = qa('.dt-poster, .dt-poster-hook, .dt-get-main, .dt-credits');
    if (parts.length) gsap.from(parts, { y: 28, autoAlpha: 0, duration: 0.55, stagger: 0.06, scrollTrigger: enter(parts[0], 'top 90%') });
  });

  return (
    <section className="dt-block dt-get" ref={root} aria-labelledby={id}>
      <div className="pp-wrap">
        <Label id={id}>{block.label}</Label>
        {/* the name again, as a poster: the label above already names the section */}
        <p className="dt-poster pp-display" ref={name} aria-hidden="true"><span className="dt-fit">{product.name}</span></p>
        {product.hook && <p className="dt-poster-hook pp-lede"><Stop text={product.hook} /></p>}
        <div className="dt-get-main">
          {via.kind === 'command' && (
            <div className="dt-cmd">
              <Command text={via.command} />
              <button type="button" className="dt-get-btn" onClick={() => copy(via.command)}><IconCopy done={copied} /><SwapLabel on={copied} off="Copy" onText="Copied" /></button>
            </div>
          )}
          {via.kind === 'stores' && <div className="dt-get-row"><StoreButtons className="dt-get-btn dt-get-btn--lg" /></div>}
          {via.kind === 'link' && <a className="dt-get-btn dt-get-btn--lg" href={via.href} target="_blank" rel="noopener noreferrer">{via.label} <Out /></a>}
        </div>
        <p className="dt-credits pp-meta pp-dots">{credits(product).map(c => <span className="pp-dot" key={c}>{c}</span>)}</p>
        <p className="dt-get-note">{block.note}</p>
        <CopyStatus copied={copied} />
      </div>
    </section>
  );
}
