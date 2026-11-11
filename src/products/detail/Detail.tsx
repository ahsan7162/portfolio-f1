// A product's own page: the furniture (top bar, hero, next product) around the blocks the product lists.
import { useEffect, useRef } from 'react';
import { onReveal } from '../arrive';
import { brandVars } from '../brand';
import { products } from '../data';
import { pad } from '../format';
import { gsap, reducedMotion, ScrollTrigger, useGSAP } from '../motion';
import { HOME, Link, productPath } from '../router';
import { scrollToEl } from '../scroll';
import { type Block, FILM_ID, findBlock, KINDS, type Product } from '../types';
import { Blocks, numbered } from './blocks';
import { CopyStatus, Out, StoreButtons, SwapLabel, useCopy } from './blocks/shared';
import { useFit } from './fit';
import '../styles/detail.css';

/** The letters of each line, keyed by position (the text never reorders). */
const letters = (line: string) => [...new Intl.Segmenter().segment(line)].map(({ segment: ch, index }) => ({ ch, id: `${index}` }));

/** What the outline calls a block that has no label of its own. */
const UNLABELLED: Partial<Record<Block['type'], string>> = { stage: 'The product', stats: 'In numbers', text: 'Notes', split: 'Feature', showcase: 'Showcase', marquee: 'Marquee', quote: 'Quote' };

