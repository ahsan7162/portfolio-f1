// The plugin's Numbers and charts group, drawn: inline SVG written for the data, the accent for the marks,
// muted hairlines, figures in tabular numerals. Layout maths is the plugin's own (plugin/numbers.ts).
import { Fragment, type ReactNode } from 'react';
import { els, fmt, list, nums, num, rec, str, tone, Node, type Draw } from './kit';
import type { El, Val } from './lang';
import { arc, band, bin, boxStats, buildTree, calendarLayout, layoutTreemap, level, parseDays, ticks } from './plugin/numbers';

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/** A titled figure for a chart: what it shows, then the drawing. */
const Fig = ({ label, aria, children }: { label?: string; aria: string; children: ReactNode }) => (
  <figure className="oui-fig" role="img" aria-label={aria}>{label && <figcaption className="oui-label">{label}</figcaption>}{children}</figure>
);

function Progress({ e }: { e: El }) {
  const v = num(e.props.value) ?? 0;
  const max = num(e.props.max) ?? 100;
  const share = Math.min(1, Math.max(0, v / (max || 1)));
  return (
    <div className="oui-progress" data-t={tone(e.props.tone)}>
      <p><span>{str(e.props.label)}</span><b>{max === 100 ? `${fmt(v, { decimals: 0 })}%` : `${fmt(v)} of ${fmt(max)}`}</b></p>
      <span className="oui-bar"><i className="oui-grow-x" style={{ transform: `scaleX(${share})` }} /></span>
    </div>
  );
}

function Gauge({ e }: { e: El }) {
  const v = num(e.props.value) ?? 0;
  const [lo, hi] = [num(e.props.min) ?? 0, num(e.props.max) ?? 100];
  const share = Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)));
  const unit = str(e.props.unit);
  return (
    <Fig aria={`${str(e.props.label, 'Gauge')}: ${fmt(v)}${unit} of ${fmt(hi)}${unit}`}>
      <div className="oui-gauge" data-t={tone(e.props.tone)}>
        <svg viewBox="0 0 160 90">
          <path className="oui-gauge-track" d={arc(80, 80, 68, 0, 1)} />
          {share > 0 && <path className="oui-gauge-arc oui-draw" pathLength={1} d={arc(80, 80, 68, 0, share)} />}
        </svg>
        <b>{fmt(v)}<small>{unit}</small></b>
        <span className="oui-label">{str(e.props.label)}</span>
      </div>
    </Fig>
  );
}

