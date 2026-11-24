// Markwright's rich view, drawn: a block of the demo's document (stage/md.ts) as the plugin shows it, and a line
// of the file as plain text. Shared by the demo, its scenes and the template deck's live screens.
import type { ReactNode } from 'react';
import { Checkbox } from '@ui-sdk/react/checkbox';
import { Diagram } from './mdDiagrams';
import type { MdBlock, Part } from './md';

const MARKS = /\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)(?: "[^"]*")?\)|\*(.+?)\*|_(.+?)_/;

/** Inline Markdown (bold, italic, strike, code, links) as the editor shows it: formatted, with no syntax. */
export function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  for (let m = MARKS.exec(rest); m; m = MARKS.exec(rest)) {
    if (m.index) out.push(rest.slice(0, m.index));
    const k = `${key}${n++}`;
    const [, b1, b2, s, code, label, , i1, i2] = m;
    if (b1 ?? b2) out.push(<strong key={k}>{inline(b1 ?? b2, k)}</strong>);
    else if (s) out.push(<s key={k}>{inline(s, k)}</s>);
    else if (code) out.push(<code key={k}>{code}</code>);
    else if (label) out.push(<span key={k} className="mwd-link">{inline(label, k)}</span>);
    else out.push(<em key={k}>{inline(i1 ?? i2, k)}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) out.push(rest);
  return out;
}

/** What a block can do in the demo; a template card's blocks get none of it. */
export interface BlockHooks {
  onTick?: (part: Part, item: number) => void;
  /** The Mermaid block whose source is open (Edit diagram), and how to open or close one. */
  editing?: number | null;
  onEdit?: (id: number | null) => void;
}

/** Text with its line breaks kept. */
function lines(text: string, key: string) {
  const out: ReactNode[] = [];
  text.split('\n').forEach((l, i) => {
    // oxlint-disable-next-line react/no-array-index-key -- a break between lines, by position
    if (i) out.push(<br key={`${key}b${i}`} />);
    out.push(...inline(l, `${key}${i}`));
  });
  return out;
}

/** A Mermaid block's source, open above its diagram while Edit diagram is on. */
function MermaidSource({ code }: { code: string }) {
  return (
    <div className="mwd-mm-src" data-open="">
      <p className="mwd-mm-bar"><span>mermaid</span></p>
      {/* oxlint-disable-next-line react/no-array-index-key -- lines of source, by position */}
      <pre>{code.split('\n').map((l, i) => <span key={i} className="mwd-mm-line">{l}</span>)}</pre>
    </div>
  );
}

export function BlockView({ part, hooks }: { part: Part; hooks?: BlockHooks }) {
  const b: MdBlock = part.b;
  const key = `p${part.id}`;
  switch (b.t) {
    case 'h': {
      const H = `h${Math.min(b.level + 2, 6)}` as 'h3';
      return <H className="mwd-h" data-level={b.level}>{inline(b.text, key)}</H>;
    }
    case 'p': return <p className="mwd-p">{lines(b.text, key)}</p>;
    case 'hr': return <hr className="mwd-hr" />;
    case 'quote': return b.callout ? (
      <div className="mwd-callout" data-type={b.callout.toLowerCase()}>
        <span className="mwd-callout-tag">[!{b.callout}]</span>
        {b.text && <p>{lines(b.text, key)}</p>}
      </div>
    ) : <blockquote className="mwd-quote"><p>{lines(b.text, key)}</p></blockquote>;
    case 'list': {
      const tasks = b.items.some((it) => it.done !== undefined);
      const L = b.ordered ? 'ol' : 'ul';
      return (
        <L className="mwd-list" data-tasks={tasks ? '' : undefined}>
          {b.items.map((it, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- items have no ids; their place is who they are
            <li key={i} data-done={it.done ? '' : undefined}>
              {it.done !== undefined && (hooks?.onTick
                ? <Checkbox checked={it.done} className="mwd-box" data-i={i} aria-label={it.text || 'Task'} onCheckedChange={() => hooks.onTick?.(part, i)} />
                : <span className="mwd-box" data-on={it.done ? '' : undefined} aria-hidden="true" />)}
              <span className="mwd-li">{it.text ? lines(it.text, `${key}l${i}`) : ' '}</span>
            </li>
          ))}
        </L>
      );
    }
    case 'table': return (
      <div className="mwd-table-wrap">
        <table className="mwd-table">
          {/* oxlint-disable-next-line react/no-array-index-key -- cells, by column */}
          <thead><tr>{b.head.map((h, c) => <th key={c}>{inline(h, `${key}h${c}`)}</th>)}</tr></thead>
          {/* oxlint-disable-next-line react/no-array-index-key -- rows and cells, by position */}
          <tbody>{b.rows.map((r, i) => <tr key={i}>{b.head.map((_, c) => <td key={c}>{inline(r[c] ?? '', `${key}r${i}c${c}`)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    case 'code': {
      if (b.lang === 'mermaid') {
        const open = hooks?.editing === part.id;
        const edit = hooks?.onEdit;
        return (
          <div className="mwd-mermaid" data-open={open ? '' : undefined}>
            {open && <MermaidSource code={b.code} />}
            <div className="mwd-mermaid-card">
              <p className="mwd-mermaid-top">
                <span>Mermaid</span>
                {edit && (open
                  ? <button type="button" className="mwd-mini" data-done="" onClick={() => edit(null)}>Done</button>
                  : <button type="button" className="mwd-mini" onClick={() => edit(part.id)}>Edit diagram</button>)}
              </p>
              <Diagram code={b.code} />
            </div>
          </div>
        );
      }
      return <pre className="mwd-code"><code>{b.code}</code></pre>;
    }
  }
}

/** A line of the file, lightly marked the way a source view tints Markdown: the syntax dim, a heading's hashes bright. */
export function SourceLine({ text }: { text: string }) {
  const m = /^(#{1,6} |\s*(?:[-*+]|\d+[.)])(?: \[[ xX]\])? |> ?(?:\[![A-Z]+\])?|```\S*)(.*)$/.exec(text);
  // oxlint-disable-next-line react/no-array-index-key -- pieces of one line, by position
  if (text.startsWith('|')) return <>{text.split(/(\|)/).map((s, i) => (s === '|' ? <span key={i} className="mwd-syn">|</span> : s))}</>;
  if (!m) return <>{text || ' '}</>;
  return <><span className="mwd-syn" data-h={m[1].startsWith('#') ? '' : undefined}>{m[1]}</span>{m[2]}</>;
}
