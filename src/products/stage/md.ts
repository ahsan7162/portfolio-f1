// Markwright's document as the demo models it: a list of top-level blocks, each keeping the exact source it
// was read from. An edit rewrites only the block it touches, in the serializer's own style, as the plugin's
// save does; every other block keeps its bytes. The file is the blocks joined by blank lines. Only the
// Markdown the demo and the plugin's templates use is read. No browser code, so tests can import it.

export const CALLOUTS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const;
export type Callout = (typeof CALLOUTS)[number];

export interface Item { text: string; /** Set on a checklist item: ticked or not. */ done?: boolean }

export type MdBlock =
  | { t: 'h'; level: number; text: string }
  | { t: 'p'; text: string }
  | { t: 'quote'; text: string; callout?: Callout }
  | { t: 'list'; ordered: boolean; items: Item[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'code'; lang: string; code: string }
  | { t: 'hr' };

export interface Part { id: number; b: MdBlock; src: string }
export interface Doc { parts: Part[]; next: number }

const ITEM = /^([-*+]|\d+[.)])(?: (.*))?$/;
const TASK = /^\[([ xX])\](?: (.*))?$/;
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** A block read from its source. */
export function read(src: string): MdBlock {
  const ls = src.split('\n');
  const first = ls[0];
  const h = /^(#{1,6})(?: (.*))?$/.exec(first);
  if (h) return { t: 'h', level: h[1].length, text: h[2] ?? '' };
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(first)) return { t: 'hr' };
  const fence = /^```(\S*)/.exec(first);
  if (fence) return { t: 'code', lang: fence[1], code: ls.slice(1, ls.at(-1)?.startsWith('```') ? -1 : undefined).join('\n') };
  if (first.startsWith('>')) {
    const body = ls.map((l) => l.replace(/^> ?/, ''));
    const c = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i.exec(body[0]);
    return c ? { t: 'quote', callout: c[1].toUpperCase() as Callout, text: body.slice(1).join('\n') } : { t: 'quote', text: body.join('\n') };
  }
  if (first.startsWith('|') && ls.length > 1) return { t: 'table', head: cells(first), rows: ls.slice(2).map(cells) };
  const m = ITEM.exec(first);
  if (m) {
    const items: Item[] = [];
    for (const l of ls) {
      const it = ITEM.exec(l);
      if (!it) { const last = items.at(-1); if (last) last.text += `\n${l.trim()}`; continue; }
      const task = TASK.exec(it[2] ?? '');
      items.push(task ? { text: task[2] ?? '', done: task[1] !== ' ' } : { text: it[2] ?? '' });
    }
    return { t: 'list', ordered: /\d/.test(m[1]), items };
  }
  return { t: 'p', text: src };
}

/** A block written in the serializer's own style: `#` headings, `-` bullets, `1.` numbers, padded tables. */
export function write(b: MdBlock): string {
  switch (b.t) {
    case 'h': return `${'#'.repeat(b.level)} ${b.text}`;
    case 'p': return b.text;
    case 'hr': return '---';
    case 'code': return `\`\`\`${b.lang}\n${b.code}\n\`\`\``;
    case 'quote': {
      const body = b.callout ? [`[!${b.callout}]`, ...b.text.split('\n')] : b.text.split('\n');
      return body.map((l) => (l ? `> ${l}` : '>')).join('\n');
    }
    case 'list': return b.items.map((it, i) => {
      const mark = b.ordered ? `${i + 1}.` : it.done === undefined ? '-' : `- [${it.done ? 'x' : ' '}]`;
      return it.text ? `${mark} ${it.text}` : mark;
    }).join('\n');
    case 'table': {
      const w = b.head.map((h, c) => Math.max(3, h.length, ...b.rows.map((r) => (r[c] ?? '').length)));
      const row = (r: string[]) => `| ${w.map((n, c) => (r[c] ?? '').padEnd(n)).join(' | ')} |`;
      return [row(b.head), `| ${w.map((n) => '-'.repeat(n)).join(' | ')} |`, ...b.rows.map(row)].join('\n');
    }
  }
}

/** The file's top-level blocks, as their source text. A fence holds its blank lines; a heading stands alone. */
function chunks(text: string): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  let fence = false;
  const flush = () => { if (cur.length) out.push(cur.join('\n')); cur = []; };
  for (const l of (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')) {
    if (fence) {
      cur.push(l);
      if (/^```\s*$/.test(l)) { fence = false; flush(); }
    } else if (l.startsWith('```')) { flush(); fence = true; cur.push(l); }
    else if (!l.trim()) flush();
    else if (/^#{1,6}( |$)/.test(l)) { flush(); out.push(l); }
    else cur.push(l);
  }
  flush();
  return out;
}

export function parse(text: string): Doc {
  const parts = chunks(text).map((src, id) => ({ id, b: read(src), src }));
  return { parts, next: parts.length };
}

/** The file on disk: every block's source, a blank line between them. */
export const fileOf = (d: Doc) => `${d.parts.map((p) => p.src).join('\n\n')}\n`;

/** One block changed: only it is rewritten. */
export function change(d: Doc, id: number, f: (b: MdBlock) => MdBlock): Doc {
  return { ...d, parts: d.parts.map((p) => { if (p.id !== id) return p; const b = f(p.b); return { id, b, src: write(b) }; }) };
}

/** New blocks after the block `id` (or at the end), written fresh. */
export function insert(d: Doc, after: number | null, bs: MdBlock[]): Doc {
  const at = after === null ? d.parts.length : d.parts.findIndex((p) => p.id === after) + 1;
  const fresh = bs.map((b, i) => ({ id: d.next + i, b, src: write(b) }));
  return { parts: [...d.parts.slice(0, at), ...fresh, ...d.parts.slice(at)], next: d.next + bs.length };
}

export const toggleTask = (d: Doc, id: number, i: number) => change(d, id, (b) => (b.t !== 'list' ? b : {
  ...b, items: b.items.map((it, j) => (j === i ? { ...it, done: !it.done } : it)),
}));

export const setCell = (d: Doc, id: number, r: number, c: number, v: string) => change(d, id, (b) => (b.t !== 'table' ? b : {
  ...b, rows: b.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)),
}));

export const addRow = (d: Doc, id: number, row: string[]) => change(d, id, (b) => (b.t !== 'table' ? b : { ...b, rows: [...b.rows, row] }));

/** The first block matching `test`, for the demo and its scenes to aim at. */
export const find = (d: Doc, test: (b: MdBlock) => boolean) => d.parts.find((p) => test(p.b));
