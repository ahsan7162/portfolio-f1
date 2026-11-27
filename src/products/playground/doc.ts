// The page being built: the product it belongs to, its blocks, and a key per block so the canvas keeps each
// block's identity across edits. Every change goes through act(), which keeps undo and redo.
import type { Block } from '../types';
import { KINDS } from '../types';
import { isLiteral } from './literal';
import { CATALOG, type Meta, type Template } from './catalog';
import { NAME, type Source } from './protocol';

const TYPES = new Set<string>([...CATALOG.map(e => e.type), 'custom']);

/**
 * Why a value cannot be a block, or null when it can. Only what the editor itself shows is checked (the type, the
 * label, a written block's name and props): anything else wrong only stops that block drawing, in the canvas.
 */
export function notABlock(b: unknown): string | null {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return 'a block is { type: …, … }';
  const o = b as Record<string, unknown>;
  if (typeof o.type !== 'string' || !TYPES.has(o.type)) return typeof o.type === 'string' ? `"${o.type}" is not a block type` : 'it needs a type';
  if ('label' in o && typeof o.label !== 'string') return 'its label must be text';
  if (o.type === 'custom') {
    if (typeof o.name !== 'string' || !NAME.test(o.name)) return 'a written block needs a name like Plans';
    if (!o.props || typeof o.props !== 'object' || Array.isArray(o.props)) return 'a written block needs props: { … }';
  }
  return null;
}

/** A product's own settings as the editor shows them: the fields it reads, of the right kinds. */
function isMeta(m: unknown): m is Meta {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
  const o = m as Record<string, unknown>;
  const texts = ['slug', 'name', 'line', 'hook', 'hint', 'stage'].every(k => typeof o[k] === 'string');
  const lists = ['lines', 'facts', 'stack'].every(k => Array.isArray(o[k]) && (o[k] as unknown[]).every(x => typeof x === 'string'));
  return texts && lists && typeof o.brand === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.brand) && typeof o.kind === 'string' && o.kind in KINDS && Number.isInteger(o.year) && Array.isArray(o.links);
}

export interface Doc { meta: Meta; blocks: Block[]; keys: string[] }
export interface State { doc: Doc; selected: number; past: Doc[]; future: Doc[]; template: string }

/** A copy of `a` with `del` items at `at` replaced by `add` (Array.prototype.toSpliced is ES2023, past this target). */
export const spliced = <T,>(a: readonly T[], at: number, del: number, ...add: T[]) => { const c = [...a]; c.splice(at, del, ...add); return c; };
/** A copy of `a` with item `i` set to `v`. */
export const swapped = <T,>(a: readonly T[], i: number, v: T) => { const c = [...a]; c[i] = v; return c; };

let next = 0;
const key = () => `b${(next++).toString(36)}`;

export function start(t: Template): State {
  return { doc: { meta: t.meta, blocks: t.blocks, keys: t.blocks.map(key) }, selected: -1, past: [], future: [], template: t.id };
}

export type Action =
  | { do: 'insert'; block: Block; at: number }
  | { do: 'move'; from: number; to: number }
  | { do: 'remove'; i: number }
  | { do: 'duplicate'; i: number }
  | { do: 'update'; i: number; block: Block }
  | { do: 'blocks'; blocks: Block[] }
  | { do: 'meta'; meta: Partial<Meta> }
  | { do: 'select'; i: number }
  | { do: 'undo' }
  | { do: 'redo' }
  | { do: 'template'; t: Template }
  | { do: 'load'; state: State };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const HISTORY = 100;

