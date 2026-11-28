// The playground: build a product's detail page from the design system's blocks. The blocks are listed on the
// left (the page's own, to reorder, then every block there is, to add), the page is drawn in the middle by a
// sandboxed canvas, and the right shows the picked block's fields and code, the page's code, and blocks being
// written. Nothing here runs code: the page's code is read as data, and written blocks run only in the canvas.
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { products } from '../../data';
import { KINDS, type Block, type Kind, type Product, type StageKind } from '../../types';
import { CATALOG, entry, fits, GROUPS, remix, sample, STARTERS, type BlockType, type Template } from '../catalog';
import { act, notABlock, recall, remember, spliced, start, swapped, type State } from '../doc';
import { LiteralError, MAX_SOURCE, parse, print, type Literal } from '../literal';
import { LIMITS, NAME } from '../protocol';
import { savedNames } from '../../detail/blocks/saved/names';
import { Glyph } from '../Glyph';
import { ALT, Icon, MOD, SHIFT } from './icons';
import { CANVAS_MIN, FRESH, LEFT, RIGHT, SPLIT, useLayout } from './layout';
import { Splitter } from './Splitter';
import { Canvas, type CanvasApi } from './Canvas';
import { CodeEditor } from './CodeEditor';
import { BlockFields, Field } from './Fields';
import { starter, type WrittenBlock } from './written';

const WIDTHS = [1440, 900, 390] as const;
const WIDTH_NAMES: Record<(typeof WIDTHS)[number], string> = { 1440: 'A desktop, 1440 px wide', 900: 'A tablet, 900 px wide', 390: 'A phone, 390 px wide' };
/** The token the dev server put on this page; a build has none, so Save is not offered there. */
const TOKEN = document.querySelector<HTMLMetaElement>('meta[name="playground-save"]')?.content ?? '';
const REAL = Object.fromEntries(products.map(p => [`real:${p.slug}`, p]));
const STAGE_FOR: Record<Kind, StageKind> = { plugin: 'window', app: 'phone', site: 'browser' };
const KIND_NAMES: Record<Kind, string> = { plugin: 'Plugin', app: 'App', site: 'Website' };

function initial(): { state: State; written: WrittenBlock[]; fresh: boolean } {
  const saved = recall();
  if (saved) {
    const base = start({ id: saved.template, name: '', use: '', meta: saved.meta, blocks: saved.blocks });
    return { state: base, written: saved.sources.map(x => Object.assign({ props: '{}' }, x)), fresh: false };
  }
  return { state: start(STARTERS[0]), written: [], fresh: true };
}

/** Reads code as a page: a list of blocks of known types. Throws a LiteralError that says where. */
function readPage(text: string): Block[] {
  const v = parse(text);
  if (!Array.isArray(v)) throw new LiteralError('The page is a list of blocks: [ … ]', 1, 1);
  v.forEach((b, i) => { const why = notABlock(b); if (why) throw new LiteralError(`Block ${i + 1}: ${why}`, 1, 1); });
  return v as unknown as Block[];
}
function readBlock(text: string): Block {
  const v = parse(text);
  const why = notABlock(v);
  if (why) throw new LiteralError(`This is not a block: ${why}`, 1, 1);
  return v as unknown as Block;
}

type Problem = { line: number; message: string } | null;
const problem = (e: unknown): Problem => (e instanceof LiteralError
  ? { line: e.line, message: e.message.replace(/ \(line \d+, column \d+\)$/, '') }
  : { line: 1, message: e instanceof Error ? e.message : String(e) });

/**
 * A code pane bound to a value both ways: edits that read cleanly apply at once, and a change from anywhere else
 * rewrites the text. The text remembers the value it stands for, so the value it just applied leaves it as typed.
 */
function useTwoWay<T>(value: T, toText: (v: T) => string, fromText: (s: string) => T, apply: (v: T) => void) {
  const [pane, setPane] = useState<{ text: string; of: T; error: Problem }>(() => ({ text: toText(value), of: value, error: null }));
  if (pane.of !== value) setPane({ text: toText(value), of: value, error: null });
  const onChange = (text: string) => {
    try { const v = fromText(text); setPane({ text, of: v, error: null }); apply(v); } catch (e) { setPane(x => ({ ...x, text, error: problem(e) })); }
  };
  return { text: pane.of === value ? pane.text : toText(value), error: pane.error, onChange };
}

const pageText = (blocks: Block[]) => `// The page as data.ts writes it. Edit it here and the page follows; it is read as data, never run.\n${print(blocks as unknown as Literal)}\n`;

