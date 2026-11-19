// A small OpenUI Lang reader for the OpenUI Live Replies page. OpenUI's own parser is 109 kB gzipped, so the page
// reads the language itself: statements (`name = expression`), strings, numbers, booleans, null, lists, objects,
// component calls and references. It reads a program that is still streaming in (a statement counts once it is
// whole; a name not yet defined is "pending"), and `check()` reports problems in check_openui's own words, which
// oui.test.ts compares with the plugin's real output (check.gen.ts).
import { OUI_AVAILABLE, OUI_CHECK_SIG, OUI_PARAMS } from './check.gen';

/** A component call. `props` are its arguments by name, in the order the component declares them. */
export interface El { el: string; args: Val[]; props: Record<string, Val> }
/** A name that was used: resolved, it becomes what its statement holds. */
export interface Ref { ref: string }

export const isEl = (v: unknown): v is El => typeof v === 'object' && v !== null && 'el' in v;
export const isRef = (v: unknown): v is Ref => typeof v === 'object' && v !== null && 'ref' in v && Object.keys(v).length === 1;

/** Stands in for a name whose statement has not arrived yet (or never will). */
export const PENDING = { pending: true } as const;
export type Val = string | number | boolean | null | Val[] | { [k: string]: Val } | El | Ref | typeof PENDING;
export const isPending = (v: unknown): v is typeof PENDING => typeof v === 'object' && v !== null && 'pending' in v;

class Incomplete extends Error {}

/** The program's whole statements, in order. A last statement still being written is left out. */
export function statements(src: string): { id: string; expr: Val }[] {
  let i = 0;
  const out: { id: string; expr: Val }[] = [];
  const space = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const fail = (): never => { throw i >= src.length ? new Incomplete() : new SyntaxError(`unexpected ${src[i]} at ${i}`); };
  const word = () => { const m = /^[$@]?[A-Za-z_]\w*/.exec(src.slice(i)); if (!m) return fail(); i += m[0].length; return m[0]; };

  function str(): string {
    let s = '';
    for (i++; ; i++) {
      if (i >= src.length) throw new Incomplete();
      const c = src[i];
      if (c === '"') { i++; return s; }
      if (c !== '\\') { s += c; continue; }
      const e = src[++i];
      if (e === undefined) throw new Incomplete();
      if (e === 'u') { s += String.fromCharCode(parseInt(src.slice(i + 1, i + 5), 16)); i += 4; } else s += ({ n: '\n', t: '\t', r: '\r' } as Record<string, string>)[e] ?? e;
    }
  }
  function list<T>(close: string, item: () => T): T[] {
    const items: T[] = [];
    i++;
    for (;;) {
      space();
      if (i >= src.length) throw new Incomplete();
      if (src[i] === close) { i++; return items; }
      items.push(item());
      space();
      if (src[i] === ',') i++;
      else if (src[i] !== close) fail();
    }
  }
  function value(): Val {
    space();
    const c = src[i];
    if (c === undefined) throw new Incomplete();
    if (c === '"') return str();
    if (c === '[') return list(']', value);
    if (c === '{') {
      const obj: Record<string, Val> = {};
      list('}', () => {
        space();
        const key = src[i] === '"' ? str() : word();
        space();
        if (src[i] !== ':') fail();
        i++;
        obj[key] = value();
      });
      return obj;
    }
    const num = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(src.slice(i));
    if (num) {
      i += num[0].length;
      if (i >= src.length) throw new Incomplete(); // more digits may follow
      return Number(num[0]);
    }
    const w = word();
    if (w === 'true' || w === 'false') return w === 'true';
    if (w === 'null') return null;
    space();
    if (src[i] === '(') {
      const args = list(')', value);
      const props: Record<string, Val> = {};
      (OUI_PARAMS[w] ?? []).forEach((p, k) => { if (k < args.length) props[p.n] = args[k]; });
      return { el: w, args, props };
    }
    if (i >= src.length) throw new Incomplete(); // the name may still become a call
    return { ref: w };
  }

  for (;;) {
    space();
    if (i >= src.length) return out;
    const start = i;
    try {
      const id = word();
      space();
      if (src[i] !== '=') fail();
      i++;
      out.push({ id, expr: value() });
    } catch (e) {
      if (e instanceof Incomplete) return out;
      // a broken statement is skipped: on to the next line
      const next = src.indexOf('\n', Math.max(start, i));
      if (next < 0) return out;
      i = next + 1;
    }
  }
}