export function act(s: State, a: Action): State {
  const { doc } = s;
  const commit = (d: Doc, selected = s.selected): State => ({ ...s, doc: d, selected, past: [...s.past, doc].slice(-HISTORY), future: [] });
  switch (a.do) {
    case 'insert': {
      const at = clamp(a.at, 0, doc.blocks.length);
      return commit({ ...doc, blocks: spliced(doc.blocks, at, 0, a.block), keys: spliced(doc.keys, at, 0, key()) }, at);
    }
    case 'move': {
      const from = a.from, to = clamp(a.to, 0, doc.blocks.length - 1);
      if (from === to || from < 0 || from >= doc.blocks.length) return s;
      const blocks = spliced(spliced(doc.blocks, from, 1), to, 0, doc.blocks[from]);
      const keys = spliced(spliced(doc.keys, from, 1), to, 0, doc.keys[from]);
      return commit({ ...doc, blocks, keys }, to);
    }
    case 'remove': {
      if (a.i < 0 || a.i >= doc.blocks.length) return s;
      const left = doc.blocks.length - 1;
      return commit({ ...doc, blocks: spliced(doc.blocks, a.i, 1), keys: spliced(doc.keys, a.i, 1) }, left ? Math.min(a.i, left - 1) : -1);
    }
    case 'duplicate': {
      const b = doc.blocks[a.i];
      if (!b) return s;
      return commit({ ...doc, blocks: spliced(doc.blocks, a.i + 1, 0, structuredClone(b)), keys: spliced(doc.keys, a.i + 1, 0, key()) }, a.i + 1);
    }
    case 'update': {
      if (!doc.blocks[a.i]) return s;
      // a change of type is a different block: it gets a new key, so the canvas draws it fresh
      const k = doc.blocks[a.i].type === a.block.type ? doc.keys[a.i] : key();
      return commit({ ...doc, blocks: swapped(doc.blocks, a.i, a.block), keys: swapped(doc.keys, a.i, k) });
    }
    case 'blocks': {
      // from the page's code: a block keeps its key while the same type sits at the same place
      const keys = a.blocks.map((b, i) => (doc.blocks[i]?.type === b.type ? doc.keys[i] : key()));
      return commit({ ...doc, blocks: a.blocks, keys }, s.selected < a.blocks.length ? s.selected : -1);
    }
    case 'meta':
      return commit({ ...doc, meta: { ...doc.meta, ...a.meta } });
    case 'select':
      return { ...s, selected: clamp(a.i, -1, doc.blocks.length - 1) };
    case 'undo': {
      const prev = s.past.at(-1);
      return prev ? { ...s, doc: prev, past: s.past.slice(0, -1), future: [doc, ...s.future], selected: Math.min(s.selected, prev.blocks.length - 1) } : s;
    }
    case 'redo': {
      const [nxt, ...rest] = s.future;
      return nxt ? { ...s, doc: nxt, past: [...s.past, doc], future: rest, selected: Math.min(s.selected, nxt.blocks.length - 1) } : s;
    }
    case 'template':
      // starting again can be undone, like any other change
      return { ...commit({ meta: a.t.meta, blocks: a.t.blocks, keys: a.t.blocks.map(key) }, -1), template: a.t.id };
    case 'load':
      return a.state;
  }
}

/** What is kept between visits, in this browser only: the page and the blocks being written. */
export interface Saved { v: 1; template: string; meta: Meta; blocks: Block[]; sources: Source[] }
const STORE = 'products-playground';

export function remember(s: State, sources: Source[]) {
  const out: Saved = { v: 1, template: s.template, meta: s.doc.meta, blocks: s.doc.blocks, sources };
  try { localStorage.setItem(STORE, JSON.stringify(out)); } catch { /* private window or full: the page still works */ }
}

/** The last visit's page, if it is still plain data of the right shape. Anything else is ignored. */
export function recall(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (!isLiteral(v) || typeof v !== 'object' || v === null) return null;
    const s = v as Partial<Saved>;
    if (s.v !== 1 || typeof s.template !== 'string' || !isMeta(s.meta) || !Array.isArray(s.blocks) || !Array.isArray(s.sources)) return null;
    if (!s.blocks.every(b => notABlock(b) === null)) return null;
    const sources = (s.sources as unknown[]).filter((x): x is Source & { props: string } => {
      const o = x as Record<string, unknown> | null;
      return !!o && typeof o.name === 'string' && NAME.test(o.name) && typeof o.code === 'string' && typeof o.css === 'string' && (o.props === undefined || typeof o.props === 'string');
    });
    return { ...(s as Saved), sources };
  } catch {
    return null;
  }
}

export function forget() {
  try { localStorage.removeItem(STORE); } catch { /* nothing kept */ }
}
