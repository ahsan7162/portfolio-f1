// The page as code: a reader and a writer for the plain data a page is made of.
// The playground never runs a page's code. It reads it with parse(), which knows only literals
// (objects, arrays, strings, numbers, true, false, null, comments, trailing commas), so typing into
// the code pane can never execute anything. The dev save endpoint reads with the same parse().

export type Literal = string | number | boolean | null | Literal[] | { [key: string]: Literal };

export class LiteralError extends Error {
  constructor(message: string, readonly line: number, readonly col: number) {
    super(`${message} (line ${line}, column ${col})`);
  }
}

/** Keys that would reach an object's prototype. Refused, so parsed data can never change how objects behave. */
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 64;
export const MAX_SOURCE = 1_000_000;

const IDENT = /^[A-Za-z_$][\w$]*$/;

/**
 * Reads a literal. A leading `export const blocks: Block[] =` or `blocks:` is allowed, and so is a closing `;`,
 * so a page copied from data.ts reads as it is.
 */
export function parse(source: string): Literal {
  if (source.length > MAX_SOURCE) throw new LiteralError('The code is too long', 1, 1);
  let i = 0;

  const where = (at: number) => {
    let line = 1, col = 1;
    for (let k = 0; k < at && k < source.length; k++) {
      if (source[k] === '\n') { line++; col = 1; } else col++;
    }
    return [line, col] as const;
  };
  const fail = (message: string, at = i): never => { const [l, c] = where(at); throw new LiteralError(message, l, c); };

  const skip = () => {
    for (;;) {
      const ch = source[i];
      if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') { i++; continue; }
      if (ch === '/' && source[i + 1] === '/') { while (i < source.length && source[i] !== '\n') i++; continue; }
      if (ch === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        if (end < 0) fail('A comment is not closed');
        i = end + 2;
        continue;
      }
      return;
    }
  };

  const string = (): string => {
    const quote = source[i];
    const start = i++;
    let out = '';
    while (i < source.length) {
      const ch = source[i];
      if (ch === quote) { i++; return out; }
      if (quote === '`' && ch === '$' && source[i + 1] === '{') fail('A template string cannot hold ${…}: write the text out');
      if (ch === '\n' && quote !== '`') fail('A string is not closed on its line', start);
      if (ch === '\\') {
        const e = source[i + 1];
        i += 2;
        const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0', '\\': '\\', "'": "'", '"': '"', '`': '`', '\n': '' };
        if (e !== undefined && e in simple) { out += simple[e]; continue; }
        if (e === 'u') {
          const braced = source[i] === '{';
          const hex = braced ? source.slice(i + 1, source.indexOf('}', i)) : source.slice(i, i + 4);
          if (!/^[0-9a-fA-F]{1,6}$/.test(hex) || (!braced && hex.length !== 4)) fail('A \\u escape needs hex digits', i);
          const code = parseInt(hex, 16);
          if (code > 0x10ffff) fail('A \\u escape is out of range', i);
          out += String.fromCodePoint(code);
          i += braced ? hex.length + 2 : 4;
          continue;
        }
        if (e === 'x') {
          const hex = source.slice(i, i + 2);
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) fail('A \\x escape needs two hex digits', i);
          out += String.fromCharCode(parseInt(hex, 16));
          i += 2;
          continue;
        }
        out += e ?? '';
        continue;
      }
      out += ch;
      i++;
    }
    return fail('A string is not closed', start);
  };

  const number = (): number => {
    const m = /^-?(?:\d[\d_]*)?(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
    if (!m || !m[0] || m[0] === '-' || m[0] === '.') fail('Expected a value');
    const n = Number(m![0].replaceAll('_', ''));
    if (!Number.isFinite(n)) fail('A number is out of range');
    i += m![0].length;
    return n;
  };

  const key = (): string => {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') return string();
    const m = /^[A-Za-z_$][\w$]*/.exec(source.slice(i));
    if (m) { i += m[0].length; return m[0]; }
    const n = /^\d+/.exec(source.slice(i));
    if (n) { i += n[0].length; return n[0]; }
    return fail('Expected a property name');
  };

  const value = (depth: number): Literal => {
    if (depth > MAX_DEPTH) fail('The data is nested too deeply');
    skip();
    const ch = source[i];
    if (ch === '{') {
      i++;
      const obj: { [key: string]: Literal } = {};
      for (;;) {
        skip();
        if (source[i] === '}') { i++; return obj; }
        const at = i;
        const k = key();
        if (FORBIDDEN.has(k)) fail(`"${k}" cannot be used as a property name`, at);
        if (Object.hasOwn(obj, k)) fail(`"${k}" is set twice`, at);
        skip();
        if (source[i] !== ':') fail('Expected ":" after a property name');
        i++;
        obj[k] = value(depth + 1);
        skip();
        if (source[i] === ',') { i++; continue; }
        if (source[i] === '}') { i++; return obj; }
        fail('Expected "," or "}"');
      }
    }
    if (ch === '[') {
      i++;
      const arr: Literal[] = [];
      for (;;) {
        skip();
        if (source[i] === ']') { i++; return arr; }
        arr.push(value(depth + 1));
        skip();
        if (source[i] === ',') { i++; continue; }
        if (source[i] === ']') { i++; return arr; }
        fail('Expected "," or "]"');
      }
    }
    if (ch === "'" || ch === '"' || ch === '`') return string();
    if (source.startsWith('true', i) && !/[\w$]/.test(source[i + 4] ?? '')) { i += 4; return true; }
    if (source.startsWith('false', i) && !/[\w$]/.test(source[i + 5] ?? '')) { i += 5; return false; }
    if (source.startsWith('null', i) && !/[\w$]/.test(source[i + 4] ?? '')) { i += 4; return null; }
    if (ch === '-' || ch === '.' || (ch !== undefined && ch >= '0' && ch <= '9')) return number();
    if (ch === undefined) return fail('The code ends before a value');
    const word = /^[A-Za-z_$][\w$.]*/.exec(source.slice(i))?.[0];
    return fail(word ? `"${word}" is code, not data: the playground reads only plain values` : `Unexpected "${ch}"`);
  };

  skip();
  // read in the first 300 characters only: a declaration is short, and this pattern backtracks on long runs of spaces
  const prefix = /^(?:export\s+)?(?:const|let)\s+[A-Za-z_$][\w$]*\s*(?::\s*[\w$<>[\]., ]+)?=|^[A-Za-z_$][\w$]*\s*:(?!:)/.exec(source.slice(i, i + 300));
  if (prefix) i += prefix[0].length;
  const out = value(0);
  skip();
  if (source[i] === ';') i++;
  skip();
  if (i < source.length) fail('Unexpected code after the value');
  return out;
}

