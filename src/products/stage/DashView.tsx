// The dashboard kit: draws a dashboard from its description (dash.ts) in bb's side-panel look, and builds
// it in. Charts are SVG marks stretched to their box (strokes keep their width); labels are HTML.
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { onReveal } from '../arrive';
import { gsap, reducedMotion, useGSAP } from '../motion';
import type { LiveProps } from '../types';
import { change, fmt, funnel, ticks, treemap, waterfall, type Cell, type Dash, type Fmt, type Kpi, type Part, type Series } from './dash';
import '../styles/dash-demo.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Of<K extends Part['kind']> = Extract<Part, { kind: K }>;

const SERIES = ['var(--dsd-acc)', 'var(--dsd-s2)', 'var(--dsd-s3)', 'var(--dsd-s4)'];
const colour = (s: Series, i: number) => (s.muted ? 'var(--dsd-prev)' : SERIES[i % SERIES.length]);
const quoted = (rows: string[]) => rows.map((r) => `"${r}"`).join(' ');
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A number that counts. One string child, so React keeps updating it after a tween has rewritten it. */
const Num = ({ k, v, f, className }: { k: string; v: number; f: Fmt; className?: string }) => (
  <b className={className} data-k={k} data-v={v} data-f={f}>{fmt(v, f)}</b>
);

/** A smooth line through every point (Catmull-Rom as Béziers), straight where the data is. */
const smooth = (pts: [number, number][]) =>
  pts.map(([x, y], i) => {
    if (!i) return `M${r2(x)} ${r2(y)}`;
    const [a, b, c] = [pts[Math.max(0, i - 2)], pts[i - 1], pts[Math.min(pts.length - 1, i + 1)]];
    return `C${r2(b[0] + (x - a[0]) / 6)} ${r2(b[1] + (y - a[1]) / 6)} ${r2(x - (c[0] - b[0]) / 6)} ${r2(y - (c[1] - b[1]) / 6)} ${r2(x)} ${r2(y)}`;
  }).join('');

function Spark({ values }: { values: number[] }) {
  const [lo, hi] = [Math.min(...values), Math.max(...values)];
  const pts = values.map((v, i): [number, number] => [3 + (i / (values.length - 1)) * 92, 86 - ((v - lo) / (hi - lo || 1)) * 72]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join('');
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg className="dsd-spark dsd-draw" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path className="dsd-mark dsd-area" d={`${d}L95 100L3 100Z`} />
      <path className="dsd-mark dsd-stroke" d={d} />
      <path className="dsd-mark dsd-dot" d={`M${r2(ex)} ${r2(ey)}h0`} />
    </svg>
  );
}

/** A bar filled to `at` (0 to 1); the build grows it from empty. */
const Track = ({ at, children }: { at: number; children?: ReactNode }) => (
  <span className="dsd-track">
    <i className="dsd-mark dsd-fill" data-p={at} style={{ transform: `scaleX(${at})` }} />
    {children}
  </span>
);

/** Words, a number that counts, or a coloured word. */
function CellView({ c, k }: { c: Cell; k: string }) {
  if (typeof c === 'string') return <span>{c}</span>;
  return 'v' in c ? <Num k={k} v={c.v} f={c.f} /> : <em data-tone={c.tone}>{c.text}</em>;
}

function Tiles({ p }: { p: Of<'kpis'> }) {
  const better = (t: Kpi) => (t.value >= (t.prev ?? 0)) === ((t.good ?? 'up') === 'up');
  return p.tiles.map((t, i) => (
    <div className="dsd-tile" key={t.label}>
      <span className="dsd-tile-label">{t.label}</span>
      <span className="dsd-tile-row">
        <Num k={`${p.id}:${i}`} v={t.value} f={t.fmt} className="dsd-tile-value" />
        {t.spark && <Spark values={t.spark} />}
        {t.states && (
          <span className="dsd-states">
            {t.states.map((s, j) => (
              // A drawn strip of periods: they never move, so the position is the key.
              // oxlint-disable-next-line react/no-array-index-key
              <i key={j} className="dsd-mark dsd-state" data-tone={s ?? 'muted'} style={{ '--d': j } as Vars} />
            ))}
          </span>
        )}
        {t.target !== undefined && <Track at={r2(Math.min(1, t.value / t.target))} />}
      </span>
      {t.prev !== undefined && (
        <span className="dsd-delta"><em data-tone={better(t) ? 'good' : 'bad'}>{change(t.value, t.prev)}</em> vs {fmt(t.prev, t.fmt)}</span>
      )}
      {t.note && <span className="dsd-tile-note">{t.note}</span>}
    </div>
  ));
}

