// Loop guards for a written block, so a loop that never ends throws instead of freezing the canvas. Every `while`
// and every three-part `for` (a do-while ends in a `while`) gets a call to `guard` in its condition. The code is
// read token by token (strings, template text, regular expressions and comments are skipped), so a word inside
// a string is never mistaken for a loop. A for-of or for-in loop walks a collection and is left alone.

const WORD = /[A-Za-z0-9_$]/;
/** After these, a slash starts a regular expression rather than dividing. */
const BEFORE_REGEX = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);

export function guardLoops(js: string, guard: string): string {
  const out: string[] = [];
  let i = 0;
  let prev = '';
  /** Indexes in `out` of each open "(" that began a loop's head, with what kind of loop it is. */
  const heads: { depth: number; kind: 'while' | 'for'; semis: number; at: number }[] = [];
  let depth = 0;
  let pending: 'while' | 'for' | null = null;

  const skipString = (q: string) => {
    let j = i + 1;
    while (j < js.length && js[j] !== q) {
      if (js[j] === '\\') j++;
      else if (q === '`' && js[j] === '$' && js[j + 1] === '{') {
        // a template's ${…} is code: read it with its own braces balanced
        let d = 1; j += 2;
        while (j < js.length && d > 0) {
          if (js[j] === '{') d++;
          else if (js[j] === '}') d--;
          else if (js[j] === '`' || js[j] === '"' || js[j] === "'") { const save = i; i = j; j = skipString(js[j]) - 1; i = save; }
          if (d > 0) j++;
        }
      }
      j++;
    }
    return j + 1;
  };

  while (i < js.length) {
    const ch = js[i];
    if (ch === '/' && js[i + 1] === '/') { const e = js.indexOf('\n', i); const end = e < 0 ? js.length : e; out.push(js.slice(i, end)); i = end; continue; }
    if (ch === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); const end = e < 0 ? js.length : e + 2; out.push(js.slice(i, end)); i = end; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { const end = skipString(ch); out.push(js.slice(i, end)); i = end; prev = 'str'; continue; }
    if (ch === '/' && BEFORE_REGEX.has(prev)) {
      let j = i + 1, inClass = false;
      while (j < js.length && (inClass || js[j] !== '/') && js[j] !== '\n') {
        if (js[j] === '\\') j++;
        else if (js[j] === '[') inClass = true;
        else if (js[j] === ']') inClass = false;
        j++;
      }
      j++;
      while (j < js.length && WORD.test(js[j])) j++;
      out.push(js.slice(i, j)); i = j; prev = 'regex'; continue;
    }
    if (WORD.test(ch)) {
      let j = i;
      while (j < js.length && WORD.test(js[j])) j++;
      const word = js.slice(i, j);
      // a property named while (x.while) is not a loop: the token before it is a dot
      if ((word === 'while' || word === 'for') && prev !== '.') pending = word;
      out.push(word); i = j; prev = word; continue;
    }
    if (ch === '(') {
      depth++;
      out.push(ch);
      if (pending) { heads.push({ depth, kind: pending, semis: 0, at: out.length }); pending = null; }
      i++; prev = '('; continue;
    }
    if (pending && !/\s/.test(ch)) pending = null; // `for await` and the like: only a word or a "(" may follow
    const head = heads.at(-1);
    if (ch === ';' && head && head.depth === depth && head.kind === 'for') {
      head.semis++;
      // the condition of for (init; cond; step) sits between the two ;s, and may be empty
      if (head.semis === 1) { out.push(`; ${guard}() && (`); head.at = out.length; }
      if (head.semis === 2) out.push(`${out.slice(head.at).join('').trim() ? '' : 'true'});`);
      i++; prev = ';'; continue;
    }
    if (ch === ')') {
      if (head && head.depth === depth) {
        heads.pop();
        if (head.kind === 'while') { out.splice(head.at, 0, `${guard}() && (`); out.push(')'); }
        // for (init; cond) with no step yet closed: nothing to do; a for-of or for-in has no ; and is left alone
      }
      depth--;
      out.push(ch); i++; prev = ')'; continue;
    }
    out.push(ch);
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return out.join('');
}

/** The guard itself: a loop that keeps running without a 50 ms breath for over 1.5 s throws. */
export function makeGuard(now = () => performance.now()) {
  let start = 0, last = -Infinity;
  return () => {
    const t = now();
    if (t - last > 50) start = t;
    last = t;
    if (t - start > 1500) throw new Error('A loop ran for over a second and a half without stopping, so it was stopped.');
    return true;
  };
}
