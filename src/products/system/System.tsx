// /products/system: the design system, drawn from tokens.css itself. Each family opens as a specimen set large, with
// its tokens as rows under it (name, value as written, value as the browser reads it, what it is for). Nothing here
// is copied from the CSS by hand: a token added to tokens.css shows up here, and one removed goes.
import { useEffect, useId, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { brandVars } from '../brand';
import { products } from '../data';
import { Label } from '../detail/blocks/shared';
import { MOTION } from '../motion';
import { HOME, Link } from '../router';
import { scrollToEl } from '../scroll';
import { BrowserFrame, PhoneFrame, Shot, WindowFrame } from '../stage/Frames';
import { Stop } from '../stop';
import { CATALOG, GROUPS } from '../playground/catalog';
import { Glyph } from '../playground/Glyph';
import { OFF_SCALE } from '../styles/offScale';
import tokensCss from '../styles/tokens.css?raw';
import { parseTokens, type Token } from '../styles/tokenList';
import '../styles/detail.css';
import '../styles/frames.css';
import '../styles/system.css';

const TOKENS = parseTokens(tokensCss);
const inSection = (s: string) => TOKENS.filter(t => t.section.startsWith(s));
const prefixed = (p: string) => TOKENS.filter(t => t.name.startsWith(p));

/** Colours to try the components in: every real product's own, then a pale, a dark and a vivid test colour. */
const BRANDS = [...products.map(p => ({ name: p.name, hex: p.brand })), { name: 'Pale test', hex: '#F2EEDF' }, { name: 'Dark test', hex: '#1B2A6B' }, { name: 'Vivid test', hex: '#FF3D7F' }];

const SECTIONS = [
  ['rules', 'Rules'], ['colour', 'Colour'], ['type', 'Type'], ['space', 'Space'], ['corners', 'Corners'], ['lines', 'Lines and depth'],
  ['layers', 'Layers'], ['motion', 'Motion'], ['layout', 'Layout'], ['components', 'Components'], ['blocks', 'Blocks'], ['off', 'Off the scale'], ['writing', 'Writing and access'],
] as const;

/** What the browser makes of a token here and now: a colour as rgb, a length in px. */
function useResolved(names: string[], as: 'color' | 'length') {
  const [out, setOut] = useState<Record<string, string>>({});
  const key = names.join(' ');
  useLayoutEffect(() => {
    const list = key.split(' ').filter(Boolean);
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    document.body.append(probe);
    const read = () => {
      const next: Record<string, string> = {};
      for (const n of list) {
        if (as === 'color') { probe.style.color = `var(${n})`; next[n] = getComputedStyle(probe).color; }
        else { probe.style.width = `var(${n})`; next[n] = `${Math.round(probe.getBoundingClientRect().width * 10) / 10}px`; }
      }
      setOut(next);
    };
    read();
    addEventListener('resize', read);
    return () => { removeEventListener('resize', read); probe.remove(); };
  }, [key, as]);
  return out;
}

/** WCAG contrast of a colour (rgb(), rgba() or color(srgb …), as browsers report them) laid on the black ground. */
function contrastOnGround(c: string) {
  const rgb = /rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)(?:[,/]\s*([\d.]+))?/.exec(c);
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(c);
  const m = rgb ?? srgb;
  if (!m) return null;
  const scale = rgb ? 1 : 255;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const lin = (x: number) => { const v = (x * scale * a) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(Number(m[1])) + 0.7152 * lin(Number(m[2])) + 0.0722 * lin(Number(m[3]));
  return (L + 0.05) / 0.05;
}

function Section({ id, title, aside, head, children }: { id: string; title: string; aside?: string; head: ReactNode; children: ReactNode }) {
  const label = useId();
  return (
    <section className="sy-sec" id={id} aria-labelledby={label}>
      <Label id={label} aside={aside}>{title}</Label>
      <h3 className="sy-head pp-lede">{head}</h3>
      {children}
    </section>
  );
}

/** A token drawn small in its table row, by what kind of token it is. */
type SampleKind = 'colour' | 'size' | 'weight' | 'width' | 'leading' | 'tracking' | 'family' | 'space' | 'fluid' | 'corner' | 'duration';

function Sample({ kind, t }: { kind: SampleKind; t: Token }) {
  const v = `var(${t.name})`;
  switch (kind) {
    case 'colour': return <span className="sy-chip sy-chip--sm" style={{ background: t.name.startsWith('--shadow') ? `linear-gradient(${v}, ${v}), var(--bone)` : v }} />;
    case 'size': return <span style={{ fontSize: v, lineHeight: 1 }}>Aa</span>;
    case 'weight': return <span className="sy-s-weight" style={{ fontWeight: v }}>Ag</span>;
    case 'width': return <span className="sy-wd-sample" style={{ fontVariationSettings: `'wdth' ${v}` }}>Ag</span>;
    case 'leading': return <span className="sy-lh" style={{ lineHeight: v }}>Two<br />lines</span>;
    case 'tracking': return <span className="sy-s-track" style={{ letterSpacing: v }}>Spacing</span>;
    case 'family': return <span style={{ fontFamily: v }}>Ag</span>;
    case 'space': return <span className="sy-space" style={{ width: v }} />;
    case 'fluid': return <span className="sy-space" style={{ width: `min(${v}, 100%)` }} />;
    case 'corner': return <span className="sy-corner" style={{ borderRadius: v }} />;
    case 'duration': return <span className="sy-dur" style={{ width: `calc(${v} / 0.7s * 100%)` }} />;
  }
}

function Table({ tokens, sample, resolved }: { tokens: Token[]; sample?: SampleKind; resolved?: Record<string, string> }) {
  return (
    <div className="sy-table" role="table" aria-label="Tokens">
      <div className="sy-row sy-row--head pp-mono" role="row">
        <span role="columnheader">{sample ? 'Sample' : <span className="pp-sr">Sample</span>}</span><span role="columnheader">Token</span><span role="columnheader">Written</span><span role="columnheader">Here</span><span role="columnheader">For</span>
      </div>
      {tokens.map(t => (
        <div className="sy-row" role="row" key={t.name}>
          <span role="cell" className="sy-sample">{sample && <Sample kind={sample} t={t} />}</span>
          <code role="cell" className="sy-name">{t.name}</code>
          <code role="cell" className="sy-value">{t.value}</code>
          <code role="cell" className="sy-value sy-dim">{resolved?.[t.name] ?? ''}</code>
          <span role="cell" className="sy-note">{t.note}</span>
        </div>
      ))}
    </div>
  );
}

export function System() {
  const [brand, setBrand] = useState(BRANDS[0].hex);
  const [here, setHere] = useState<string>('rules');
  const [wdth, setWdth] = useState(64);

  // the index marks the section in view
  useEffect(() => {
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) setHere(e.target.id); }, { rootMargin: '-40% 0px -55% 0px' });
    for (const [id] of SECTIONS) { const el = document.getElementById(id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, []);

  const colours = inSection('Colour');
  const colourValues = useResolved(colours.map(t => t.name), 'color');
  // each colour as the browser reads it, with its contrast on the ground where it is a colour for the dark page
  const withContrast = Object.fromEntries(colours.map(t => {
    const c = colourValues[t.name] ?? '';
    const r = /^--(paper|shadow)/.test(t.name) ? null : contrastOnGround(c);
    return [t.name, r ? `${c} · ${r.toFixed(1)}:1` : c];
  }));
  const fluid = TOKENS.filter(t => t.value.includes('clamp('));
  const fluidValues = useResolved(fluid.map(t => t.name), 'length');
  const branded = { ...brandVars(brand) };

  return (
    <div className="sy">
      <nav className="sy-top pp-wrap pp-mono" aria-label="Products" data-sticky>
        <Link to={HOME} className="sy-top-link"><span aria-hidden="true">←</span> All products</Link>
        <a className="sy-top-link" href={`${HOME}/playground`}>Open the playground <span aria-hidden="true">→</span></a>
      </nav>

      <main className="sy-main pp-wrap" id="content">
        <header className="sy-hero">
          <p className="pp-mono sy-dim">Products design system · {TOKENS.length} tokens · {CATALOG.length} blocks</p>
          <h1 className="pp-display sy-title">The<br />system<span className="pp-stop">.</span></h1>
          <p className="pp-lede sy-lede"><Stop text="Every colour, size, space, corner, layer and duration the products pages use, each a named step in one file. This page draws them from that file." /></p>
          <div className="sy-cta">
            <a className="pp-btn" href={`${HOME}/playground`}>Build a page with them</a>
            <a className="pp-btn pp-btn--ghost" href="#blocks" onClick={e => { e.preventDefault(); scrollToEl(document.getElementById('blocks'), 24); }}>See every block</a>
          </div>
        </header>

        <div className="sy-body">
          <nav className="sy-index pp-mono" aria-label="On this page">
            <ol>
              {SECTIONS.map(([id, name], i) => (
                <li key={id}>
                  <a href={`#${id}`} aria-current={here === id ? 'true' : undefined} onClick={e => { e.preventDefault(); scrollToEl(document.getElementById(id), 24); }}>
                    <span>{String(i + 1).padStart(2, '0')}</span>{name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="sy-content">
            <Section id="rules" title="Rules" head="A neutral page. The product brings the colour.">
              <ul className="sy-rules">
                <li><b>Bone on jet black.</b> The ground is #000000, never a near-black, so a screenshot of any colour sits well.</li>
                <li><b>No accent of its own.</b> The highlight is bone. A product’s colour appears only on that product’s own surfaces.</li>
                <li><b>A page is a list of blocks.</b> New content goes in as a block type, never as a section built for one product.</li>
                <li><b>No two pages in one order.</b> Each product arranges its own.</li>
                <li><b>Every value is a token.</b> A raw value that has a token fails the build’s tests.</li>
                <li><b>Motion is GSAP, brisk, and never trails the hand.</b> With reduced motion, every block is simply its final state.</li>
              </ul>
            </Section>

            <Section id="colour" aside={`${colours.length} tokens`} title="Colour" head={<>Three raw colours. <span className="sy-acc-word" style={branded}>The product</span> brings the fourth.</>}>
              <div className="sy-swatches">
                {['--ground', '--raise', '--raise-2', '--line', '--faint', '--dim', '--ink'].map(n => (
                  <div key={n} className="sy-swatch">
                    <span className="sy-chip" style={{ background: `var(${n})` }} />
                    <code>{n}</code>
                  </div>
                ))}
              </div>
              <div className="sy-brand">
                <div className="sy-brand-pick" role="radiogroup" aria-label="Try a product's colour">
                  {BRANDS.map(b => (
                    <button key={b.hex} type="button" role="radio" aria-checked={brand === b.hex} aria-label={`${b.name}, ${b.hex}`} title={`${b.name} · ${b.hex}`} onClick={() => setBrand(b.hex)} style={{ background: b.hex }} />
                  ))}
                </div>
                <div className="sy-brand-show pp-branded" style={branded}>
                  <span className="pp-tag pp-mono">03</span>
                  <button type="button" className="pp-btn pp-btn--acc">Copy install command</button>
                  <p className="pp-lede sy-brand-line">Accents take the <em className="sy-acc-word">product’s</em> colour<span className="pp-stop">.</span></p>
                  <span className="pp-mono sy-dim">--acc {brand} · --on-acc picked for contrast</span>
                </div>
              </div>
              <Table tokens={colours} sample="colour" resolved={withContrast} />
            </Section>

            <Section id="type" aside={`${inSection('Type').length} tokens`} title="Type" head="One family that stretches, one mono.">
              <div className="sy-wd">
                <p className="pp-display sy-wd-word" style={{ '--wdth': wdth } as CSSProperties}>Archivo</p>
                <label className="sy-wd-axis pp-mono">
                  <span>Width axis · --wdth {wdth}</span>
                  <input type="range" min={62} max={125} value={wdth} onChange={e => setWdth(Number(e.target.value))} />
                </label>
              </div>
              <div className="sy-levels">
                <div><span className="pp-mono sy-dim">1 · names and figures · pp-display</span><p className="pp-display sy-l1">Acme Notes</p></div>
                <div><span className="pp-mono sy-dim">2 · a demo title · wdth 125, 800</span><p className="sy-l2">Ask for it.</p></div>
                <div><span className="pp-mono sy-dim">3 · every sentence headline · pp-lede at --pp-head</span><p className="pp-lede sy-l3">Notes pile up where the work is.</p></div>
                <div className="sy-levels-small">
                  <div><span className="pp-mono sy-dim">pp-mono · labels</span><p className="pp-mono">Section label · 12px</p></div>
                  <div><span className="pp-mono sy-dim">pp-meta · phrases</span><p className="pp-meta">requests per minute</p></div>
                  <div><span className="pp-mono sy-dim">pp-cap · captions</span><p className="pp-cap">A caption under a demo, a picture or a film.</p></div>
                  <div><span className="pp-mono sy-dim">body · 17px, 1.5</span><p>Say what the product does for the person using it, in plain sentences.</p></div>
                </div>
              </div>
              <Table tokens={inSection('Type').filter(t => t.name.startsWith('--fs') || t.name === '--pp-head')} sample="size" resolved={fluidValues} />
              <Table tokens={prefixed('--w-')} sample="weight" />
              <Table tokens={prefixed('--wd-')} sample="width" />
              <Table tokens={prefixed('--lh-')} sample="leading" />
              <Table tokens={prefixed('--tr-')} sample="tracking" />
              <Table tokens={prefixed('--display').concat(prefixed('--text'), prefixed('--mono'))} sample="family" />
            </Section>

            <Section id="space" aside={`${inSection('Space').length} tokens`} title="Space" head="A 2px grid, and a rhythm that breathes with the screen.">
              <div className="sy-bars" aria-hidden="true">
                {prefixed('--sp-').map(t => <span key={t.name} style={{ height: `var(${t.name})` }} title={t.name} />)}
              </div>
              <Table tokens={prefixed('--sp-')} sample="space" />
              <Table tokens={fluid.filter(t => /^--(pad|flow|gap)/.test(t.name))} sample="fluid" resolved={fluidValues} />
            </Section>

            <Section id="corners" aside={`${prefixed('--r-').length} tokens`} title="Corners" head="Rounder as things grow: a tag at 8, a card at 14, a button a pill.">
              <div className="sy-corners">
                {prefixed('--r-').map(t => <div key={t.name} style={{ borderRadius: `var(${t.name})` }}><code>{t.name.slice(4)}</code></div>)}
              </div>
              <Table tokens={prefixed('--r-')} sample="corner" />
            </Section>

            <Section id="lines" aside={`${inSection('Lines').length + inSection('Depth').length} tokens`} title="Lines and depth" head="Hairlines, rings, and shadows made only of black.">
              <div className="sy-depth">
                <div style={{ boxShadow: 'inset 0 0 0 var(--stroke) var(--line)' }}><code>--stroke · a hairline</code></div>
                <div style={{ boxShadow: 'inset 0 0 0 var(--stroke-2) var(--ink)' }}><code>--stroke-2 · a ring</code></div>
                <div className="sy-depth-drop"><code>--drop-frame · under a frame</code></div>
              </div>
              <Table tokens={inSection('Lines').concat(inSection('Depth'))} />
            </Section>

            <Section id="layers" aside={`${prefixed('--z-').length} tokens`} title="Layers" head="Seven layers for the page. Inside a component, 1 to 6.">
              <div className="sy-stack" aria-hidden="true">
                {prefixed('--z-').map((t, i) => <span key={t.name} style={{ '--i': i } as CSSProperties}><code>{t.name}</code><b>{t.value}</b></span>)}
              </div>
              <Table tokens={prefixed('--z-')} />
            </Section>

            <Section id="motion" aside={`${inSection('Motion').length} tokens`} title="Motion" head="Brisk out, quick in. Nothing trails the hand.">
              <Motion />
              <Table tokens={prefixed('--ease').concat(prefixed('--spring'))} />
              <Table tokens={prefixed('--t-')} sample="duration" />
              <div className="sy-table" role="table" aria-label="GSAP motion">
                <div className="sy-row sy-row--head pp-mono" role="row"><span role="columnheader"><span className="pp-sr">Sample</span></span><span role="columnheader">MOTION, in motion.ts</span><span role="columnheader">Value</span><span role="columnheader"><span className="pp-sr">Here</span></span><span role="columnheader">For</span></div>
                {Object.entries(MOTION).map(([k, v]) => (
                  <div className="sy-row" role="row" key={k}><span role="cell" /><code role="cell" className="sy-name">MOTION.{k}</code><code role="cell" className="sy-value">{String(v)}</code><span role="cell" /><span role="cell" className="sy-note">{MOTION_USE[k as keyof typeof MOTION]}</span></div>
                ))}
              </div>
            </Section>

            <Section id="layout" title="Layout" head="Three widths to design at: 1440, 900 and 390.">
              <div className="sy-table" role="table" aria-label="Breakpoints">
                <div className="sy-row sy-row--head pp-mono" role="row"><span role="columnheader"><span className="pp-sr">Sample</span></span><span role="columnheader" className="sy-wide">Query</span><span role="columnheader">Means</span></div>
                {BREAKPOINTS.map(([q, m]) => <div className="sy-row" role="row" key={q}><span role="cell" /><code role="cell" className="sy-name sy-wide">{q}</code><span role="cell" className="sy-note">{m}</span></div>)}
              </div>
              <p className="pp-cap sy-gap">Side padding is <code>--pad</code>, {fluidValues['--pad'] ?? ''} at this width. Blocks are spaced by <code>--dt-gap</code>, and never by margins between them.</p>
            </Section>

            <Section id="components" title="Components" head="The parts every page is made of.">
              <div className="sy-comp">
                <div className="sy-comp-cell"><span className="pp-mono sy-dim">pp-btn · primary, ghost, accent</span>
                  <div className="sy-row-of"><button type="button" className="pp-btn">Watch the film</button><button type="button" className="pp-btn pp-btn--ghost">GitHub</button><span className="pp-branded" style={branded}><button type="button" className="pp-btn pp-btn--acc">Copy install command</button></span></div></div>
                <div className="sy-comp-cell"><span className="pp-mono sy-dim">pp-tag, pp-sample, pp-dots</span>
                  <p className="pp-mono pp-dots sy-row-of"><span className="pp-tag">PLG</span><span className="pp-dot">Plugin</span><span className="pp-dot">for bb</span><span className="pp-dot">2026</span><span className="pp-sample">Sample</span></p></div>
                <div className="sy-comp-cell sy-comp-cell--wide"><span className="pp-mono sy-dim">Label · a block's heading and rule, with an optional aside</span><Label id="sy-label-demo" aside="Redrawn · sample data">How it works</Label></div>
                <div className="sy-comp-cell"><span className="pp-mono sy-dim">The focus ring · --acc, 2px, 3px off</span><span className="sy-focus pp-btn pp-btn--ghost">Reached by Tab</span></div>
                <div className="sy-comp-cell"><span className="pp-mono sy-dim">pp-stop · a line's full stop in the product's colour</span><p className="pp-lede sy-stop-demo" style={branded}><Stop text="Notes that stay put." /></p></div>
              </div>
              <div className="sy-frames">
                <div><span className="pp-mono sy-dim">WindowFrame · a plugin</span><WindowFrame title="Acme Notes"><Shot media={{ sample: 0 }} kind="plugin" /></WindowFrame></div>
                <div><span className="pp-mono sy-dim">BrowserFrame · a website</span><BrowserFrame url="acme.example"><Shot media={{ sample: 1 }} kind="site" /></BrowserFrame></div>
                <div className="sy-frames-phone"><span className="pp-mono sy-dim">PhoneFrame · an app</span><PhoneFrame><Shot media={{ sample: 2, dark: true }} kind="app" /></PhoneFrame></div>
              </div>
            </Section>

            <Section id="blocks" aside={`${CATALOG.length} blocks`} title="Blocks" head={`${CATALOG.length} blocks. Any order, any number of times.`}>
              {GROUPS.map(g => (
                <div key={g} className="sy-group">
                  <h4 className="pp-mono sy-dim">{g}</h4>
                  <ul className="sy-blocks">
                    {CATALOG.filter(e => e.group === g).map(e => (
                      <li key={e.type}>
                        <a href={`${HOME}/playground`} className="sy-block">
                          <Glyph rects={e.glyph} className="pg-glyph sy-glyph" />
                          <b>{e.name}</b>
                          <span>{e.use}.</span>
                          <code>{e.type}</code>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Section>

            <Section id="off" title="Off the scale" head="What is left to merge into a step.">
              <p className="pp-cap">These raw values in the page CSS have no token yet. Each merge changes how something looks, so it is done on its own, shown as before and after renders. The tests allow only these, so the list can only shrink.</p>
              <div className="sy-off">
                {Object.entries(OFF_SCALE).filter(([, v]) => v.length).map(([family, values]) => (
                  <div key={family}><span className="pp-mono sy-dim">{family} · {values.length}</span><p>{values.map(v => <code key={v}>{v}</code>)}</p></div>
                ))}
              </div>
            </Section>

            <Section id="writing" title="Writing and access" head="Plain words. Every control a real button.">
              <ul className="sy-rules">
                <li><b>Only what is true.</b> Every claim on a real product’s page comes from its README or the product itself.</li>
                <li><b>Sentence case.</b> Capitals come from the type classes, never the text.</li>
                <li><b>Short.</b> A feature title is two to four words; its body one sentence. No em dashes, no filler.</li>
                <li><b>Real controls.</b> Every interactive thing is a button or a link, focus is always visible, and toggles say whether they are pressed.</li>
                <li><b>Reduced motion.</b> No smooth scroll, no pins, no curtain travel; every block in its final state.</li>
                <li><b>Contrast.</b> Body text is bone (17:1 on black), secondary text --dim (5.9:1); --faint is for drawing, never text.</li>
              </ul>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

const MOTION_USE: Record<keyof typeof MOTION, string> = {
  enter: 'an entrance, once, as a block comes into view',
  enterLong: 'a larger entrance: a stage, a fanned set',
  quick: 'a state change inside a block',
  stagger: 'between items entering together',
  ease: 'entrances land with this',
  easeOut: 'a quick move that settles',
  easeIn: 'anything leaving',
};

const BREAKPOINTS: [string, string][] = [
  ['(min-width: 900px) and (pointer: fine)', 'desktop with a mouse: galleries pin'],
  ['(max-width: 1099px)', 'grids drop a column'],
  ['(max-width: 899px)', 'two columns stack; featured stops pinning'],
  ['(max-width: 639px)', 'a phone: one column'],
  ['(hover: none), (pointer: coarse)', 'touch: no cursor label, no peek, no drag in demos'],
];

/** The two CSS curves drawn from their tokens, with a dot that runs each at a chosen duration. */
function Motion() {
  const [dur, setDur] = useState('--t-450');
  const [run, setRun] = useState(0);
  const durations = prefixed('--t-');
  const curves = [...prefixed('--ease'), ...prefixed('--spring')];
  return (
    <div className="sy-motion">
      {curves.map(t => {
        const n = /cubic-bezier\(([^)]+)\)/.exec(t.value)?.[1]?.split(',').map(Number) ?? [0, 0, 1, 1];
        const [x1, y1, x2, y2] = n as [number, number, number, number];
        const Y = (v: number) => 90 - v * 70;
        return (
          <figure key={t.name} className="sy-curve">
            <svg viewBox="0 0 100 110" aria-hidden="true">
              <rect x="0" y="20" width="100" height="70" className="sy-curve-box" />
              <path d={`M0 ${Y(0)} C ${x1 * 100} ${Y(y1)}, ${x2 * 100} ${Y(y2)}, 100 ${Y(1)}`} className="sy-curve-line" />
            </svg>
            <div className="sy-track"><span key={run} className="sy-dot" style={{ animationTimingFunction: `var(${t.name})`, animationDuration: `var(${dur})` }} /></div>
            <figcaption className="pp-mono"><code>{t.name}</code> {t.value}</figcaption>
          </figure>
        );
      })}
      <div className="sy-motion-ctl">
        <label className="pp-mono">
          <span>Duration</span>
          <select value={dur} onChange={e => setDur(e.target.value)}>{durations.map(t => <option key={t.name} value={t.name}>{t.name} · {t.value}</option>)}</select>
        </label>
        <button type="button" className="pp-btn pp-btn--ghost" onClick={() => setRun(r => r + 1)}>Play</button>
      </div>
    </div>
  );
}
