// A line diff, the way git shows one: which lines stayed, which went, which came. One function counts
// every "lines changed" on the products pages, so a demo's tally, a scene's cost and a diff block agree.

export interface Row { op: 'eq' | 'del' | 'add'; text: string }

const lines = (s: string) => (s.endsWith('\n') ? s.slice(0, -1) : s).split('\n');

/** The rows of a unified diff from `a` to `b` (longest common subsequence of lines; removals before additions). */
export function diffRows(a: string, b: string): Row[] {
  const x = lines(a), y = lines(b);
  const m: number[][] = Array.from({ length: x.length + 1 }, () => Array.from({ length: y.length + 1 }, () => 0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) m[i][j] = x[i] === y[j] ? m[i + 1][j + 1] + 1 : Math.max(m[i + 1][j], m[i][j + 1]);
  }
  const rows: Row[] = [];
  let i = 0, j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { rows.push({ op: 'eq', text: x[i] }); i++; j++; }
    else if (j >= y.length || (i < x.length && m[i + 1][j] >= m[i][j + 1])) rows.push({ op: 'del', text: x[i++] });
    else rows.push({ op: 'add', text: y[j++] });
  }
  return rows;
}

/** Runs of changed rows between unchanged ones, each as how many lines went and how many came. */
function hunks(rows: Row[]) {
  const out: { del: number; add: number }[] = [];
  let h: { del: number; add: number } | null = null;
  for (const r of rows) {
    if (r.op === 'eq') { h = null; continue; }
    if (!h) out.push((h = { del: 0, add: 0 }));
    h[r.op]++;
  }
  return out;
}

/** Lines changed, as git's gutter marks them: in each run of changes, a replaced line counts once. */
export const changed = (rows: Row[]) => hunks(rows).reduce((n, h) => n + Math.max(h.del, h.add), 0);

/** Lines changed from `a` to `b`. */
export const linesChanged = (a: string, b: string) => changed(diffRows(a, b));

/**
 * The gutter beside the new text: a mark for each of its lines ('mod' where it replaced a line, 'add' where
 * it is new), and the lines before which something was removed with nothing in its place.
 */
export function gutter(rows: Row[]) {
  const marks: ('same' | 'add' | 'mod')[] = [];
  const cuts = new Set<number>();
  let dels = 0;
  for (const r of rows) {
    if (r.op === 'del') { dels++; continue; }
    if (r.op === 'eq') {
      if (dels) cuts.add(marks.length);
      dels = 0;
      marks.push('same');
    } else if (dels) { dels--; marks.push('mod'); }
    else marks.push('add');
  }
  if (dels) cuts.add(marks.length);
  return { marks, cuts };
}
