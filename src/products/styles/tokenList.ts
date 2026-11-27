// Reads tokens.css into a list: each token's name, value, the note written beside it, and the section it sits in.
// The reference page (/products/system) draws from this, and tokens.test.ts checks with it, so neither can drift.

export interface Token { name: string; value: string; note: string; section: string }

export function parseTokens(css: string): Token[] {
  const out: Token[] = [];
  let section = '';
  let note = '';
  for (const raw of css.split('\n')) {
    const line = raw.trim();
    const head = /^\/\* ---- (.+?) ---- \*\/$/.exec(line);
    if (head) { section = head[1]!; note = ''; continue; }
    const m = /^(--[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?$/.exec(line);
    if (m) { out.push({ name: m[1], value: m[2].trim(), note: m[3] ?? note, section }); note = ''; continue; }
    const c = /^\/\*\s*(.*?)\s*\*\/$/.exec(line);
    note = c ? c[1] : line ? '' : note;
  }
  return out;
}