/** A chart's frame: value axis and gridlines at `t`, labels along the bottom at `at(i)`; `all` keeps every label. */
function Axes({ t, f, x, at, all, children }: { t: number[]; f: Fmt; x: string[]; at: (i: number) => number; all?: boolean; children: ReactNode }) {
  const y = (v: number) => 100 - ((v - t[0]) / (t[t.length - 1] - t[0])) * 100;
  return (
    <div className="dsd-chart">
      {/* Zero is marked: it stays when a small chart drops every other value. */}
      <div className="dsd-yaxis">{t.map((v) => <span key={v} data-zero={v === 0 ? '' : undefined} style={{ top: `${y(v)}%` }}>{fmt(v, f)}</span>)}</div>
      <div className="dsd-plot">
        {t.map((v) => <i key={v} className="dsd-gridline" data-zero={v === 0 ? '' : undefined} style={{ top: `${y(v)}%` }} />)}
        {children}
      </div>
      <div className="dsd-xaxis" data-all={all ? '' : undefined}>{x.map((l, i) => <span key={l} style={{ left: `${at(i)}%` }}>{l}</span>)}</div>
    </div>
  );
}

function Line({ p }: { p: Of<'line'> }) {
  const all = p.series.flatMap((s) => s.values);
  const t = ticks(Math.min(...all), Math.max(...all));
  const [lo, hi] = [t[0], t[t.length - 1]];
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const n = p.x.length;
  const slot = 100 / n;
  const x = (i: number) => (p.as ? (i + 0.5) * slot : (i / (n - 1)) * 100);
  const width = (slot * 0.56) / p.series.length;
  return (
    <Axes t={t} f={p.fmt} x={p.x} at={x}>
      {p.as ? (
        <svg className="dsd-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {p.series.map((s, si) => s.values.map((v, i) => (
            <rect key={`${s.name}:${p.x[i]}`} className="dsd-mark dsd-col" data-k={`${p.id}:${si}:${i}`} data-v={v}
              x={r2(i * slot + slot * 0.22 + si * width)} y={r2(y(Math.max(v, 0)))} width={r2(width * 0.9)} height={r2(Math.abs(y(v) - y(0)))}
              style={{ '--c': colour(s, si), '--d': i } as Vars} />
          )))}
        </svg>
      ) : (
        <svg className="dsd-svg dsd-draw" viewBox="0 0 100 100" preserveAspectRatio="none">
          {p.series.map((s, si) => {
            const d = smooth(s.values.map((v, i) => [x(i), y(v)]));
            return (
              <g key={s.name} style={{ '--c': colour(s, si), '--d': si * 4 } as Vars}>
                {si === 0 && <path className="dsd-mark dsd-area" d={`${d}L100 ${r2(y(Math.max(lo, 0)))}L0 ${r2(y(Math.max(lo, 0)))}Z`} />}
                <path className="dsd-mark dsd-stroke" data-dashed={s.dashed ? '' : undefined} d={d} />
              </g>
            );
          })}
        </svg>
      )}
    </Axes>
  );
}

