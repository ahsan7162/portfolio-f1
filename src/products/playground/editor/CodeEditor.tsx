// A code pane: a plain textarea over a highlighted copy of its text, with line numbers and a marked error line.
// The highlight is built from React text nodes, never HTML, so nothing typed can become markup in the editor.
import { useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react';

type Lang = 'ts' | 'css';
type Tok = [kind: string, text: string];

const TS = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|`(?:\\.|[^`\\])*`?)|(\b\d[\d_.]*(?:e[+-]?\d+)?\b)|(\b(?:import|from|export|const|let|var|function|return|if|else|for|while|of|in|as|type|interface|new|true|false|null|undefined|default|extends|typeof|keyof|async|await)\b)|(<\/?[A-Za-z][\w.]*|\/?>)|((?<![\w$])[A-Za-z_$][\w$]*(?=\s*:(?!:)))/g;
const CSS = /(\/\*[\s\S]*?(?:\*\/|$))|('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?)|(-?\b\d[\d.]*(?:px|rem|em|s|ms|%|vw|vh|ch|fr)?\b)|(var\(--[\w-]+\)|--[\w-]+)|([.#][\w-]+|@[\w-]+)|((?<![\w-])[a-z-]+(?=\s*:))/g;
const KINDS: Record<Lang, string[]> = { ts: ['c', 's', 'n', 'k', 't', 'p'], css: ['c', 's', 'n', 'v', 't', 'p'] };

/** The text cut into highlighted pieces; each keeps its offset, which is its key. Linear in the text's length. */
export function tokens(src: string, lang: Lang): (Tok & { at: number })[] {
  const out: (Tok & { at: number })[] = [];
  let at = 0;
  const push = (kind: string, text: string, from: number) => out.push(Object.assign([kind, text] as Tok, { at: from }));
  for (const m of src.matchAll(lang === 'ts' ? TS : CSS)) {
    if (m.index > at) push('', src.slice(at, m.index), at);
    const g = m.slice(1).findIndex(x => x !== undefined);
    push(KINDS[lang][g] ?? '', m[0], m.index);
    at = m.index + m[0].length;
  }
  if (at < src.length) push('', src.slice(at), at);
  return out;
}

export function CodeEditor({ value, onChange, lang = 'ts', label, error, onRun, rows, max }: {
  value: string; onChange: (v: string) => void; lang?: Lang; label: string;
  /** The most characters the pane takes: what the canvas or the parser would refuse anyway. */
  max: number;
  /** The line to mark, and why. */
  error?: { line: number; message: string } | null;
  onRun?: () => void;
  /** A fixed height in lines; without it the pane fills its box. */
  rows?: number;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const shown = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const toks = useMemo(() => tokens(value, lang), [value, lang]);
  const lines = value.split('\n').length;

  const sync = () => {
    const a = area.current;
    if (!a) return;
    if (shown.current) shown.current.style.transform = `translate(${-a.scrollLeft}px, ${-a.scrollTop}px)`;
    if (gutter.current) gutter.current.style.transform = `translateY(${-a.scrollTop}px)`;
  };
  useLayoutEffect(sync, [value]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const a = e.currentTarget;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onRun) { e.preventDefault(); onRun(); return; }
    // Escape lets Tab leave the pane, as a keyboard user expects; otherwise Tab indents
    if (e.key === 'Escape') { a.blur(); return; }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = a;
      onChange(value.slice(0, s) + '  ' + value.slice(end));
      requestAnimationFrame(() => { a.selectionStart = a.selectionEnd = s + 2; });
    } else if (e.key === 'Enter' && !e.shiftKey) {
      const s = a.selectionStart;
      const line = value.slice(value.lastIndexOf('\n', s - 1) + 1, s);
      const indent = /^\s*/.exec(line)![0] + (/[[{(]\s*$/.test(line) ? '  ' : '');
      if (!indent) return;
      e.preventDefault();
      onChange(value.slice(0, s) + '\n' + indent + value.slice(a.selectionEnd));
      requestAnimationFrame(() => { a.selectionStart = a.selectionEnd = s + 1 + indent.length; });
    }
  };

  return (
    <div className="pg-code" data-error={error ? '' : undefined} style={rows ? { height: `calc(${rows} * var(--pg-lh) + 2 * var(--sp-12))` } : undefined}>
      <div className="pg-code-gutter" aria-hidden="true">
        <div ref={gutter}>
          {Array.from({ length: lines }, (_, i) => i + 1).map(n => <span key={n} data-bad={error?.line === n ? '' : undefined}>{n}</span>)}
        </div>
      </div>
      <div className="pg-code-body">
        <pre className="pg-code-shown" ref={shown} aria-hidden="true">
          {toks.map(tk => (tk[0] ? <span key={tk.at} className={`pg-t-${tk[0]}`}>{tk[1]}</span> : <span key={tk.at}>{tk[1]}</span>))}
          {'\n'}
        </pre>
        <textarea
          ref={area} className="pg-code-area" value={value} spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off"
          aria-label={label} aria-invalid={error ? true : undefined} wrap="off" maxLength={max}
          onChange={e => onChange(e.target.value)} onScroll={sync} onKeyDown={onKey}
        />
      </div>
      {error && <p className="pg-code-error" role="status">Line {error.line}: {error.message}</p>}
    </div>
  );
}