export function Detail({ product }: { product: Product }) {
  const root = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLSpanElement>(null);
  const jump = useRef<HTMLDivElement>(null);
  const [copied, copy] = useCopy();

  useFit(nameRef, 36);
  useFit(nextRef, 30);

  // Hero intro and the Next band. Each block owns its own motion. The intro is built paused (its
  // from-states hold the hero hidden under the curtain) and starts as the curtain lifts; it is
  // brisk, so the name and everything under it read within about 0.8 s of the reveal.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const intro = gsap.timeline({ paused: true })
        .from('.dt-ch', { yPercent: 118, duration: 0.55, ease: 'expo.out', stagger: { amount: 0.2 } })
        // The button row moves as one: .pp-btn has its own transform transition and :active scale.
        .from('[data-in]', { y: 20, autoAlpha: 0, duration: 0.45, ease: 'expo.out', stagger: 0.04 }, 0.1);
      const cancel = onReveal(() => intro.play());
      const next = nextRef.current;
      if (next) {
        gsap.from(next, {
          y: 40, autoAlpha: 0, duration: 0.55,
          scrollTrigger: { trigger: next, start: 'top 96%', once: true, fastScrollEnd: true, onEnterBack: self => { self.animation?.progress(1); } },
        });
      }
      return cancel;
    });
    return () => mm.revert();
  }, { scope: root });

  // Blocks set up their triggers top to bottom as the page is revealed, so they are already in page
  // order. Once the curtain is up, measure everything once more (fonts, fitted names, images).
  useEffect(() => {
    let t = 0;
    const cancel = onReveal(() => { t = window.setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 650); });
    return () => { cancel(); clearTimeout(t); };
  }, []);

  const kind = KINDS[product.kind];
  const total = products.length;
  const at = products.findIndex(p => p.slug === product.slug);
  // Not in the list (or the list is empty): no position, no prev/next.
  const prev = at < 0 ? undefined : products[(at - 1 + total) % total];
  const next = at < 0 || total < 2 ? undefined : products[(at + 1) % total];
  const spec = product.facts.at(-1);
  const via = findBlock(product, 'get')?.via;
  const film = findBlock(product, 'film');

  // The page's own outline: its blocks in order, so the arrangement is visible (and reachable) from the top.
  const outline = numbered(product.blocks).map(({ block, key, label, n }) => ({ key, n, name: label ?? UNLABELLED[block.type] ?? block.type }));
  const toBlock = (i: number) => scrollToEl(root.current?.querySelectorAll('.dt-block')[i], 24, reducedMotion());
  const toFilm = () => scrollToEl(document.getElementById(FILM_ID), 24, reducedMotion());

  return (
    <div className="dt pp-branded" ref={root} style={brandVars(product.brand)}>
      <nav className="dt-top pp-wrap pp-mono" aria-label="Products">
        <Link to={HOME} className="dt-top-link"><span aria-hidden="true">←</span> All products</Link>
        {prev && next && (
          <span className="dt-top-right">
            <button type="button" className="dt-top-link dt-pos pp-mono" popoverTarget="dt-jump" aria-label={`Product ${at + 1} of ${total}. Jump to a product`}>
              {pad(at + 1)} / {pad(total)} <span aria-hidden="true">▾</span>
            </button>
            {/* A native popover: Escape and a click outside close it. data-lenis-prevent lets a long list scroll. */}
            <div id="dt-jump" popover="auto" className="dt-jump" ref={jump} data-lenis-prevent>
              <ol>
                {products.map((p, i) => (
                  <li key={p.slug}>
                    <Link to={productPath(p.slug)} className="dt-jump-item" style={brandVars(p.brand)} aria-current={p.slug === product.slug ? 'page' : undefined} onClick={() => { if (jump.current && 'hidePopover' in jump.current) jump.current.hidePopover(); }}>
                      <b className="pp-mono">{pad(i + 1)}</b>
                      <span className="dt-jump-name">{p.name}</span>
                      <span className="pp-mono">{KINDS[p.kind].label}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <Link to={productPath(prev.slug)} className="dt-top-link" aria-label={`Previous: ${prev.name}`}>Prev</Link>
            <Link to={productPath(next.slug)} className="dt-top-link" aria-label={`Next: ${next.name}`}>Next</Link>
          </span>
        )}
      </nav>

      <main>
      <header className="dt-hero pp-wrap">
        <p className="dt-meta pp-mono" data-in>
          <span className="pp-tag">{at < 0 ? kind.tag : pad(at + 1)}</span>
          <span className="dt-meta-item">{kind.label}</span>
          {product.facts.map(f => <span className="dt-meta-item" key={f}>{f}</span>)}
          <span className="dt-meta-item">{product.year}</span>
          {product.sample && <span className="pp-sample">Sample</span>}
        </p>
        <h1 className="dt-name pp-display" ref={nameRef} aria-label={product.name}>
          <span className="dt-fit" aria-hidden="true">
            {product.lines.map((line, i) => (
              <span key={line}>
                {i > 0 && ' '}
                <span className="dt-name-line">{letters(line).map(l => <span className="dt-ch" key={l.id}>{l.ch}</span>)}</span>
              </span>
            ))}
          </span>
        </h1>
        <div className="dt-row">
          <div>
            <p className="dt-pitch pp-lede" data-in>{product.line}</p>
            <div className="dt-cta" data-in>
              {via?.kind === 'command' && (
                <button type="button" className="pp-btn pp-btn--acc" onClick={() => copy(via.command)}>
                  <SwapLabel on={copied} off="Copy install command" onText="Copied" />
                </button>
              )}
              {via?.kind === 'stores' && <StoreButtons className="pp-btn pp-btn--ghost" />}
              {via?.kind === 'link' && <a className="pp-btn pp-btn--acc" href={via.href} target="_blank" rel="noopener noreferrer">{via.label} <Out /></a>}
              {product.links.map(l => <a key={l.href} className="pp-btn pp-btn--ghost" href={l.href} target="_blank" rel="noopener noreferrer">{l.label} <Out /></a>)}
              {film && <button type="button" className="pp-btn pp-btn--ghost" onClick={toFilm}>Watch the film · {film.duration}</button>}
            </div>
            <CopyStatus copied={copied} />
          </div>
          <dl className="dt-facts" data-in>
            <div><dt className="pp-mono">Kind</dt><dd>{kind.label}</dd></div>
            <div><dt className="pp-mono">Year</dt><dd>{product.year}</dd></div>
            <div><dt className="pp-mono">Built with</dt><dd>{product.stack.join(' · ')}</dd></div>
            {spec && <div><dt className="pp-mono">{kind.fact}</dt><dd>{spec}</dd></div>}
          </dl>
        </div>
        <nav className="dt-toc pp-mono" aria-label="On this page" data-in>
          <span className="dt-toc-head">On this page</span>
          <ol className="dt-toc-list">
            {outline.map((o, i) => (
              <li key={o.key}>
                <button type="button" className="dt-toc-item pp-mono" onClick={() => toBlock(i)}><b>{o.n ?? '·'}</b>{o.name}</button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <Blocks product={product} />

      {next && (
        <Link to={productPath(next.slug)} className="dt-next">
          <span className="dt-next-in pp-wrap">
            <span className="pp-mono">Next · {pad(((at + 1) % total) + 1)} / {pad(total)}</span>
            <span className="dt-next-name pp-display" ref={nextRef}>
              <span className="dt-fit"><span className="dt-next-text">{next.name}</span> <span className="dt-arrow" aria-hidden="true">→</span></span>
            </span>
          </span>
        </Link>
      )}
      </main>
    </div>
  );
}