function Bars({ p }: { p: Of<'bars'> }) {
  const t = ticks(0, Math.max(...p.series.flatMap((s) => s.values)));
  const hi = t[t.length - 1];
  const h = 7 / p.series.length;
  const at = (v: number) => r2((v / hi) * 100);
  return (
    <div className="dsd-hbars" style={{ '--steps': t.length - 1, '--rows': p.labels.length } as Vars}>
      <i className="dsd-hgrid" />
      {/* Rows are placed by number: the gridlines share the bar column. */}
      {p.labels.map((l, i) => (
        <Fragment key={l}>
          <span className="dsd-hlabel" style={{ gridRow: i + 1 }}>{l}</span>
          {p.as ? (
            // A dumbbell: the previous value's dot, a line coloured by whether the change is good, this value's dot on top.
            <svg className="dsd-hbar dsd-draw" viewBox="0 0 100 10" preserveAspectRatio="none" style={{ gridRow: i + 1 }}>
              <path className="dsd-mark dsd-db-line" d={`M${at(p.series[1].values[i])} 5H${at(p.series[0].values[i])}`}
                data-tone={(p.series[0].values[i] > p.series[1].values[i]) === ((p.good ?? 'up') === 'up') ? 'good' : 'bad'} />
              {[1, 0].map((si) => (
                <path key={si} className="dsd-mark dsd-dot" d={`M${at(p.series[si].values[i])} 5h0`} style={{ '--c': colour(p.series[si], si), '--d': i } as Vars} />
              ))}
            </svg>
          ) : (
            <svg className="dsd-hbar" viewBox="0 0 100 10" preserveAspectRatio="none" style={{ gridRow: i + 1 }}>
              {p.series.map((s, si) => (
                <rect key={s.name} className="dsd-mark dsd-bar" data-k={`${p.id}:${si}:${i}`} data-v={s.values[i]}
                  x="0" y={r2(1.5 + si * (h + 0.3))} width={r2((s.values[i] / hi) * 100)} height={r2(h - 0.3)} rx="0.9" ry={r2(h / 2.4)}
                  style={{ '--c': colour(s, si), '--d': i } as Vars} />
              ))}
            </svg>
          )}
          <span className="dsd-hval" style={{ gridRow: i + 1 }}>
            <Num k={`${p.id}:v${i}`} v={p.series[0].values[i]} f={p.fmt} />
            {p.series[1] && <small>{fmt(p.series[1].values[i], p.fmt)}</small>}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

const C = 2 * Math.PI * 40;
function Donut({ p }: { p: Of<'donut'> }) {
  const total = p.values.reduce((a, b) => a + b, 0);
  const starts = p.values.map((_, i) => (p.values.slice(0, i).reduce((a, b) => a + b, 0) / total) * C);
  return (
    <div className="dsd-donut">
      <div className="dsd-ring-box">
        <svg className="dsd-ring-svg" viewBox="0 0 100 100">
          <circle className="dsd-ring-bg" cx="50" cy="50" r="40" />
          {p.values.map((v, i) => {
            const len = Math.max(0, (v / total) * C - 1.4);
            return (
              <circle key={p.labels[i]} className="dsd-mark dsd-arc" cx="50" cy="50" r="40" transform="rotate(-90 50 50)" data-len={r2(len)}
                style={{ '--c': SERIES[i % SERIES.length], '--d': i, strokeDasharray: `${r2(len)} ${r2(C)}`, strokeDashoffset: r2(-starts[i]) } as Vars} />
            );
          })}
        </svg>
        <span className="dsd-ring-mid"><Num k={`${p.id}:total`} v={total} f="int" /><small>{p.total}</small></span>
      </div>
      <ul className="dsd-legend-list">
        {p.labels.map((l, i) => (
          <li key={l} className="dsd-row" style={{ '--c': SERIES[i % SERIES.length] } as Vars}>
            <i className="dsd-mark dsd-swatch" />{l}<Num k={`${p.id}:${i}`} v={p.values[i]} f="int" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function List({ p }: { p: Of<'list'> }) {
  return (
    <ul className="dsd-list">
      {p.rows.map((r, i) => (
        <li key={r.title} className="dsd-row" data-picked={i === p.picked ? '' : undefined}>
          <span className="dsd-row-title">{r.title}</span>
          <span className="dsd-row-meta">
            {r.badge && <span className="dsd-badge" data-tone={r.badge.tone}>{r.badge.text}</span>}
            {r.meta.map((m) => <span key={m}>{m}</span>)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Sliders({ p }: { p: Of<'sliders'> }) {
  return (
    <div className="dsd-sliders">
      <div className="dsd-sl-list">
        {p.sliders.map((s, i) => {
          const at = r2((s.value - s.min) / (s.max - s.min));
          return (
            <div className="dsd-sl" key={s.label}>
              <span className="dsd-sl-label">{s.label}</span>
              <Num k={`${p.id}:s${i}`} v={s.value} f={s.fmt} />
              <Track at={at}><i className="dsd-knob" data-p={at} style={{ left: `${at * 100}%` }} /></Track>
            </div>
          );
        })}
      </div>
      <div className="dsd-results">
        {p.results.map((r, i) => (
          <div className="dsd-result" key={r.label} data-tone={r.tone}>
            <span>{r.label}</span>
            <Num k={`${p.id}:r${i}`} v={r.value} f={r.fmt} />
            {r.unit && <small>{r.unit}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Squares sized by value, coloured by group; a cell too small for its words drops them (see the CSS). */
function Treemap({ p }: { p: Of<'treemap'> }) {
  const groups = [...new Set(p.groups)];
  return (
    <div className="dsd-tree">
      {treemap(p.values).map((r, i) => (
        <div key={p.labels[i]} className="dsd-mark dsd-cell"
          style={{ left: `${r2(r.x)}%`, top: `${r2(r.y)}%`, width: `${r2(r.w)}%`, height: `${r2(r.h)}%`, '--c': SERIES[groups.indexOf(p.groups[i]) % SERIES.length], '--d': i } as Vars}>
          <span>{p.labels[i]}</span>
          <Num k={`${p.id}:${i}`} v={p.values[i]} f={p.fmt} />
        </div>
      ))}
    </div>
  );
}

/** Each cell is shaded by where it sits between its row's lowest and highest value. */
function Heatmap({ p }: { p: Of<'heatmap'> }) {
  return (
    <div className="dsd-heatmap" style={{ '--cols': p.cols.length, '--rows': p.rows.length } as Vars}>
      {p.rows.map((row, i) => {
        const [lo, hi] = [Math.min(...p.values[i]), Math.max(...p.values[i])];
        return (
          <Fragment key={row}>
            <span className="dsd-hlabel">{row}</span>
            {p.values[i].map((v, j) => {
              const at = r2((v - lo) / (hi - lo || 1));
              return <i key={p.cols[j]} className="dsd-mark dsd-heat" data-hot={at > 0.6 ? '' : undefined} style={{ '--v': at, '--d': j } as Vars}>{v}</i>;
            })}
          </Fragment>
        );
      })}
      <span />
      {/* A small screen keeps every other column's label, counting back from the latest. */}
      {p.cols.map((c, j) => <span key={c} className="dsd-heat-x" data-minor={(p.cols.length - 1 - j) % 2 ? '' : undefined}>{c}</span>)}
    </div>
  );
}

function Table({ p }: { p: Of<'table'> }) {
  return (
    <div className="dsd-table" style={{ '--cols': p.cols.length - 1 } as Vars}>
      {[p.cols, ...p.rows].map((r, i) => (
        // A drawn table (the header first): rows and cells never move, so the position is the key.
        // oxlint-disable-next-line react/no-array-index-key
        <div key={i} className={i ? 'dsd-row dsd-tr' : 'dsd-tr dsd-th'}>{r.map((c, j) => <CellView key={j} c={c} k={`${p.id}:${i}:${j}`} />)}</div>
      ))}
    </div>
  );
}

const Tabs = ({ p }: { p: Of<'tabs'> }) => p.tabs.map(([label, n], i) => (
  <span key={label} className="dsd-tab" data-on={i === p.on ? '' : undefined}>{label}<Num k={`${p.id}:${i}`} v={n} f="int" /></span>
));

const Callout = ({ p }: { p: Of<'callout'> }) => (
  <div className="dsd-callout" data-tone={p.tone}><i className="dsd-callout-mark">!</i><b>{p.head}</b><span>{p.text}</span></div>
);

/** Tapered steps, each from its own width to the next step's; the step that converts worst is flagged. */
function Funnel({ p }: { p: Of<'funnel'> }) {
  const { rates, weakest } = funnel(p.values);
  const w = (v: number) => (v / p.values[0]) * 50;
  return (
    <div className="dsd-funnel" style={{ '--rows': p.values.length } as Vars}>
      <svg className="dsd-fun-svg" viewBox={`0 0 100 ${p.values.length * 10}`} preserveAspectRatio="none">
        {p.values.map((v, i) => {
          const [a, b] = [w(v), w(p.values[i + 1] ?? v)];
          return <path key={p.labels[i]} className="dsd-mark dsd-fun" d={`M${r2(50 - a)} ${i * 10}H${r2(50 + a)}L${r2(50 + b)} ${i * 10 + 9.2}H${r2(50 - b)}Z`} style={{ '--d': i } as Vars} />;
        })}
      </svg>
      {p.labels.map((l, i) => (
        <Fragment key={l}>
          <span className="dsd-hlabel" style={{ gridRow: i + 1 }}>{l}</span>
          <span className="dsd-fun-val" style={{ gridRow: i + 1 }}>
            <Num k={`${p.id}:${i}`} v={p.values[i]} f="int" />
            {i > 0 && <small data-tone={i === weakest ? 'bad' : undefined}>{rates[i - 1]}%{i === weakest && <em> weakest</em>}</small>}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

const Drawer = ({ p }: { p: Of<'drawer'> }) => (
  <>
    {p.badge && <span className="dsd-badge dsd-drawer-badge" data-tone={p.badge.tone}>{p.badge.text}</span>}
    <ul className="dsd-kv">
      {p.rows.map(([label, c], i) => <li key={label} className="dsd-row"><span>{label}</span><CellView c={c} k={`${p.id}:${i}`} /></li>)}
    </ul>
  </>
);

/** Floating columns from each running total to the next, joined by a hairline, then the total from zero. */
function Waterfall({ p }: { p: Of<'waterfall'> }) {
  const bars = waterfall(p.values);
  const t = ticks(Math.min(...bars.map((b) => b.to)), Math.max(...bars.map((b) => Math.max(b.from, b.to))));
  const y = (v: number) => 100 - ((v - t[0]) / (t[t.length - 1] - t[0])) * 100;
  const labels = [...p.labels, p.end];
  const slot = 100 / labels.length;
  const x = (i: number) => (i + 0.5) * slot;
  const top = (i: number) => r2(y(Math.max(bars[i].from, bars[i].to)));
  return (
    <Axes t={t} f={p.fmt} x={labels} at={x} all>
      <svg className="dsd-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {bars.map((b, i) => (
          <Fragment key={labels[i]}>
            {i > 0 && <path className="dsd-wf-link" d={`M${r2(x(i - 1) + slot * 0.26)} ${r2(y(bars[i - 1].to))}H${r2(x(i) - slot * 0.26)}`} />}
            <rect className="dsd-mark dsd-col" x={r2(x(i) - slot * 0.26)} y={top(i)} width={r2(slot * 0.52)} height={r2(Math.abs(y(b.to) - y(b.from)))}
              style={{ '--c': b.to < b.from ? 'var(--dsd-bad)' : 'var(--dsd-acc)', '--d': i } as Vars} />
          </Fragment>
        ))}
      </svg>
      {bars.map((b, i) => (
        <span key={labels[i]} className="dsd-wf-val" style={{ left: `${r2(x(i))}%`, top: `${top(i)}%` }}><Num k={`${p.id}:${i}`} v={b.to - b.from} f={p.fmt} /></span>
      ))}
    </Axes>
  );
}

function Goals({ p }: { p: Of<'goal'> }) {
  return (
    <div className="dsd-goals">
      {p.goals.map((g, i) => {
        const scale = Math.max(g.value, g.target);
        return (
          <div className="dsd-sl dsd-goal" key={g.label}>
            <span className="dsd-sl-label">{g.label}</span>
            <span><Num k={`${p.id}:${i}`} v={g.value} f={g.fmt} />{g.unit && <small>{g.unit}</small>}</span>
            <Track at={r2(g.value / scale)}><i className="dsd-goal-tick" style={{ left: `${r2((g.target / scale) * 100)}%` }} /></Track>
            {g.note && <span className="dsd-goal-note">{g.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="dsd-legend">
      {series.map((s, i) => <li key={s.name} style={{ '--c': colour(s, i) } as Vars}><i className="dsd-mark dsd-swatch" data-dashed={s.dashed ? '' : undefined} />{s.name}</li>)}
    </ul>
  );
}

/** What a part's legend lists: its series, or a treemap's groups. */
const legend = (p: Part): Series[] | undefined =>
  p.kind === 'line' || p.kind === 'bars' ? p.series : p.kind === 'treemap' ? [...new Set(p.groups)].map((name) => ({ name, values: [] })) : undefined;

/** What a part is drawn as: when it changes, the part is drawn in again. */
const sig = (p: Part) => (p.kind === 'line' ? `line:${p.as ?? 'line'}:${p.series.map((s) => s.name).join()}` : p.kind);

function Body({ p }: { p: Part }) {
  switch (p.kind) {
    case 'kpis': return <Tiles p={p} />;
    case 'line': return <Line p={p} />;
    case 'bars': return <Bars p={p} />;
    case 'donut': return <Donut p={p} />;
    case 'list': return <List p={p} />;
    case 'sliders': return <Sliders p={p} />;
    case 'treemap': return <Treemap p={p} />;
    case 'heatmap': return <Heatmap p={p} />;
    case 'table': return <Table p={p} />;
    case 'tabs': return <Tabs p={p} />;
    case 'callout': return <Callout p={p} />;
    case 'funnel': return <Funnel p={p} />;
    case 'drawer': return <Drawer p={p} />;
    case 'waterfall': return <Waterfall p={p} />;
    case 'goal': return <Goals p={p} />;
  }
}

function Card({ part: p, order, slot }: { part: Part; order: number; slot?: (p: Part) => ReactNode }) {
  const series = legend(p);
  return (
    <section className={`dsd-card dsd-card--${p.kind}`} data-flip-id={p.id} data-sig={sig(p)} style={{ gridArea: p.id, '--o': order, ...(p.kind === 'kpis' && { '--n': p.tiles.length }) } as Vars}>
      {'title' in p && (
        <header className="dsd-card-head">
          <div><h4>{p.title}</h4>{'sub' in p && p.sub && <p>{p.sub}</p>}</div>
          {series && <Legend series={series} />}
          {p.kind === 'drawer' && <svg className="dsd-x" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2L2 8" /></svg>}
        </header>
      )}
      <Body p={p} />
      {slot?.(p)}
    </section>
  );
}

/** The dashboard's parts in its grid. `slot` adds something inside a card (the demo's Edit target). */
export function DashBody({ dash, slot }: { dash: Dash; slot?: (p: Part) => ReactNode }) {
  const style: Vars = { '--dsd-areas': quoted(dash.areas), '--dsd-cols': dash.areas[0].split(' ').length, '--dsd-rows': dash.rows ?? 'auto' };
  if (dash.narrow) Object.assign(style, { '--dsd-narrow': quoted(dash.narrow), '--dsd-ncols': dash.narrow[0].split(' ').length });
  return <div className="dsd-grid" style={style}>{dash.parts.map((p, i) => <Card key={p.id} part={p} order={i} slot={slot} />)}</div>;
}

/** The panel's header: the title, its refresh mode, and the controls (drawn, or the demo's real buttons). */
export function Head({ title, mode, children }: { title: string; mode?: string; children: ReactNode }) {
  return (
    <header className="dsd-head">
      <div className="dsd-head-title"><h3>{title}</h3>{mode && <span>{mode}</span>}</div>
      <div className="dsd-ctrls">{children}</div>
    </header>
  );
}

export const Chevron = () => <svg className="dsd-chev" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg>;

/** Rewrites a number from `from` to its own value, in its own format. */
function count(n: HTMLElement, from: number, duration: number) {
  const to = Number(n.dataset.v);
  const f = n.dataset.f as Fmt;
  const o = { v: from };
  const write = () => { n.textContent = fmt(o.v, f); };
  write();
  return gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: write, onComplete: () => { n.textContent = fmt(to, f); } });
}

/**
 * The build: header, cards, tiles pop, numbers count, lines and dumbbells draw, bars and columns grow, the donut
 * sweeps, rows arrive, status dots pop, treemap and heatmap cells appear, funnel steps widen.
 * About 1.4 s. `whole: false` redraws only what is inside (a chart that changed), not the card itself.
 */
export function build(el: Element, whole = true): gsap.core.Timeline {
  const all = <T extends Element = HTMLElement>(s: string) => [...(el.matches(s) ? [el as T] : []), ...el.querySelectorAll<T>(s)];
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const add = (s: string, from: gsap.TweenVars, to: gsap.TweenVars, at: number) => {
    const t = all(s);
    if (t.length) tl.fromTo(t, from, to, at);
  };
  if (whole) {
    add('.dsd-head, .dsd-note, .dsd-filters', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 0);
    add('.dsd-card', { autoAlpha: 0, y: '0.8em' }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.07 }, 0.05);
  }
  add('.dsd-tile', { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.7)' }, 0.12);
  all('[data-f]').forEach((n, i) => tl.add(count(n, 0, 0.8), 0.18 + Math.min(i, 10) * 0.03));
  add('.dsd-draw', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, stagger: 0.05, ease: 'power2.inOut', clearProps: 'clipPath' }, 0.3);
  add('.dsd-bar', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.6, stagger: 0.04 }, 0.35);
  add('.dsd-col', { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.6, stagger: 0.04 }, 0.35);
  add('.dsd-row', { autoAlpha: 0, x: '-0.6em' }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.06 }, 0.3);
  add('.dsd-fill', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: (_: number, t: HTMLElement) => Number(t.dataset.p), duration: 0.7, stagger: 0.08 }, 0.3);
  add('.dsd-knob', { x: (_: number, t: HTMLElement) => -(t.parentElement?.offsetWidth ?? 0) * Number(t.dataset.p) }, { x: 0, duration: 0.7, stagger: 0.08 }, 0.3);
  add('.dsd-state', { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(2)' }, 0.35);
  add('.dsd-cell', { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.04 }, 0.3);
  add('.dsd-heat', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.012 }, 0.3);
  add('.dsd-fun', { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.6, stagger: 0.08 }, 0.35);
  let at = 0.35;
  for (const a of all<SVGElement>('.dsd-arc')) {
    const len = Number(a.dataset.len);
    const d = 0.9 * (len / C) + 0.02;
    tl.fromTo(a, { strokeDasharray: `0 ${r2(C)}` }, { strokeDasharray: `${len} ${r2(C)}`, duration: d, ease: 'none' }, at);
    at += d;
  }
  return tl;
}

/** Every number and bar, by key, so a change can tween from what was there. */
export const snapshot = (root: Element) => new Map([...root.querySelectorAll<HTMLElement>('[data-k]')].map((n) => [n.dataset.k ?? '', Number(n.dataset.v)]));

/** After a filter: numbers run from their old values, bars grow or shrink from their old lengths. */
export function retween(root: Element, before: Map<string, number>) {
  const tl = gsap.timeline({ defaults: { duration: 0.45, ease: 'power3.out' } });
  for (const n of root.querySelectorAll<HTMLElement>('[data-k]')) {
    const was = before.get(n.dataset.k ?? '');
    const now = Number(n.dataset.v);
    if (was === undefined || was === now) continue;
    if (n.dataset.f) tl.add(count(n, was, 0.4), 0);
    else if (now > 0 && n.classList.contains('dsd-col')) tl.fromTo(n, { scaleY: was / now, transformOrigin: '50% 100%' }, { scaleY: 1 }, 0);
    else if (now > 0) tl.fromTo(n, { scaleX: was / now, transformOrigin: '0% 50%' }, { scaleX: 1 }, 0);
  }
  return tl;
}

/** True once the page is revealed and the element is on screen; false again when it leaves. */
export function useSeen(ref: RefObject<Element | null>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let [revealed, inView] = [false, false];
    const sync = () => setSeen(revealed && inView);
    const cancel = onReveal(() => { revealed = true; sync(); });
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.3 });
    io.observe(el);
    return () => { cancel(); io.disconnect(); };
  }, [ref]);
  return seen;
}

/** A live screen: a dashboard that fills its box and builds itself in each time it is shown. */
export function DashView({ dash, active, alt }: LiveProps & { dash: Dash }) {
  const root = useRef<HTMLDivElement>(null);
  const seen = useSeen(root);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const was = useRef(false);

  useGSAP(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    // Each time it is shown it is set back to the start, then plays once it is actually seen.
    if (active && !was.current) {
      tl.current?.progress(1).kill();
      tl.current = build(el).pause();
    }
    was.current = active;
    if (active && seen) tl.current?.play();
  }, { scope: root, dependencies: [active, seen] });

  return (
    <div className="dsd dsd-live" ref={root} role="img" aria-label={alt}>
      <div className="dsd-screen" aria-hidden="true">
        <Head title={dash.title} mode={dash.mode}>
          <span className="dsd-ctl">Edit</span>
          <span className="dsd-ctl">Colours</span>
          <span className="dsd-ctl">Latest: version 1<Chevron /></span>
        </Head>
        {dash.note && <p className="dsd-note"><i className="dsd-live-dot" />{dash.note}</p>}
        <DashBody dash={dash} />
      </div>
    </div>
  );
}