/**
 * The tree to draw: `root` with every name replaced by what its statement holds. A name with no statement (yet)
 * becomes PENDING, and so does a name that refers back to itself.
 */
export function resolve(src: string): Val {
  const defs = new Map(statements(src).map((s) => [s.id, s.expr]));
  const walk = (v: Val, seen: Set<string>): Val => {
    if (isRef(v)) {
      if (v.ref.startsWith('$')) return null;
      const def = defs.get(v.ref);
      if (def === undefined || seen.has(v.ref)) return PENDING;
      return walk(def, new Set(seen).add(v.ref));
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, seen));
    if (isEl(v)) {
      const args = v.args.map((x) => walk(x, seen));
      return { el: v.el, args, props: Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, walk(x, seen)])) };
    }
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, seen)]));
    return v;
  };
  const root = defs.get('root');
  return root === undefined ? PENDING : walk(root, new Set(['root']));
}

/** What a declared type admits, for the checks check_openui makes: a primitive, or a choice of strings. */
function expects(t: string): { kind: 'number' | 'string' | 'boolean' } | { kind: 'enum'; of: string[] } | null {
  if (t === 'number' || t === 'string' || t === 'boolean') return { kind: t };
  const parts = t.split('|').map((p) => p.trim());
  if (parts.every((p) => /^"[^"]*"$/.test(p))) return { kind: 'enum', of: parts.map((p) => p.slice(1, -1)) };
  return null;
}
const typeName = (v: Val) => (Array.isArray(v) ? 'array' : isEl(v) ? `component "${v.el}"` : v === null ? 'null' : typeof v);

/** Problems with a whole program, one per line, worded as check_openui words them; "" when it renders cleanly. */
export function check(src: string): string {
  const stmts = statements(src);
  const defs = new Map(stmts.map((s) => [s.id, s.expr]));
  if (!defs.has('root')) return 'No root: define `root = Stack(...)`.\nno-root in Stack: No root statement, and no statement calls the root component Stack';
  const errors: string[] = [];
  const undefinedNames: string[] = [];
  const reached = new Set<string>(['root']);

  const visit = (v: Val, at: string) => {
    if (isRef(v)) {
      if (v.ref.startsWith('$')) return;
      if (!defs.has(v.ref)) { undefinedNames.push(v.ref); return; }
      if (reached.has(v.ref)) return;
      reached.add(v.ref);
      visit(defs.get(v.ref)!, v.ref);
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, k) => visit(x, `${at}/${k}`)); return; }
    if (isEl(v)) {
      const params = OUI_PARAMS[v.el];
      if (!params) {
        errors.push(`unknown-component in ${at}: Unknown component "${v.el}" — not found in catalog or builtins. Available components: ${OUI_AVAILABLE}`);
        return;
      }
      params.forEach((p, k) => {
        const arg = v.args[k];
        const where = `${at}/${p.n}`;
        if (arg === undefined || arg === null) {
          if (p.req && OUI_CHECK_SIG[v.el]) errors.push(`missing-required in ${where}: missing required field "/${p.n}" — signature: ${OUI_CHECK_SIG[v.el]}`);
          return;
        }
        const want = expects(p.t);
        if (want && !isRef(arg)) {
          const ok = want.kind === 'enum' ? typeof arg === 'string' && want.of.includes(arg) : typeof arg === want.kind;
          if (!ok) {
            const wanted = want.kind === 'enum' ? `one of [${want.of.map((o) => JSON.stringify(o)).join(', ')}]` : want.kind;
            const got = want.kind === 'enum' && !isEl(arg) && !Array.isArray(arg) ? JSON.stringify(arg) : typeName(arg);
            errors.push(`type-mismatch in ${where}: field "/${p.n}" expects ${wanted} but got ${got}`);
            return;
          }
        }
        visit(arg, where);
      });
      return;
    }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, `${at}/${k}`);
  };
  visit(defs.get('root')!, 'root');

  const lines = [...errors];
  if (undefinedNames.length) lines.push(`Undefined names: ${undefinedNames.join(', ')}`);
  const orphans = stmts.map((s) => s.id).filter((id) => !reached.has(id));
  if (orphans.length) lines.push(`Not reachable from root (won't render): ${orphans.join(', ')}`);
  return lines.join('\n');
}
