// The drawing kit for OpenUI Live Replies: draws an OpenUI Lang program the way the plugin draws it in bb,
// redrawn for this page (bb's dark theme, the plugin's design guide: 13 px text on a 4 px unit, hairlines,
// the accent for the one thing each component is about, worded status). Every component reads its arguments by
// name (lang.ts names them) and must survive any of them missing, since programs arrive while they stream.
import { createContext, Fragment, useContext, useState, type ReactNode } from 'react';
import { isEl, isPending, type El, type Val } from './lang';

export type Draw = (p: { e: El }) => ReactNode;

export interface OuiApi {
  /** Component name to drawing. A name without one draws as a quiet placeholder. */
  draw: Record<string, Draw>;
  /** True while the block streams: hold interactions, and draw charts only once it ends (as the plugin does). */
  streaming: boolean;
  /** Sends text as the visitor's next message (what a click in the plugin does). */
  ask: (text: string) => void;
}
export const OuiCtx = createContext<OuiApi>({ draw: {}, streaming: false, ask: () => {} });
export const useOui = () => useContext(OuiCtx);

// -------------------------------------------------------------- reading arguments

export const str = (v: Val | undefined, or = '') => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : or);
export const num = (v: Val | undefined): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
export const list = (v: Val | undefined): Val[] => (Array.isArray(v) ? v : []);
export const els = (v: Val | undefined): El[] => list(v).filter(isEl);
export const strs = (v: Val | undefined) => list(v).filter((x): x is string => typeof x === 'string');
export const nums = (v: Val | undefined) => list(v).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
export const rec = (v: Val | undefined): Record<string, Val> =>
  v && typeof v === 'object' && !Array.isArray(v) && !isEl(v) && !isPending(v) && !('ref' in v) ? v : {};
/** A value as plain data, for the plugin's own parsers (rows of objects). */
export function plain(v: Val | undefined): unknown {
  if (Array.isArray(v)) return v.map(plain);
  if (isEl(v)) return Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, plain(x)]));
  if (isPending(v)) return undefined;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

const nf = new Map<string, Intl.NumberFormat>();
/** A figure as the plugin's fmt() prints it: grouped, at most the decimals asked for, compact on request. */
export function fmt(n: number | undefined, { decimals, compact = false, unit }: { decimals?: number; compact?: boolean; unit?: string } = {}) {
  if (n === undefined || !Number.isFinite(n)) return '-';
  const key = `${decimals}|${compact}`;
  if (!nf.has(key)) nf.set(key, new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals ?? (Math.abs(n) < 10 ? 2 : 1), notation: compact ? 'compact' : 'standard' }));
  const text = nf.get(key)!.format(n);
  return unit ? (unit === '%' ? `${text}%` : `${text} ${unit}`) : text;
}

export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info';
export const tone = (v: Val | undefined, or: Tone = 'accent'): Tone =>
  (['neutral', 'accent', 'good', 'warn', 'bad', 'info'] as const).find((t) => t === v) ?? or;

/** **bold**, *italic*, `code` and [n] citations, the markdown a short label carries. */
export function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\d+\])/g);
  return <>{parts.map((p, i) => {
    // oxlint-disable-next-line react/no-array-index-key -- pieces of one string, by position
    const k = i;
    if (/^\*\*.+\*\*$/.test(p)) return <b key={k}>{p.slice(2, -2)}</b>;
    if (/^\*.+\*$/.test(p)) return <i key={k}>{p.slice(1, -1)}</i>;
    if (/^`.+`$/.test(p)) return <code key={k}>{p.slice(1, -1)}</code>;
    if (/^\[\d+\]$/.test(p)) return <sup key={k} className="oui-cite">{p}</sup>;
    return <Fragment key={k}>{p}</Fragment>;
  })}</>;
}

/** A status in words with its mark: the plugin never lets colour alone carry state. */
export const State = ({ t, children }: { t: Tone; children: ReactNode }) => (
  <span className="oui-state" data-t={t}><i aria-hidden="true" />{children}</span>
);