function Sparkline({ e }: { e: El }) {
  const vs = nums(e.props.values);
  if (vs.length < 2) return null;
  const [lo, hi] = [Math.min(...vs), Math.max(...vs)];
  const pts = vs.map((v, i) => [(i / (vs.length - 1)) * 96 + 2, 26 - ((v - lo) / (hi - lo || 1)) * 22] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
  const [ex, ey] = pts[pts.length - 1];
  return (
    <span className="oui-spark" data-t={tone(e.props.tone)} role="img" aria-label={`${str(e.props.label, 'Trend')}: last ${fmt(vs[vs.length - 1])}`}>
      {e.props.label != null && <span className="oui-label">{str(e.props.label)}</span>}
      <svg viewBox="0 0 100 30" preserveAspectRatio="none"><path className="oui-spark-fill" d={`${d}L98 30L2 30Z`} /><path className="oui-line oui-draw" pathLength={1} d={d} /><circle cx={ex} cy={ey} r="2" className="oui-dot" /></svg>
      <b>{fmt(vs[vs.length - 1])}</b>
    </span>
  );
}

function SegmentedBar({ e }: { e: El }) {
  const parts = els(e.props.parts).map((p) => ({ label: str(p.props.label), value: num(p.props.value) ?? 0, t: str(p.props.tone) }));
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const unit = str(e.props.unit);
  return (
    <Fig aria={`Shares: ${parts.map((p) => `${p.label} ${pct(p.value / total)}`).join(', ')}`}>
      <div className="oui-seg">{parts.map((p, i) => <i key={p.label} className="oui-grow-x" data-r={p.t ? undefined : i} data-t={p.t || undefined} style={{ flexGrow: p.value }} />)}</div>
      <ul className="oui-legend-rows">{parts.map((p, i) => (
        <li key={p.label}><i data-r={p.t ? undefined : i} data-t={p.t || undefined} />{p.label}<b>{fmt(p.value, { unit })}</b><span>{pct(p.value / total)}</span></li>
      ))}</ul>
    </Fig>
  );
}

function CalendarHeatmap({ e }: { e: El }) {
  const days = parseDays(plainDays(e.props.days));
  const { weeks, cells } = calendarLayout(days, 26);
  const max = Math.max(0, ...cells.map((c) => c.value));
  return (
    <Fig label={str(e.props.label)} aria={`${str(e.props.label, 'Activity')}, ${cells.filter((c) => c.value > 0).length} active days`}>
      <svg className="oui-cal" viewBox={`0 0 ${weeks * 12} ${7 * 12}`}>
        {cells.map((c) => <rect key={c.date} x={c.col * 12} y={c.row * 12} width="10" height="10" rx="2" data-l={level(c.value, max)} />)}
      </svg>
    </Fig>
  );
}
const plainDays = (v: Val | undefined) => (Array.isArray(v) ? v.map((x) => rec(x)) : rec(v));

function Treemap({ e }: { e: El }) {
  const items = list(e.props.items).map((x) => ({ path: str(rec(x).path), size: num(rec(x).size) ?? 0 })).filter((x) => x.path && x.size > 0);
  const tiles = layoutTreemap(buildTree(items), 400, 220, { header: 16, pad: 2 }).filter((t) => t.depth > 0);
  const unit = str(e.props.unit);
  return (
    <Fig aria={`Sizes of ${items.length} items as nested rectangles`}>
      <svg className="oui-tree" viewBox="0 0 400 220">
        {tiles.map((t) => (
          <g key={t.node.path} data-leaf={t.leaf || undefined} data-b={t.branch % 4}>
            <rect className="oui-grow" x={t.x} y={t.y} width={Math.max(0, t.w)} height={Math.max(0, t.h)} rx="3" />
            {(t.leaf ? t.w > 48 && t.h > 24 : t.header && t.w > 40) && (
              <text x={t.x + 6} y={t.y + 12}>{t.node.name}{t.leaf && <tspan x={t.x + 6} dy="12" className="oui-tree-n">{fmt(t.node.size, { unit })}</tspan>}</text>
            )}
          </g>
        ))}
      </svg>
    </Fig>
  );
}

function Histogram({ e }: { e: El }) {
  const vs = nums(e.props.values);
  const { edges, counts } = bin(vs, num(e.props.bins));
  const top = Math.max(1, ...counts);
  const unit = str(e.props.unit);
  return (
    <Fig label={str(e.props.label)} aria={`Histogram of ${vs.length} values from ${fmt(edges[0])} to ${fmt(edges[edges.length - 1])} ${unit}`}>
      <div className="oui-hist">{counts.map((c, i) => <i key={edges[i]} className="oui-grow-y" style={{ transform: `scaleY(${c / top})` }} title={`${c}`} />)}</div>
      <p className="oui-axis"><span>{fmt(edges[0], { unit })}</span><span>{fmt(edges[edges.length - 1], { unit })}</span></p>
    </Fig>
  );
}

function BoxPlot({ e }: { e: El }) {
  const groups = list(e.props.groups).map((g) => ({ label: str(rec(g).label), stats: boxStats(nums(rec(g).values)) })).filter((g) => g.stats);
  const all = groups.flatMap((g) => [g.stats!.min, g.stats!.max]);
  const t = ticks(Math.min(...all), Math.max(...all));
  const x = (v: number) => ((v - t.lo) / (t.hi - t.lo || 1)) * 100;
  const unit = str(e.props.unit);
  return (
    <Fig aria={`Spread of ${groups.length} samples`}>
      <ul className="oui-box">{groups.map(({ label, stats: s }) => (
        <li key={label}><span>{label}</span>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none">
            <line x1={x(s!.low)} x2={x(s!.high)} y1="5" y2="5" className="oui-whisk" />
            <rect className="oui-grow-x" x={x(s!.q1)} width={x(s!.q3) - x(s!.q1)} y="1.5" height="7" rx="1" />
            <line x1={x(s!.median)} x2={x(s!.median)} y1="1" y2="9" className="oui-med" />
            {s!.outliers.map((o) => <circle key={o} cx={x(o)} cy="5" r="0.9" className="oui-dot" />)}
          </svg>
          <b>{fmt(s!.median, { unit })}</b>
        </li>
      ))}</ul>
    </Fig>
  );
}

function Heatmap({ e }: { e: El }) {
  const rows = list(e.props.rows).map((r) => str(r));
  const cols = list(e.props.columns).map((c) => str(c));
  const vals = list(e.props.values).map((r) => list(r).map((v) => num(v)));
  const flat = vals.flat().filter((v): v is number => v !== undefined);
  const [lo, hi] = [Math.min(...flat), Math.max(...flat)];
  return (
    <Fig aria={`Matrix of ${rows.length} rows by ${cols.length} columns`}>
      <div className="oui-heat" style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(0, 1fr))` }}>
        <span />{cols.map((c) => <span key={c} className="oui-heat-h">{c}</span>)}
        {rows.map((r, i) => (
          <Fragment key={r}>
            <span className="oui-heat-r">{r}</span>
            {cols.map((c, j) => {
              const v = vals[i]?.[j];
              return <i key={c} data-l={v === undefined ? undefined : band(v, lo, hi)} title={v === undefined ? 'no data' : fmt(v)} />;
            })}
          </Fragment>
        ))}
      </div>
    </Fig>
  );
}

function Funnel({ e }: { e: El }) {
  const stages = list(e.props.stages).map((s) => ({ label: str(rec(s).label), value: num(rec(s).value) ?? 0 }));
  const top = Math.max(1, ...stages.map((s) => s.value));
  const unit = str(e.props.unit);
  return (
    <Fig aria={`Funnel of ${stages.length} stages`}>
      <ol className="oui-funnel">{stages.map((s, i) => (
        <li key={s.label}><span>{s.label}</span>
          <span className="oui-bar"><i className="oui-grow-x" style={{ transform: `scaleX(${s.value / top})` }} /></span>
          <b>{fmt(s.value, { unit })}</b><small>{i ? pct(s.value / (stages[i - 1].value || 1)) : ''}</small>
        </li>
      ))}</ol>
    </Fig>
  );
}

function KeyValue({ e }: { e: El }) {
  const raw = e.props.pairs;
  const pairs: [string, Val][] = Array.isArray(raw) ? raw.map((p) => [str(list(p)[0]), list(p)[1]]) : Object.entries(rec(raw));
  return <dl className="oui-kv">{pairs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><Node v={v} /></dd></div>)}</dl>;
}

const Grid: Draw = ({ e }) => (
  <div className="oui-gridtiles" style={{ gridTemplateColumns: `repeat(${num(e.props.columns) ?? 2}, minmax(0, 1fr))` }}><Node v={e.props.children} /></div>
);

export const NUMBERS: Record<string, Draw> = { Progress, Gauge, Sparkline, SegmentedBar, CalendarHeatmap, Treemap, Histogram, BoxPlot, Heatmap, Funnel, KeyValue, Grid };
