// Every block, drawn by its real component as a detail page draws it, with its real motion. A block with sample
// content is shown on Acme Notes in the colour picked above; a block that draws a real product (its demo, its rules)
// is shown on that product, in that product's own colour. Each mounts as it nears the screen, so the page stays light.
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { brandVars } from '../brand';
import { One } from '../detail/blocks';
import { ScrollTrigger } from '../motion';
import { ACME, CATALOG, GROUPS, sampleSource, type Entry } from '../playground/catalog';
import { Glyph } from '../playground/Glyph';
import { HOME } from '../router';
import type { Product } from '../types';

let refresh = 0;
/** Blocks that mount late move everything under them: measure the scroll triggers again, once things settle. */
const remeasure = () => { clearTimeout(refresh); refresh = window.setTimeout(() => ScrollTrigger.refresh(), 250); };

export function LiveBlocks({ brand }: { brand: string }) {
  return (
    <div className="sy-lives">
      {GROUPS.map(g => (
        <div key={g} className="sy-lives-group">
          <h3 className="sy-lives-title pp-wrap pp-mono">{g}</h3>
          {CATALOG.filter(e => e.group === g).map(e => <LiveBlock key={e.type} entry={e} brand={brand} />)}
        </div>
      ))}
    </div>
  );
}

function LiveBlock({ entry, brand }: { entry: Entry; brand: string }) {
  const box = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const { block, from } = sampleSource(entry.type);
  // a sample is about Acme Notes, in the picked colour; a real product's block stays on that product, in its own
  const product: Product = from ?? { ...ACME, brand, blocks: [block] };

  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setNear(true); }, { rootMargin: '120% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => { if (near) remeasure(); }, [near]);

  return (
    <article className="sy-live" id={`block-${entry.type}`} ref={box} aria-label={`${entry.name}, live`}>
      <header className="sy-live-head pp-wrap">
        <Glyph rects={entry.glyph} className="pg-glyph sy-glyph" />
        <div>
          <p className="sy-live-name"><b>{entry.name}</b> <code>{entry.type}</code></p>
          <p className="sy-live-use">{entry.use}. <span className="sy-dim">{from ? `Shown on ${from.name}, in its own colour: it draws that product.` : 'Sample content, on Acme Notes, a product that does not exist.'}</span></p>
        </div>
        <a className="pp-btn pp-btn--ghost sy-live-try" href={`${HOME}/playground`}>Try it in the playground</a>
      </header>
      <div className={`dt pp-branded sy-live-page${near ? '' : ' sy-live-page--wait'}`} style={brandVars(product.brand)}>
        {near && (
          <div className="dt-blocks">
            <Contain name={entry.name}><One block={block} product={product} /></Contain>
          </div>
        )}
      </div>
    </article>
  );
}

/** One block that fails to draw says so, and the rest of the page goes on. */
class Contain extends Component<{ name: string; children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: e instanceof Error ? e.message : String(e) }; }
  override render() {
    return this.state.error === null ? this.props.children : <p className="dt-block pp-wrap pp-cap">{this.props.name} could not draw here: {this.state.error}</p>;
  }
}