/** The plugin's one control: a 32 px button, primary for the one main action of a block. */
export function Btn({ primary, sent, children, onClick, disabled, label }: {
  primary?: boolean; sent?: boolean; children: ReactNode; onClick?: () => void; disabled?: boolean; label?: string;
}) {
  const { streaming } = useOui();
  return (
    <button type="button" className="oui-btn" data-primary={primary || undefined} data-sent={sent || undefined}
      aria-label={label} disabled={disabled || streaming} onClick={onClick}>{sent && <i className="oui-tick" aria-hidden="true" />}{children}</button>
  );
}

/** Buttons that each send their text once, then say Sent: Plan, Quiz and the like. */
export function Sendbar({ actions }: { actions: { label: string; text: string; primary?: boolean }[] }) {
  const { ask, streaming } = useOui();
  const [sent, setSent] = useState<string | null>(null);
  return (
    <div className="oui-actions">
      {actions.map((a) => (
        <Btn key={a.label} primary={a.primary} sent={sent === a.label} disabled={streaming || sent !== null}
          onClick={() => { setSent(a.label); ask(a.text); }}>{a.label}</Btn>
      ))}
      {sent && <span className="oui-label" role="status">Sent</span>}
    </div>
  );
}

// -------------------------------------------------------------- drawing a value

/** Draws any value: a component, a list of them, text, or the skeleton of a name still on its way. */
export function Node({ v }: { v: Val | undefined }): ReactNode {
  const { draw } = useOui();
  if (v === undefined || v === null || typeof v === 'boolean') return null;
  if (isPending(v)) return <span className="oui-skel" aria-hidden="true" />;
  if (typeof v === 'string' || typeof v === 'number') return <Md text={String(v)} />;
  // oxlint-disable-next-line react/no-array-index-key -- a program's children have no ids but their place
  if (Array.isArray(v)) return <>{v.map((x, i) => <Node key={i} v={x} />)}</>;
  if (!isEl(v)) return null;
  const D = draw[v.el];
  return D ? <D e={v} /> : <Unknown e={v} />;
}

/** A component this page does not draw: named, quietly, so the rest of the reply still reads. */
const Unknown = ({ e }: { e: El }) => <div className="oui-unknown"><code>{e.el}</code><span>drawn by the plugin in bb</span></div>;

// -------------------------------------------------------------- OpenUI's own components (the core the prompt teaches)

const GAP: Record<string, string> = { none: '0', xs: '0.25em', s: '0.5em', m: '0.85em', l: '1.2em', xl: '1.6em', '2xl': '2.2em' };