const quote = (s: string) => {
  let out = "'";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === "'") out += "\\'";
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    // control and separator characters are written as escapes, so no character can end the string or the line early
    else if (c < 0x20 || c === 0x7f || c === 0x2028 || c === 0x2029) out += `\\u${c.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return out + "'";
};

/** Writes a literal as data.ts writes it: two-space indent, single quotes, bare keys, short lists on one line. */
export function print(v: Literal, indent = '', width = 110): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return quote(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('Only finite numbers can be written');
    return Object.is(v, -0) ? '0' : String(v);
  }
  if (typeof v === 'boolean') return String(v);
  const inner = indent + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const flat = `[${v.map(x => print(x, inner, Infinity)).join(', ')}]`;
    if (!flat.includes('\n') && indent.length + flat.length <= width) return flat;
    return `[\n${v.map(x => inner + print(x, inner, width)).join(',\n')},\n${indent}]`;
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  const k = (s: string) => (IDENT.test(s) ? s : quote(s));
  const flat = `{ ${keys.map(key => `${k(key)}: ${print(v[key], inner, Infinity)}`).join(', ')} }`;
  if (!flat.includes('\n') && indent.length + flat.length <= width) return flat;
  return `{\n${keys.map(key => `${inner}${k(key)}: ${print(v[key], inner, width)}`).join(',\n')},\n${indent}}`;
}

/** True when a value is made only of literals (no functions, no undefined, no NaN): what print() can write. */
export function isLiteral(v: unknown, depth = 0): v is Literal {
  if (depth > MAX_DEPTH) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(x => isLiteral(x, depth + 1));
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.entries(v).every(([k, x]) => !FORBIDDEN.has(k) && isLiteral(x, depth + 1));
  }
  return false;
}