export function Playground() {
  const [boot] = useState(initial);
  const [s, dispatch] = useReducer(act, boot.state);
  const [written, setWritten] = useState<WrittenBlock[]>(boot.written);
  const [armed, setArmed] = useState(false);
  const [built, setBuilt] = useState<Record<string, string | null>>({});
  /** Why a block could not draw, by the block's key. */
  const [faults, setFaults] = useState<Record<string, string>>({});
  // a phone starts the canvas at a phone's width, where the page can be read without zooming
  const [width, setWidth] = useState<number>(() => (matchMedia('(max-width: 899px)').matches ? 390 : 1440));
  const [tab, setTab] = useState<'block' | 'page' | 'write'>('block');
  const [pane, setPane] = useState<'blocks' | 'canvas' | 'edit'>('canvas');
  /**
   * A line for the visitor. A passing one (a block removed, a page saved) floats and fades, and a removal carries
   * the page as it was, so Undo is offered while that removal is still the last change.
   */
  const [notice, setNotice] = useState<{ text: string; passing?: boolean; before?: State['doc'] } | null>(null);
  useEffect(() => {
    if (!notice?.passing) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const [scale, setScale] = useState(1);
  // Full screen fills the screen with the canvas where the browser allows it, and the window where it doesn't.
  const [full, setFull] = useState(false);
  const enterFull = () => {
    setFull(true);
    document.documentElement.requestFullscreen().catch(() => { /* not allowed here: the canvas fills the window */ });
  };
  const exitFull = () => { setFull(false); if (document.fullscreenElement) void document.exitFullscreen(); };
  useEffect(() => {
    // Esc in the browser's own full screen leaves it without a key event here
    const on = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const [query, setQuery] = useState('');
  const canvas = useRef<CanvasApi>(null);
  const startDialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const { layout, set: setLayout, vw, left: leftWidth, right: rightWidth } = useLayout();
  /** Shows or hides a side pane; a pane closed from inside hands the focus to its button in the top bar. */
  const toggle = (side: 'left' | 'right', from?: 'inside') => {
    setLayout(l => (side === 'left' ? { leftOpen: !l.leftOpen } : { rightOpen: !l.rightOpen }));
    if (from) requestAnimationFrame(() => document.querySelector<HTMLElement>(`.pg-bar [aria-controls="pg-${side}"]`)?.focus());
  };
  const { doc, selected } = s;
  const real = REAL[s.template];

  const product: Product = useMemo(() => ({ ...doc.meta, blocks: doc.blocks }), [doc.meta, doc.blocks]);
  const sources = useMemo(() => written.map(({ name, code, css }) => ({ name, code, css })), [written]);

  useEffect(() => { if (boot.fresh) startDialog.current?.showModal(); }, [boot.fresh]);
  useEffect(() => { const t = setTimeout(() => remember(s, written), 400); return () => clearTimeout(t); }, [s, written]);

  // what the keys below do with this render's state
  const toggleFull = useRef(() => {});
  const leave = useRef(() => {});
  useLayoutEffect(() => {
    toggleFull.current = () => (full ? exitFull() : enterFull());
    // Esc leaves full screen first, then lets go of the picked block
    leave.current = () => { if (full) exitFull(); else if (selected >= 0) dispatch({ do: 'select', i: -1 }); };
  });

  // keys outside a field: undo and redo, the side panes, full screen, / to find a block
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]');
      if (typing || document.querySelector('dialog[open]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ do: e.shiftKey ? 'redo' : 'undo' }); }
      // by the key's place, not its letter: Option changes the letter on a Mac
      else if (mod && e.code === 'KeyB') { e.preventDefault(); setLayout(l => (e.altKey ? { rightOpen: !l.rightOpen } : { leftOpen: !l.leftOpen })); }
      else if (e.key === 'f' && !mod && !e.altKey) { e.preventDefault(); toggleFull.current(); }
      else if (e.key === 'Escape') leave.current();
      else if (e.key === '/') {
        e.preventDefault(); setPane('blocks'); setLayout({ leftOpen: true });
        // the pane may have been closed: focus once it is drawn
        requestAnimationFrame(() => search.current?.focus());
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [setLayout]);

  // the picked block, however it was picked, is in view in the list
  useEffect(() => { layers.current?.children[selected]?.scrollIntoView({ block: 'nearest' }); }, [selected]);

  const insertAt = selected >= 0 ? selected + 1 : doc.blocks.length;
  const add = (b: Block, at = insertAt) => { dispatch({ do: 'insert', block: b, at }); setTab('block'); };

  // ---- dragging: a block from the list onto the page, or one of the page's blocks to a new place ----
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [layerAt, setLayerAt] = useState<number | null>(null);
  const layers = useRef<HTMLOListElement>(null);
  const dragged = useRef(false);
  const beginDrag = (e: RPointerEvent<HTMLElement>, what: { add: BlockType } | { move: number }, label: string) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const x0 = e.clientX, y0 = e.clientY;
    let live = false, lastY = y0, canvasAt: number | null = null, listAt: number | null = null;
    dragged.current = false;
    // every move and the release come to this element until it lets go, even over the canvas's frame
    el.setPointerCapture(e.pointerId);
    const edge = setInterval(() => { if (live && canvasAt !== null) canvas.current?.edge(lastY); }, 50);
    const listIndex = (y: number) => {
      const items = [...(layers.current?.querySelectorAll<HTMLElement>('.pg-layer') ?? [])];
      const r = layers.current?.getBoundingClientRect();
      if (!r || y < r.top - 8 || y > r.bottom + 8) return null;
      const i = items.findIndex(it => { const b = it.getBoundingClientRect(); return y < b.top + b.height / 2; });
      return i < 0 ? items.length : i;
    };
    const move = (ev: PointerEvent) => {
      if (!live && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      if (!live) { live = true; dragged.current = true; }
      lastY = ev.clientY;
      canvasAt = canvas.current?.indexAt(ev.clientX, ev.clientY) ?? null;
      listAt = canvasAt === null ? listIndex(ev.clientY) : null;
      setGhost({ x: ev.clientX, y: ev.clientY, label });
      setDropAt(canvasAt);
      setLayerAt(listAt);
    };
    const end = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      removeEventListener('keydown', esc);
      clearInterval(edge);
      setGhost(null); setDropAt(null); setLayerAt(null);
      const at = canvasAt ?? listAt;
      if (!live || at === null || ev.type === 'pointercancel') return;
      if ('add' in what) add(sample(what.add), at);
      else dispatch({ do: 'move', from: what.move, to: at > what.move ? at - 1 : at });
    };
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { canvasAt = listAt = null; el.dispatchEvent(new PointerEvent('pointercancel')); } };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    addEventListener('keydown', esc);
  };

  // ---- the code panes ----
  const page = useTwoWay(doc.blocks, pageText, readPage, blocks => { setFaults({}); dispatch({ do: 'blocks', blocks }); });
  const current = doc.blocks[selected];
  const edit = (i: number, block: Block) => { const k = doc.keys[i]; if (k) setFaults(f => Object.fromEntries(Object.entries(f).filter(([x]) => x !== k))); dispatch({ do: 'update', i, block }); };
  const one = useTwoWay(current, b => (b ? print(b as unknown as Literal) : ''), readBlock, b => edit(selected, b));

  // ---- saving to the repo (dev server only) ----
  const [confirm, setConfirm] = useState<{ what: string; files: string[]; warn?: string; body: object } | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  // the question takes focus, on its safe answer
  useEffect(() => { if (confirm) cancel.current?.focus(); }, [confirm]);
  const save = async (body: object) => {
    setConfirm(null);
    try {
      const r = await fetch('/__playground/save', { method: 'POST', headers: { 'content-type': 'application/json', 'x-playground-token': TOKEN }, body: JSON.stringify(body) });
      const out = (await r.json()) as { wrote?: string[]; error?: string };
      setNotice(r.ok ? { text: `Saved: ${out.wrote?.join(', ')}`, passing: true } : { text: `Not saved: ${out.error ?? r.status}` });
    } catch {
      setNotice({ text: 'Not saved: the dev server did not answer.' });
    }
  };
  const savePage = () => {
    if (!real) return;
    // blocks this page uses that exist only here: not yet in detail/blocks/saved
    const unsaved = [...new Set(doc.blocks.filter((b): b is Extract<Block, { type: 'custom' }> => b.type === 'custom').map(b => b.name))].filter(n => !savedNames.includes(n));
    setConfirm({
      what: `Save ${real.name}’s page`, files: [`src/products/pages/${real.slug}.ts`, 'src/products/pages/index.ts'],
      warn: `This page replaces the blocks data.ts lists for ${real.name}.${unsaved.length ? ` It uses ${unsaved.join(', ')}, written here: save ${unsaved.length > 1 ? 'those' : 'that'} too, or the page shows nothing in ${unsaved.length > 1 ? 'their places' : 'its place'}.` : ''}`,
      body: { kind: 'page', slug: real.slug, blocks: doc.blocks },
    });
  };
  const saveBlock = (w: WrittenBlock) => setConfirm({
    what: `Save ${w.name}`, files: [`src/products/detail/blocks/saved/${w.name}.tsx`, ...(w.css.trim() ? [`src/products/detail/blocks/saved/${w.name}.css`] : []), 'src/products/detail/blocks/saved/index.ts', 'src/products/detail/blocks/saved/names.ts'],
    warn: 'This becomes real code in your repository, and it runs as soon as it is written: on every page of this dev server that uses it, outside the sandbox, with the dev server’s reach. Read every line before you write it.',
    body: { kind: 'block', name: w.name, code: w.code, css: w.css },
  });

  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(print(doc.blocks as unknown as Literal)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }, () => setNotice({ text: 'Copy is blocked here: select the page code and copy it.' }));

  const choose = (t: Template) => { dispatch({ do: 'template', t: structuredClone(t) }); startDialog.current?.close(); setTab('block'); };
  const setKind = (kind: Kind) => dispatch({ do: 'meta', meta: { kind, ...(doc.meta.sample ? { stage: STAGE_FOR[kind] } : {}) } });

  const found = (q: string) => CATALOG.filter(e => !q || `${e.name} ${e.use} ${e.type}`.toLowerCase().includes(q.toLowerCase()));
  const nameOf = (b: Block) => ('label' in b && typeof b.label === 'string' && b.label) || (b.type === 'custom' ? b.name : entry(b.type)?.name ?? b.type);
  const removeAt = (i: number) => {
    const b = doc.blocks[i];
    if (!b) return;
    dispatch({ do: 'remove', i });
    setNotice({ text: `Removed ${nameOf(b)}.`, passing: true, before: doc });
  };

  return (
    <div
      className="pg" data-pane={pane} data-full={full ? '' : undefined} data-left={layout.leftOpen ? undefined : 'closed'} data-right={layout.rightOpen ? undefined : 'closed'}
      style={{ '--pg-left': `${leftWidth}px`, '--pg-right': `${rightWidth}px`, '--pg-split': `${layout.split * 100}%` } as React.CSSProperties}
    >
      <header className="pg-bar">
        <a className="pg-mark" href="/products" aria-label="Back to products">Playground<span>.</span></a>
        <button type="button" className="pg-pill" onClick={() => startDialog.current?.showModal()}>
          <span className="pg-sw" style={{ background: doc.meta.brand }} aria-hidden="true" />
          {real ? real.name : STARTERS.find(t => t.id === s.template)?.name ?? 'Your page'} <span aria-hidden="true" className="pg-dim">▾</span>
          <span className="pp-sr">: start from another page</span>
        </button>
        <label className="pg-color" title="The product's colour">
          <span className="pp-sr">Product colour</span>
          <input type="color" value={doc.meta.brand} onChange={e => dispatch({ do: 'meta', meta: { brand: e.target.value.toUpperCase() } })} />
        </label>
        <div className="pg-seg pp-mono" role="radiogroup" aria-label="Kind">
          {(Object.keys(KINDS) as Kind[]).map(k => (
            <button key={k} type="button" role="radio" aria-checked={doc.meta.kind === k} disabled={!doc.meta.sample && doc.meta.kind !== k} title={!doc.meta.sample ? 'A real product keeps its kind' : undefined} onClick={() => setKind(k)}>{KIND_NAMES[k]}</button>
          ))}
        </div>
        <span className="pg-grow" />
        <div className="pg-lay">
          <button type="button" className="pg-icon" aria-pressed={layout.leftOpen} aria-controls="pg-left" onClick={() => toggle('left')} aria-label="Blocks pane" title={`Show or hide the blocks (${MOD}B)`}><Icon name="left" /></button>
          <button type="button" className="pg-icon" aria-pressed={layout.rightOpen} aria-controls="pg-right" onClick={() => toggle('right')} aria-label="Edit pane" title={`Show or hide the edit pane (${ALT}${MOD}B)`}><Icon name="right" /></button>
        </div>
        <button type="button" className="pg-icon" onClick={() => dispatch({ do: 'undo' })} disabled={!s.past.length} aria-label="Undo" title={`Undo (${MOD}Z)`}><Icon name="undo" /></button>
        <button type="button" className="pg-icon" onClick={() => dispatch({ do: 'redo' })} disabled={!s.future.length} aria-label="Redo" title={`Redo (${SHIFT}${MOD}Z)`}><Icon name="redo" /></button>
        <button type="button" className="pg-pill" onClick={copy}>{copied ? 'Copied' : 'Copy code'}</button>
        {TOKEN && <button type="button" className="pg-pill pg-pill--solid" onClick={savePage} disabled={!real} title={real ? `Write ${real.name}’s page into the repository` : 'Save writes a real product’s page: remix one to save it'}>Save page</button>}
      </header>

      <nav className="pg-panes pp-mono" aria-label="Panes">
        {(['blocks', 'canvas', 'edit'] as const).map(p => <button key={p} type="button" aria-pressed={pane === p} onClick={() => setPane(p)}>{p === 'blocks' ? 'Blocks' : p === 'canvas' ? 'Page' : 'Edit'}</button>)}
      </nav>

      {notice && (
        <p className={`pg-notice${notice.passing ? ' pg-notice--toast' : ''}`} role="status">
          <span>{notice.text}</span>
          <span className="pg-acts">
            {notice.before && s.past.at(-1) === notice.before && <button type="button" className="pg-pill pg-pill--small" onClick={() => { dispatch({ do: 'undo' }); setNotice(null); }}>Undo</button>}
            <button type="button" className="pg-x" onClick={() => setNotice(null)} aria-label="Dismiss" title="Dismiss"><Icon name="close" /></button>
          </span>
        </p>
      )}

      <aside className="pg-left" id="pg-left" aria-label="Blocks">
        <section className="pg-layers" id="pg-layers" aria-labelledby="pg-layers-h">
          <div className="pg-pane-head">
            <h2 className="pg-h pp-mono" id="pg-layers-h">On this page · {doc.blocks.length}</h2>
            <button type="button" className="pg-x pg-pane-x" onClick={() => toggle('left', 'inside')} aria-label="Hide the blocks" title={`Hide the blocks (${MOD}B)`}><Icon name="close" /></button>
          </div>
          <ol ref={layers} className="pg-layer-list">
            {doc.blocks.map((b, i) => (
              <li key={doc.keys[i]} className="pg-layer" data-at={layerAt === i ? '' : undefined}>
                <button
                  type="button" className="pg-layer-btn" aria-current={selected === i ? 'true' : undefined}
                  onPointerDown={e => beginDrag(e, { move: i }, nameOf(b))}
                  onClick={() => { if (dragged.current) return; dispatch({ do: 'select', i }); canvas.current?.scrollTo(i); setTab('block'); }}
                  onKeyDown={e => {
                    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); dispatch({ do: 'move', from: i, to: i + (e.key === 'ArrowUp' ? -1 : 1) }); }
                    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeAt(i); }
                  }}
                  aria-describedby="pg-layer-keys"
                >
                  <span className="pg-grip" aria-hidden="true">⋮⋮</span>
                  <span className="pg-layer-name">{nameOf(b)}</span>
                  <span className="pg-layer-n pp-mono">{b.type === 'custom' ? 'yours' : b.type}</span>
                  {faults[doc.keys[i]] !== undefined && <span className="pg-layer-bad" title={faults[doc.keys[i]]}>!</span>}
                </button>
              </li>
            ))}
            {layerAt === doc.blocks.length && <li className="pg-layer pg-layer--end" data-at="" aria-hidden="true" />}
          </ol>
          {!doc.blocks.length && <p className="pg-empty">Drag a block onto the page, or pick one below.</p>}
          <p id="pg-layer-keys" className="pp-sr">Alt and an arrow key moves a block; Delete removes it.</p>
        </section>

        <Splitter
          axis="y" percent sign={1} value={layout.split * 100} min={SPLIT[0] * 100} max={SPLIT[1] * 100}
          onChange={v => setLayout({ split: v / 100 })} onReset={() => setLayout({ split: FRESH.split })}
          label="Resize the page's blocks against every block" controls="pg-layers"
        />

        <section className="pg-palette" aria-labelledby="pg-palette-h">
          <h2 className="pp-sr" id="pg-palette-h">Add a block</h2>
          <label className="pg-search">
            <span className="pp-sr">Find a block</span>
            <input
              ref={search} value={query} placeholder="Find a block" onChange={e => setQuery(e.target.value)} aria-describedby="pg-search-keys"
              onKeyDown={e => {
                if (e.key === 'Escape') { e.preventDefault(); if (query) setQuery(''); else e.currentTarget.blur(); }
                else if (e.key === 'Enter') { e.preventDefault(); const first = found(query).find(x => fits(x, doc.meta)); if (first) add(sample(first.type)); }
              }}
            />
            {query
              ? <button type="button" className="pg-x" onClick={() => { setQuery(''); search.current?.focus(); }} aria-label="Clear the search" title="Clear (Esc)"><Icon name="close" /></button>
              : <kbd aria-hidden="true">/</kbd>}
          </label>
          <p id="pg-search-keys" className="pp-sr">Enter adds the first block found, after the picked one. Esc clears the search.</p>
          {query && !found(query).length && <p className="pg-empty pg-none" role="status">No block matches “{query}”. Try a word for what it shows, like screens or code.</p>}
          {GROUPS.map(g => {
            const items = found(query).filter(e => e.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="pg-group-list">
                <h3 className="pg-h pp-mono">{g}</h3>
                {items.map(e => {
                  const ok = fits(e, doc.meta);
                  return (
                    <button
                      key={e.type} type="button" className="pg-entry" disabled={!ok}
                      title={ok ? `Add ${e.name} after the picked block, or drag it onto the page` : 'Needs a product whose stage is a live demo with scenes'}
                      onPointerDown={ev => ok && beginDrag(ev, { add: e.type }, e.name)}
                      onClick={() => { if (!dragged.current) add(sample(e.type)); }}
                    >
                      <Glyph rects={e.glyph} />
                      <span><b>{e.name}</b><small>{ok ? e.use : 'Needs a live demo with scenes'}</small></span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {written.length > 0 && (
            <div className="pg-group-list">
              <h3 className="pg-h pp-mono">Written here</h3>
              {written.map(w => (
                <button key={w.name} type="button" className="pg-entry" onClick={() => { let props: Literal = {}; try { props = parse(w.props); } catch { /* the props pane shows the error */ } add({ type: 'custom', name: w.name, label: w.name, props: props as Record<string, unknown> }); }}>
                  <Glyph rects={[[13, 7, 14, 14, 2], [17, 11, 6, 6, 1]]} />
                  <span><b>{w.name}</b><small>{built[w.name] === undefined ? 'Press Run to draw it' : built[w.name] ? 'Does not compile' : 'Written here · TSX'}</small></span>
                </button>
              ))}
            </div>
          )}
        </section>
      </aside>
      {layout.leftOpen && (
        <Splitter
          axis="x" sign={1} value={leftWidth} min={LEFT[0]} max={Math.min(LEFT[1], vw - rightWidth - CANVAS_MIN)}
          onChange={v => setLayout({ left: v })} onReset={() => setLayout({ left: null })} label="Resize the blocks pane" controls="pg-left"
        />
      )}

      <main className="pg-main" aria-label="The page">
        <div className="pg-canvas-bar">
          <div className="pg-seg pp-mono" role="radiogroup" aria-label="Canvas width">
            {WIDTHS.map(w => <button key={w} type="button" role="radio" aria-checked={width === w} onClick={() => setWidth(w)} title={WIDTH_NAMES[w]}>{w}</button>)}
          </div>
          <span className="pg-scale pp-mono" title="How large the page is drawn here">{Math.round(scale * 100)}%</span>
          <span className="pg-grow" />
          <button type="button" className="pg-icon" aria-pressed={full} onClick={full ? exitFull : enterFull} aria-label="Full screen" title={full ? 'Leave full screen (Esc)' : 'Full screen (F)'}><Icon name={full ? 'unfull' : 'full'} /></button>
        </div>
        <Canvas
          ref={canvas} product={product} keys={doc.keys} selected={selected} width={width}
          sources={sources} armed={armed} dropAt={dropAt} onScale={setScale}
          onPick={i => { dispatch({ do: 'select', i }); setTab('block'); }}
          onBuilt={(name, error) => setBuilt(b => ({ ...b, [name]: error }))}
          onFault={(i, message) => { const k = doc.keys[i]; if (k) setFaults(f => ({ ...f, [k]: message })); }}
          onTrouble={why => {
            setArmed(false);
            // keep the page now: a stuck canvas is left by closing the tab
            remember(s, written);
            setNotice({ text: why === 'stuck'
              ? 'The canvas stopped answering: a written block never stops running. Your page is saved.'
              : 'Something in the canvas tried to load another page, so the canvas was started again and written blocks were stopped. Press Run to draw them again.' });
          }}
        />
      </main>

      {layout.rightOpen && (
        <Splitter
          axis="x" sign={-1} value={rightWidth} min={RIGHT[0]} max={Math.min(RIGHT[1], vw - leftWidth - CANVAS_MIN)}
          onChange={v => setLayout({ right: v })} onReset={() => setLayout({ right: null })} label="Resize the edit pane" controls="pg-right"
        />
      )}
      <aside className="pg-right" id="pg-right" aria-label="Edit">
        <div className="pg-pane-head pg-pane-head--tabs">
          <div className="pg-tabs pp-mono" role="tablist" aria-label="Edit">
            {([['block', selected >= 0 ? 'Block' : 'Page settings'], ['page', 'Page code'], ['write', 'Write a block']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" id={`pg-tab-${id}`} aria-selected={tab === id} aria-controls={`pg-panel-${id}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <button type="button" className="pg-x pg-pane-x" onClick={() => toggle('right', 'inside')} aria-label="Hide the edit pane" title={`Hide the edit pane (${ALT}${MOD}B)`}><Icon name="close" /></button>
        </div>

        {tab === 'block' && (
          <div className="pg-panel" role="tabpanel" id="pg-panel-block" aria-labelledby="pg-tab-block">
            {current ? (
              <>
                <button type="button" className="pg-back pp-mono" onClick={() => dispatch({ do: 'select', i: -1 })} title="Back to the page’s own settings (Esc)"><Icon name="back" />Page settings</button>
                <div className="pg-block-head">
                  <div>
                    <p className="pp-mono pg-dim">{current.type === 'custom' ? `written here · ${current.name}` : entry(current.type)?.name}</p>
                    <h2 className="pg-title">{nameOf(current)}</h2>
                  </div>
                  <div className="pg-acts">
                    <button type="button" className="pg-icon" onClick={() => dispatch({ do: 'move', from: selected, to: selected - 1 })} disabled={selected === 0} aria-label="Move up" title="Move up (Alt+↑ in the list)"><Icon name="up" /></button>
                    <button type="button" className="pg-icon" onClick={() => dispatch({ do: 'move', from: selected, to: selected + 1 })} disabled={selected === doc.blocks.length - 1} aria-label="Move down" title="Move down (Alt+↓ in the list)"><Icon name="down" /></button>
                    <button type="button" className="pg-icon" onClick={() => dispatch({ do: 'duplicate', i: selected })} aria-label="Duplicate" title="Duplicate"><Icon name="copy" /></button>
                    <button type="button" className="pg-icon" onClick={() => removeAt(selected)} aria-label="Remove" title="Remove (Delete in the list)"><Icon name="remove" /></button>
                  </div>
                </div>
                {faults[doc.keys[selected]] && <p className="pg-fault" role="alert">It could not draw: {faults[doc.keys[selected]]}</p>}
                {entry(current.type) && <p className="pg-cap">{entry(current.type)!.use}.</p>}
                <BlockFields block={current} onChange={b => edit(selected, b as unknown as Block)} />
                <h3 className="pg-h pp-mono">As code</h3>
                <CodeEditor label="The block as code" value={one.text} onChange={one.onChange} error={one.error} rows={12} max={MAX_SOURCE} />
              </>
            ) : (
              <>
                <p className="pg-cap">Nothing picked: these are the page’s own settings. Pick a block on the page or in the list to edit it.</p>
                <div className="pg-fields">
                  {(['name', 'line', 'hook', 'hint', 'year', 'facts', 'stack'] as const).map(k => (
                    <Field key={k} name={k} value={doc.meta[k]} onChange={v => dispatch({ do: 'meta', meta: { [k]: v, ...(k === 'name' ? { lines: lines(String(v)) } : {}) } })} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'page' && (
          <div className="pg-panel pg-panel--code" role="tabpanel" id="pg-panel-page" aria-labelledby="pg-tab-page">
            <p className="pg-cap">The whole page. Drop or edit a block and this follows; type here and the page follows.</p>
            <CodeEditor label="The page as code" value={page.text} onChange={page.onChange} error={page.error} max={MAX_SOURCE} />
          </div>
        )}

        {tab === 'write' && (
          <div className="pg-panel pg-panel--code" role="tabpanel" id="pg-panel-write" aria-labelledby="pg-tab-write">
            <Write
              written={written} setWritten={setWritten} built={built} armed={armed}
              onRun={() => { setBuilt({}); setArmed(false); requestAnimationFrame(() => setArmed(true)); }}
              onAdd={w => { let props: Literal = {}; try { props = parse(w.props); } catch { /* shown below */ } add({ type: 'custom', name: w.name, label: w.name, props: props as Record<string, unknown> }); }}
              onSave={TOKEN ? saveBlock : undefined}
            />
          </div>
        )}
      </aside>

      {/* while dragging, nothing reaches the canvas's frame: the pointer stays with the editor over every browser's iframes */}
      {ghost && <div className="pg-shield" aria-hidden="true" />}
      {ghost && <div className="pg-ghost pp-mono" style={{ transform: `translate(${ghost.x + 14}px, ${ghost.y + 10}px)` }} aria-hidden="true">{ghost.label}</div>}

      <dialog ref={startDialog} className="pg-dialog" aria-labelledby="pg-start-h">
        <div className="pg-dialog-in">
          <div className="pg-dialog-top">
            <h2 id="pg-start-h" className="pg-big">Start a page<span className="pg-stop">.</span></h2>
            <button type="button" className="pg-icon" onClick={() => startDialog.current?.close()} aria-label="Close" title="Close (Esc)"><Icon name="close" /></button>
          </div>
          <p className="pg-cap">Pick a shape to start from, or remix a real product’s page. Starting again can be undone.</p>
          <h3 className="pg-h pp-mono">Shapes</h3>
          <ul className="pg-starts">
            {STARTERS.map(t => (
              <li key={t.id}>
                <button type="button" className="pg-start" onClick={() => choose(t)} style={{ '--sw': t.meta.brand } as React.CSSProperties}>
                  <Strip blocks={t.blocks} />
                  <b>{t.name}</b>
                  <small>{t.use}</small>
                </button>
              </li>
            ))}
          </ul>
          <h3 className="pg-h pp-mono">Real pages</h3>
          <ul className="pg-starts">
            {products.map(p => {
              const t = remix(p);
              return (
                <li key={p.slug}>
                  <button type="button" className="pg-start" onClick={() => choose(t)} style={{ '--sw': p.brand } as React.CSSProperties}>
                    <Strip blocks={t.blocks} />
                    <b>{p.name}</b>
                    <small>{t.use}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>

      {confirm && (
        <div className="pg-confirm" role="alertdialog" aria-modal="true" aria-labelledby="pg-confirm-h">
          <div className="pg-confirm-in">
            <h2 id="pg-confirm-h" className="pg-title">{confirm.what}?</h2>
            <p className="pg-cap">It writes:</p>
            <ul className="pg-files pp-mono">{confirm.files.map(f => <li key={f}>{f}</li>)}</ul>
            {confirm.warn && <p className="pg-warn">{confirm.warn}</p>}
            <div className="pg-acts">
              <button type="button" className="pg-pill" onClick={() => setConfirm(null)} ref={cancel}>Cancel</button>
              <button type="button" className="pg-pill pg-pill--solid" onClick={() => void save(confirm.body)}>Write the files</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A name broken for the hero: one line, or two near the middle. */
function lines(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [name.trim()];
  let best = 1, diff = Infinity;
  for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < diff) { diff = d; best = i; } }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** A page's blocks as a row of glyphs. */
function Strip({ blocks }: { blocks: Block[] }) {
  return (
    <span className="pg-strip" aria-hidden="true">
      {/* oxlint-disable-next-line react/no-array-index-key -- a still picture of a list that never reorders */}
      {blocks.map((b, i) => <Glyph key={i} rects={entry(b.type)?.glyph ?? []} />)}
      {!blocks.length && <span className="pg-dim pp-mono">empty</span>}
    </span>
  );
}


function Write({ written, setWritten, built, armed, onRun, onAdd, onSave }: {
  written: WrittenBlock[]; setWritten: (f: (w: WrittenBlock[]) => WrittenBlock[]) => void; built: Record<string, string | null>; armed: boolean;
  onRun: () => void; onAdd: (w: WrittenBlock) => void; onSave?: (w: WrittenBlock) => void;
}) {
  const [at, setAt] = useState(0);
  const [file, setFile] = useState<'code' | 'css' | 'props'>('code');
  const [name, setName] = useState('');
  const w = written[at];
  const set = (patch: Partial<WrittenBlock>) => setWritten(all => swapped(all, at, { ...all[at], ...patch }));
  const nameOk = NAME.test(name) && !written.some(x => x.name === name);
  let propsError: { line: number; message: string } | null = null;
  if (w && file === 'props') { try { parse(w.props); } catch (e) { if (e instanceof LiteralError) propsError = { line: e.line, message: e.message.replace(/ \(line \d+, column \d+\)$/, '') }; } }

  return (
    <div className="pg-write">
      <p className="pg-cap">A new block, in TSX, built from the system’s tokens and helpers. It runs only inside the sandboxed canvas, when you press Run.</p>
      <form className="pg-new" onSubmit={e => { e.preventDefault(); if (!nameOk) return; setWritten(all => [...all, starter(name)]); setAt(written.length); setName(''); setFile('code'); }}>
        <label className="pp-sr" htmlFor="pg-new-name">New block name</label>
        <input id="pg-new-name" className="pg-input" value={name} placeholder="Name, e.g. Plans" onChange={e => setName(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} aria-describedby="pg-new-hint" />
        <button type="submit" className="pg-pill" disabled={!nameOk}>New block</button>
        <small id="pg-new-hint" className="pg-dim">{name && !nameOk ? (written.some(x => x.name === name) ? 'That name is taken.' : 'A capital first, then letters and digits.') : 'A component name, like Plans.'}</small>
      </form>
      {written.length > 0 && (
        <div className="pg-seg pp-mono pg-written" role="tablist" aria-label="Written blocks">
          {written.map((x, i) => <button key={x.name} type="button" role="tab" aria-selected={i === at} onClick={() => setAt(i)}>{x.name}{built[x.name] ? ' !' : ''}</button>)}
        </div>
      )}
      {w && (
        <>
          <div className="pg-seg pp-mono" role="tablist" aria-label="File">
            <button type="button" role="tab" aria-selected={file === 'code'} onClick={() => setFile('code')}>{w.name}.tsx</button>
            <button type="button" role="tab" aria-selected={file === 'css'} onClick={() => setFile('css')}>{w.name}.css</button>
            <button type="button" role="tab" aria-selected={file === 'props'} onClick={() => setFile('props')}>Props</button>
          </div>
          {file === 'code' && <CodeEditor label={`${w.name}.tsx`} value={w.code} onChange={code => set({ code })} onRun={onRun} max={LIMITS.code} error={built[w.name] ? { line: Number(/\((\d+):\d+\)/.exec(built[w.name]!)?.[1] ?? 1), message: built[w.name]! } : null} />}
          {file === 'css' && <CodeEditor label={`${w.name}.css`} lang="css" value={w.css} onChange={css => set({ css })} onRun={onRun} max={LIMITS.css} />}
          {file === 'props' && <CodeEditor label="The props a new copy starts with" value={w.props} onChange={props => set({ props })} error={propsError} max={LIMITS.code} />}
          <div className="pg-acts pg-acts--wrap">
            <button type="button" className="pg-pill pg-pill--solid" onClick={onRun}>Run <kbd>⌘↵</kbd></button>
            <button type="button" className="pg-pill" onClick={() => onAdd(w)}>Add to the page</button>
            {onSave && <button type="button" className="pg-pill" onClick={() => onSave(w)} disabled={built[w.name] !== null} title={built[w.name] === null ? 'Write this block into the repository' : 'Run it first: only a block that compiled and drew in the canvas can be saved'}>Save block</button>}
            <button type="button" className="pg-pill pg-pill--quiet" onClick={() => { setWritten(all => spliced(all, at, 1)); setAt(0); }}>Delete</button>
          </div>
          <p className="pg-status pp-mono" role="status">{!armed ? 'Not running. Press Run.' : built[w.name] === undefined ? 'Running…' : built[w.name] ? 'Does not compile: see the marked line.' : 'Compiled and drawn in the canvas.'}</p>
        </>
      )}
    </div>
  );
}