export const CORE: Record<string, Draw> = {
  Stack: ({ e }) => {
    const p = e.props;
    const row = p.direction === 'row';
    return (
      <div className="oui-stack" data-row={row || undefined} style={{
        gap: GAP[str(p.gap, 'm')] ?? GAP.m, flexWrap: p.wrap === true ? 'wrap' : undefined,
        alignItems: { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' }[str(p.align)],
        justifyContent: { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around', evenly: 'space-evenly' }[str(p.justify)],
      }}><Node v={p.children} /></div>
    );
  },
  TextContent: ({ e }) => <p className="oui-text" data-size={str(e.props.size, 'default')} data-part={e.id}><Md text={str(e.props.text)} /></p>,
  // oxlint-disable-next-line react/no-array-index-key -- paragraphs of one string, by position
  MarkDownRenderer: ({ e }) => <div className="oui-md">{str(e.props.textMarkdown).split(/\n{2,}/).map((para, i) => <p key={i}><Md text={para} /></p>)}</div>,
  CardHeader: ({ e }) => <header className="oui-cardhead"><h4>{str(e.props.title)}</h4>{e.props.subtitle != null && <p>{str(e.props.subtitle)}</p>}</header>,
  Card: ({ e }) => <section className="oui-card"><Node v={e.props.children} /></section>,
  Separator: () => <hr className="oui-sep" />,
  Callout: ({ e }) => (
    <div className="oui-callout" data-t={str(e.props.variant, 'info')}><b>{str(e.props.title)}</b><p><Md text={str(e.props.description)} /></p></div>
  ),
  TextCallout: ({ e }) => (
    <div className="oui-callout" data-t={str(e.props.variant, 'neutral')}><b>{str(e.props.title)}</b><p><Md text={str(e.props.description)} /></p></div>
  ),
  Tag: ({ e }) => <span className="oui-tag" data-t={str(e.props.variant, 'neutral')}>{str(e.props.text)}</span>,
  TagBlock: ({ e }) => <div className="oui-tags">{strs(e.props.tags).map((t) => <span key={t} className="oui-tag">{t}</span>)}</div>,
  Buttons: ({ e }) => <div className="oui-actions" data-col={e.props.direction === 'column' || undefined}><Node v={e.props.buttons} /></div>,
  Button: function Button({ e }) {
    const { ask } = useOui();
    const label = str(e.props.label);
    return <Btn primary={e.props.variant === 'primary'} onClick={() => ask(label)}>{label}</Btn>;
  },
  CodeBlock: ({ e }) => <pre className="oui-code"><code>{str(e.props.codeString)}</code></pre>,
  Table: ({ e }) => {
    const cols = els(e.props.columns);
    const rows = Math.max(0, ...cols.map((c) => list(c.props.data).length));
    return (
      <table className="oui-table">
        <thead><tr>{cols.map((c) => <th key={str(c.props.label)} data-num={c.props.type === 'number' || undefined}>{str(c.props.label)}</th>)}</tr></thead>
        <tbody>{Array.from({ length: rows }, (_, r) => (
          <tr key={r}>{cols.map((c) => <td key={str(c.props.label)} data-num={c.props.type === 'number' || undefined}><Node v={list(c.props.data)[r]} /></td>)}</tr>
        ))}</tbody>
      </table>
    );
  },
  Tabs: function Tabs({ e }) {
    const items = els(e.props.items);
    const [on, setOn] = useState(0);
    return (
      <div className="oui-tabs">
        <div className="oui-tabbar" role="tablist">{items.map((t, i) => (
          <button key={str(t.props.value, String(i))} type="button" role="tab" aria-selected={i === on} onClick={() => setOn(i)}>{str(t.props.trigger)}</button>
        ))}</div>
        <div role="tabpanel"><Node v={items[on]?.props.content} /></div>
      </div>
    );
  },
  BarChart: ({ e }) => <Chart e={e} bars />,
  LineChart: ({ e }) => <Chart e={e} />,
};

/** OpenUI's bar and line charts, as the plugin themes them: one y-axis, hairline grid, the accent ramp. */
function Chart({ e, bars }: { e: El; bars?: boolean }) {
  const labels = strs(e.props.labels);
  const series = els(e.props.series).map((s) => ({ name: str(s.props.category), values: nums(s.props.values) }));
  const all = series.flatMap((s) => s.values);
  const hi = Math.max(1, ...all) * 1.08;
  const n = Math.max(1, labels.length);
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (v: number) => 100 - (v / hi) * 100;
  return (
    <figure className="oui-chart" role="img" aria-label={`${bars ? 'Bar' : 'Line'} chart of ${series.map((s) => s.name).join(', ')}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="oui-plot">
        {[25, 50, 75].map((g) => <line key={g} x1="0" x2="100" y1={g} y2={g} className="oui-grid" />)}
        {series.map((s, k) => bars
          ? s.values.map((v, i) => {
            const w = 70 / n / series.length;
            return <rect key={`${s.name}-${labels[i] ?? i}`} className="oui-mark oui-grow" data-s={k} x={x(i) - (35 / n) + k * w} width={w * 0.92} y={y(v)} height={100 - y(v)} />;
          })
          : <path key={s.name} className="oui-line oui-draw" data-s={k} d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join('')} />)}
      </svg>
      <figcaption className="oui-axis">{labels.map((l) => <span key={l}>{l}</span>)}</figcaption>
      {series.length > 1 && <p className="oui-legend">{series.map((s, k) => <span key={s.name} data-s={k}><i />{s.name}</span>)}</p>}
    </figure>
  );
}
