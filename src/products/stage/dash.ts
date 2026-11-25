// bb Dashboards, drawn in code: what a dashboard is (a title and its parts), the five dashboards the page
// shows, the channel and pricing maths, the plugin's colour maths, and the demo's state. No React here,
// so it can be tested. All data is invented; Harbor Coffee's numbers are the plugin's own example program.
import type { DashName } from './names';

export type Fmt = 'usd' | 'usd2' | 'usdk' | 'int' | 'ms' | 'plus';
export type Tone = 'good' | 'warn' | 'bad' | 'acc' | 'muted';
/** One period of a status strip; null is a period with nothing to report. */
export type State = 'good' | 'warn' | 'bad' | null;

export interface Kpi {
  label: string; value: number; fmt: Fmt;
  /** The value it is compared with; the tile then shows the change and "vs" it. */
  prev?: number;
  /** Which way is better: latency going up is bad. Up by default. */
  good?: 'up' | 'down';
  note?: string; spark?: number[];
  /** The plugin's States: one dot per period, oldest first. */
  states?: State[];
  /** The plugin's Progress: a bar filled from 0 to this target. */
  target?: number;
}
/** A series on a chart. `muted` draws it as the thing compared against (previous run). */
export interface Series { name: string; values: number[]; dashed?: boolean; muted?: boolean }
export interface Row { title: string; badge?: { text: string; tone: Tone }; meta: string[] }
export interface Slider { label: string; value: number; min: number; max: number; fmt: Fmt }
/** A table cell or a key-value's value: words, a number that counts, or a coloured word. */
export type Cell = string | { v: number; f: Fmt } | { text: string; tone: Tone };
/** Progress toward a target; past it, the bar is full and the target is a tick on it. */
export interface Goal { label: string; value: number; target: number; fmt: Fmt; unit?: string; note?: string }

/** One part of a dashboard. `id` is its grid area. */
export type Part =
  | { kind: 'kpis'; id: string; tiles: Kpi[] }
  /** Over time: a line (area under the first series) or, with `as: 'bars'`, columns. */
  | { kind: 'line'; id: string; title: string; sub?: string; x: string[]; series: Series[]; fmt: Fmt; as?: 'bars' }
  /** Horizontal bars; two series sit as a pair in each row. `as: 'dumbbell'` joins the second to the first with a line. */
  | { kind: 'bars'; id: string; title: string; sub?: string; labels: string[]; series: Series[]; fmt: Fmt; as?: 'dumbbell'; good?: 'up' | 'down' }
  | { kind: 'donut'; id: string; title: string; sub?: string; labels: string[]; values: number[]; total: string }
  /** `picked`: the row whose details a drawer shows. */
  | { kind: 'list'; id: string; title: string; sub?: string; rows: Row[]; picked?: number }
  | { kind: 'sliders'; id: string; title: string; sub?: string; sliders: Slider[]; results: { label: string; value: number; fmt: Fmt; unit?: string; tone?: Tone }[] }
  /** Parts of a whole as rectangles sized by value, biggest first, coloured by group. */
  | { kind: 'treemap'; id: string; title: string; sub?: string; labels: string[]; values: number[]; groups: string[]; fmt: Fmt }
  /** One row per category, one cell per column, shaded by where the value sits in its row. */
  | { kind: 'heatmap'; id: string; title: string; sub?: string; rows: string[]; cols: string[]; values: number[][] }
  | { kind: 'table'; id: string; title: string; sub?: string; cols: string[]; rows: Cell[][] }
  /** A tab strip: a label and a count per tab, `on` the one shown. A picture, not a control. */
  | { kind: 'tabs'; id: string; tabs: [string, number][]; on: number }
  | { kind: 'callout'; id: string; tone: Tone; head: string; text: string }
  /** Steps that only shrink, with each step's conversion from the one before. */
  | { kind: 'funnel'; id: string; title: string; sub?: string; labels: string[]; values: number[] }
  /** The picked record's details: a badge and key-value rows, with a close mark. */
  | { kind: 'drawer'; id: string; title: string; badge?: { text: string; tone: Tone }; rows: [string, Cell][] }
  /** A start, signed steps, and the total they come to (`end`). */
  | { kind: 'waterfall'; id: string; title: string; sub?: string; labels: string[]; values: number[]; end: string; fmt: Fmt }
  | { kind: 'goal'; id: string; title: string; sub?: string; goals: Goal[] };

export interface Dash {
  title: string;
  /** Beside the title, as the panel shows it: "Refreshes itself". */
  mode?: string;
  /** A line under the header: how fresh the data is. */
  note?: string;
  /** grid-template-areas, one string per row, the part ids as names. `narrow` is the demo's phone layout. */
  areas: string[]; narrow?: string[];
  rows?: string;
  parts: Part[];
}

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MINUS = '−';

export function fmt(v: number, f: Fmt): string {
  const sign = v < 0 ? MINUS : '';
  const a = Math.abs(v);
  switch (f) {
    case 'usd': return `${sign}$${whole.format(a)}`;
    case 'usd2': return `${sign}$${cents.format(a)}`;
    case 'usdk': return a === 0 ? '$0' : `${sign}$${Number((a / 1000).toFixed(1))}K`;
    case 'int': return `${sign}${whole.format(a)}`;
    case 'ms': return `${sign}${whole.format(a)} ms`;
    case 'plus': return `${v < 0 ? MINUS : '+'}${whole.format(a)}`;
  }
}

/** The change from `prev`, as the tile shows it: "+6.2%". */
export const change = (v: number, prev: number) => {
  const p = ((v - prev) / prev) * 100;
  return `${p < 0 ? MINUS : '+'}${Math.abs(p).toFixed(1)}%`;
};

export interface Rect { x: number; y: number; w: number; h: number }
/** A treemap's rectangles in a w x h box: split the values in two by sum, cut the longer side, repeat. */
export function treemap(values: readonly number[], x = 0, y = 0, w = 100, h = 100): Rect[] {
  if (values.length < 2) return values.length ? [{ x, y, w, h }] : [];
  const total = values.reduce((a, b) => a + b, 0);
  let [k, acc] = [1, values[0]];
  while (k < values.length - 1 && acc + values[k] <= total / 2) acc += values[k++];
  const f = acc / total;
  const [a, b] = [values.slice(0, k), values.slice(k)];
  return w >= h
    ? [...treemap(a, x, y, w * f, h), ...treemap(b, x + w * f, y, w * (1 - f), h)]
    : [...treemap(a, x, y, w, h * f), ...treemap(b, x, y + h * f, w, h * (1 - f))];
}

/** Each step's conversion from the step before, in whole percent, and which step converts worst. */
export function funnel(values: readonly number[]) {
  const rates = values.slice(1).map((v, i) => Math.round((v / values[i]) * 100));
  return { rates, weakest: rates.indexOf(Math.min(...rates)) + 1 };
}

/** A waterfall's bars: each step from the running total to the next, then the total from zero. */
export function waterfall(values: readonly number[]) {
  let at = 0;
  const steps = values.map((v) => ({ from: at, to: (at += v) }));
  return [...steps, { from: 0, to: at }];
}

/** Up to about five round ticks covering min..max, always including 0. */
export function ticks(min: number, max: number): number[] {
  const lo0 = Math.min(0, min);
  const raw = (Math.max(max, lo0 + 1) - lo0) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((n) => n * pow >= raw) ?? 10) * pow;
  const lo = Math.floor(lo0 / step) * step;
  const hi = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
}

// Harbor Coffee: the plugin's example program, split by channel.

export const WEEKS = ['Sep 21', 'Sep 28', 'Oct 5', 'Oct 12', 'Oct 19', 'Oct 26', 'Nov 2', 'Nov 9'];
const REVENUE = [18420, 18960, 19310, 18870, 19740, 20380, 21150, 22460];
const ORDERS = [682, 698, 709, 690, 721, 738, 761, 798];
const NEW_CUSTOMERS = [94, 101, 97, 88, 106, 112, 119, 131];
const PRODUCTS = ['Harbor House Blend', 'Dockside Espresso', 'Ethiopia Guji', 'Cold Brew Concentrate', 'Holiday Lighthouse Blend', 'Night Shift Decaf', 'Colombia Huila', 'Mugs & Brew Gear'];
const PRODUCT_REVENUE = [5820, 4310, 3260, 2650, 2390, 1480, 1310, 1240];
const CHANNEL_ORDERS = [412, 301, 85];
const CHANNEL_ORDERS_PREV = [388, 296, 77];
// Invented: the same weeks a year earlier, for "Add last year's line".
const REVENUE_LAST_YEAR = [16980, 17240, 17610, 17320, 17890, 18350, 18920, 19780];

export const CHANNELS = ['all', 'online', 'shop', 'wholesale'] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_NAMES: Record<Channel, string> = { all: 'All', online: 'Online', shop: 'Shop', wholesale: 'Wholesale' };
/** The three real channels, in the order every split below lists them. */
const SPLIT = ['online', 'shop', 'wholesale'] as const;

// Invented: each product's share by channel (online, shop, wholesale). Cold brew sells wholesale; mugs in the shop.
const PRODUCT_SHARES = [[0.45, 0.35, 0.2], [0.4, 0.38, 0.22], [0.6, 0.3, 0.1], [0.25, 0.2, 0.55], [0.55, 0.4, 0.05], [0.5, 0.4, 0.1], [0.55, 0.3, 0.15], [0.45, 0.5, 0.05]];
// Invented: how each channel's share drifts per week (online grows, wholesale shrinks), so channels differ week to week.
const DRIFT = [0.015, -0.004, -0.012];

/** `total` in whole parts by `shares`, largest remainder first, so the parts always add up to the total. */
export function split(total: number, shares: readonly number[]): number[] {
  const sum = shares.reduce((a, s) => a + s, 0);
  const exact = shares.map((s) => (total * s) / sum);
  const out = exact.map(Math.floor);
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0, left = total - out.reduce((a, b) => a + b, 0); k < left; k++) out[order[k % order.length][1]] += 1;
  return out;
}

const drifted = (shares: readonly number[], week: number) => shares.map((s, c) => s * (1 + DRIFT[c] * (week - (WEEKS.length - 1))));
/** A weekly total split into the three channels: [week][channel]. The last week's shares are `shares`. */
const byWeek = (totals: readonly number[], shares: readonly number[]) => totals.map((t, w) => split(t, drifted(shares, w)));

const productSplit = PRODUCT_REVENUE.map((r, p) => split(r, PRODUCT_SHARES[p]));
/** The latest week's revenue by channel, the sum of its products, so the bars always add up to the tile. */
const lastWeekRevenue = SPLIT.map((_, c) => productSplit.reduce((a, p) => a + p[c], 0));
const revenueSplit = byWeek(REVENUE, lastWeekRevenue);
const lastYearSplit = byWeek(REVENUE_LAST_YEAR, lastWeekRevenue);
const ordersSplit = ORDERS.map((t, w) => (w === 7 ? CHANNEL_ORDERS : w === 6 ? CHANNEL_ORDERS_PREV : split(t, drifted(CHANNEL_ORDERS, w))));
const customersSplit = byWeek(NEW_CUSTOMERS, [0.62, 0.33, 0.05]);

const pick = (rows: readonly (readonly number[])[], ch: Channel, totals: readonly number[]) =>
  ch === 'all' ? [...totals] : rows.map((r) => r[SPLIT.indexOf(ch)]);

/** Harbor Coffee's numbers for one channel. "All" is the plugin's program as written. */
export function sales(ch: Channel) {
  return {
    revenue: pick(revenueSplit, ch, REVENUE),
    orders: pick(ordersSplit, ch, ORDERS),
    customers: pick(customersSplit, ch, NEW_CUSTOMERS),
    lastYear: pick(lastYearSplit, ch, REVENUE_LAST_YEAR),
    products: pick(productSplit, ch, PRODUCT_REVENUE),
  };
}

/** What a saved version of the sales dashboard holds. */
export interface Spec { orders: boolean; trend: 'line' | 'bars'; lastYear: boolean }
export const FIRST: Spec = { orders: false, trend: 'line', lastYear: false };

const round2 = (v: number) => Math.round(v * 100) / 100;
const TOP = 5;

export function salesDash(ch: Channel, spec: Spec = FIRST): Dash {
  const d = sales(ch);
  const [last, prev] = [WEEKS.length - 1, WEEKS.length - 2];
  const orders: Part = { kind: 'line', id: 'o', title: 'Orders by week', sub: 'Last 8 weeks', x: WEEKS, fmt: 'int', series: [{ name: 'Orders', values: d.orders }] };
  return {
    title: 'Harbor Coffee, weekly sales',
    mode: 'Refreshes itself',
    areas: spec.orders ? ['k k k k k', 't t t b b', 'o o o b b'] : ['k k k k k', 't t t b b', 't t t b b'],
    narrow: spec.orders ? ['k k', 't o', 'b b'] : ['k k', 't t', 'b b'],
    rows: 'auto 1fr 1fr',
    parts: [
      {
        kind: 'kpis', id: 'k', tiles: [
          { label: 'Revenue', value: d.revenue[last], prev: d.revenue[prev], fmt: 'usd', note: 'Week of Nov 9', spark: d.revenue },
          { label: 'Orders', value: d.orders[last], prev: d.orders[prev], fmt: 'int', note: 'Week of Nov 9', spark: d.orders },
          { label: 'Average order value', value: round2(d.revenue[last] / d.orders[last]), prev: round2(d.revenue[prev] / d.orders[prev]), fmt: 'usd2', note: 'Revenue ÷ orders' },
          { label: 'New customers', value: d.customers[last], prev: d.customers[prev], fmt: 'int', note: 'First-time buyers', spark: d.customers },
        ],
      },
      {
        kind: 'line', id: 't', title: 'Revenue by week', sub: 'Last 8 weeks · USD', x: WEEKS, fmt: 'usdk', as: spec.trend === 'bars' ? 'bars' : undefined,
        series: [{ name: 'Revenue', values: d.revenue }, ...(spec.lastYear ? [{ name: 'Last year', values: d.lastYear, dashed: true }] : [])],
      },
      { kind: 'bars', id: 'b', title: 'Revenue by product', sub: 'Week of Nov 9 · USD', labels: PRODUCTS.slice(0, TOP), series: [{ name: 'Revenue', values: d.products.slice(0, TOP) }], fmt: 'usd' },
      ...(spec.orders ? [orders] : []),
    ],
  };
}

// The other four dashboards.

/** A benchmark row: p50 and p95 for this run and the previous one, in ms. */
export interface Bench { endpoint: string; p50: number; p50prev: number; p95: number; p95prev: number }
/** Worst p95 regression first. */
export const byRegression = (rows: readonly Bench[]) => [...rows].sort((a, b) => b.p95 - b.p95prev - (a.p95 - a.p95prev));

export const BENCH = byRegression([
  { endpoint: 'GET /menu', p50: 38, p50prev: 36, p95: 121, p95prev: 97 },
  { endpoint: 'GET /stores', p50: 24, p50prev: 25, p95: 70, p95prev: 72 },
  { endpoint: 'POST /orders', p50: 142, p50prev: 131, p95: 412, p95prev: 374 },
  { endpoint: 'GET /search', p50: 88, p50prev: 85, p95: 264, p95prev: 251 },
  { endpoint: 'GET /orders/:id', p50: 51, p50prev: 55, p95: 140, p95prev: 149 },
  { endpoint: 'POST /login', p50: 96, p50prev: 97, p95: 211, p95prev: 205 },
]);

// Invented: where runs 41 to 46 sat against run 47's p95, so the history moves a little.
const WOBBLE = [0.96, 1.03, 0.98, 1.05, 0.97, 1.01];
const RUNS = ['41', '42', '43', '44', '45', '46', '47', '48'];
/** An endpoint's p95 over the last eight runs, the last two being the previous run and this one. */
const history = (b: Bench, row: number) => [...WOBBLE.map((_, k) => Math.round(b.p95prev * WOBBLE[(k + row * 2) % WOBBLE.length])), b.p95prev, b.p95];

function benchDash(): Dash {
  const labels = BENCH.map((b) => b.endpoint);
  const delta = (now: number, was: number): Cell => ({ text: change(now, was), tone: now > was ? 'bad' : 'good' });
  return {
    title: 'Latency benchmark', mode: 'Run 48 against run 47',
    areas: ['d d d h h', 't t t t t'], rows: '1fr auto',
    parts: [
      {
        kind: 'bars', as: 'dumbbell', good: 'down', id: 'd', title: 'p95 by endpoint', sub: 'Run 47 to run 48 · worst regression first', labels, fmt: 'ms',
        series: [{ name: 'This run', values: BENCH.map((b) => b.p95) }, { name: 'Previous run', values: BENCH.map((b) => b.p95prev), muted: true }],
      },
      { kind: 'heatmap', id: 'h', title: 'p95 over the last 8 runs', sub: 'Brighter is slower, per endpoint', rows: labels, cols: RUNS, values: BENCH.map(history) },
      {
        kind: 'table', id: 't', title: 'Worst regressions', sub: 'Against run 47', cols: ['Endpoint', 'p50', 'Change', 'p95', 'Change'],
        rows: BENCH.map((b) => [b.endpoint, { v: b.p50, f: 'ms' }, delta(b.p50, b.p50prev), { v: b.p95, f: 'ms' }, delta(b.p95, b.p95prev)]),
      },
    ],
  };
}

const COMMITS: Row[] = [
  { title: 'Show the stamp count on the account page', badge: { text: 'Checks passed', tone: 'good' }, meta: ['a41c9e2', '25 min'] },
  { title: 'Stamp card endpoint, with tests', badge: { text: 'Checks passed', tone: 'good' }, meta: ['7d03b1f', '1 h'] },
  { title: 'Keep the stamp count after a refund', badge: { text: 'Checks passed', tone: 'good' }, meta: ['3f6d8c1', '2 h'] },
  { title: 'Store stamps per customer', badge: { text: 'Checks failed', tone: 'bad' }, meta: ['e9b2a40', '3 h'] },
  { title: 'Loyalty card colours and type', badge: { text: 'Checks passed', tone: 'good' }, meta: ['1c8f5d7', '5 h'] },
  { title: 'Stamp card on the account page', badge: { text: 'Checks passed', tone: 'good' }, meta: ['5a2e7b3', '7 h'] },
  { title: 'Start the loyalty stamps branch', badge: { text: 'No checks', tone: 'muted' }, meta: ['0b6a2e9', '1 d'] },
];
/** The commits' checks as a status strip, oldest first; a commit without checks is an empty period. */
const checks = (rows: readonly Row[]): State[] => rows.map((r) => (r.badge?.tone === 'good' ? 'good' : r.badge?.tone === 'bad' ? 'bad' : null)).reverse();
const LINES = { added: 486, removed: 112 };
// Invented: lines changed (added and removed) per file, biggest first, by folder.
const FILES: [group: string, file: string, lines: number][] = [
  ['account/', 'Stamps.tsx', 148], ['api/', 'stamps.ts', 121], ['api/', 'stamps.test.ts', 96], ['db/', '014_stamps.sql', 64],
  ['account/', 'stamps.css', 52], ['account/', 'StampCard.tsx', 41], ['api/', 'routes.ts', 23], ['account/', 'Account.tsx', 19],
  ['Top level', 'README.md', 18], ['db/', 'schema.ts', 9], ['db/', 'seed.ts', 4], ['Top level', 'package.json', 3],
];

function branchDash(): Dash {
  const states = checks(COMMITS);
  const runs = states.filter((s) => s !== null);
  return {
    title: 'This branch', mode: 'loyalty-stamps against main',
    note: 'Updated just now · refreshes itself',
    areas: ['k k k k k', 'c c c t t'], rows: 'auto 1fr',
    parts: [
      {
        kind: 'kpis', id: 'k', tiles: [
          { label: 'Commits', value: COMMITS.length, fmt: 'int', note: 'Ahead of main', spark: [1, 0, 2, 1, 0, 2, 1] },
          { label: 'Checks passed', value: runs.filter((s) => s === 'good').length, fmt: 'int', note: `Of ${runs.length} runs, oldest first`, states },
          { label: 'Files reviewed', value: 9, fmt: 'int', note: `Of ${FILES.length} changed`, target: FILES.length },
          { label: 'Lines added', value: LINES.added, fmt: 'plus', note: `${LINES.removed} removed` },
        ],
      },
      { kind: 'list', id: 'c', title: 'Commits', sub: 'Newest first', rows: COMMITS },
      {
        kind: 'treemap', id: 't', title: 'Lines changed by file', sub: `${FILES.length} files · ${LINES.added + LINES.removed} lines`, fmt: 'int',
        groups: FILES.map((f) => f[0]), labels: FILES.map((f) => f[1]), values: FILES.map((f) => f[2]),
      },
    ],
  };
}

const ORDER_COUNTS = { New: 12, Picking: 8, Packed: 7, 'On hold': 3 };
// Invented: how far today's orders got.
const TODAY = { labels: ['Placed', 'Picked', 'Packed', 'Shipped'], values: [42, 31, 24, 17] };
const ORDER_ROWS: Row[] = [
  { title: '#5182 · 40 brass hex widgets', badge: { text: 'On hold', tone: 'warn' }, meta: ['Kestrel Tools', '2 d'] },
  { title: '#5179 · 12 steel flange widgets', badge: { text: 'New', tone: 'acc' }, meta: ['Ridgeway Labs', '1 d'] },
  { title: '#5177 · 200 nylon spacers', badge: { text: 'Picking', tone: 'muted' }, meta: ['Halden Supply', '6 h'] },
  { title: '#5174 · 6 gear widget kits', badge: { text: 'Packed', tone: 'good' }, meta: ['Marlow & Finch', '4 h'] },
  { title: '#5171 · 75 copper sprockets', badge: { text: 'Picking', tone: 'muted' }, meta: ['Oakfield Works', '2 h'] },
  { title: '#5168 · 3 widget sampler boxes', badge: { text: 'New', tone: 'acc' }, meta: ['Juniper Studio', '18 min'] },
];

function ordersDash(): Dash {
  const held = ORDER_COUNTS['On hold'];
  const [picked] = ORDER_ROWS;
  return {
    title: 'Open orders', mode: 'Sprocket & Co. via its order system',
    note: 'Updated just now · refreshes itself',
    areas: ['a a a a a', 'x x x x x', 'l l l d d', 'l l l f f'], rows: 'auto auto auto 1fr',
    parts: [
      { kind: 'tabs', id: 'a', on: 0, tabs: [['Open', Object.values(ORDER_COUNTS).reduce((a, b) => a + b, 0)], ['On hold', held], ['Shipped today', TODAY.values[TODAY.values.length - 1]]] },
      { kind: 'callout', id: 'x', tone: 'warn', head: `${held} orders on hold`, text: 'The oldest, #5182, has waited 2 days for payment.' },
      { kind: 'list', id: 'l', title: 'Orders', sub: 'Oldest first · pick one for its details', picked: 0, rows: ORDER_ROWS },
      {
        kind: 'drawer', id: 'd', title: picked.title, badge: picked.badge,
        rows: [['Customer', picked.meta[0]], ['Order value', { v: 1240, f: 'usd' }], ['Placed', '2 days ago'], ['Hold reason', 'Waiting on payment']],
      },
      { kind: 'funnel', id: 'f', title: 'Today’s orders', sub: 'How far they got', ...TODAY },
    ],
  };
}

// The café what-if.

/** Beans, milk and the cup: what one coffee costs to make. Invented. */
export const COST_PER_CUP = 1.1;
export const DAYS = 30;
/** A month's profit: what each cup earns over its cost, times cups sold, less the rent. */
export const profit = (price: number, cups: number, rent: number) => Math.round((price - COST_PER_CUP) * cups * DAYS - rent);
/** Cups a day to cover the rent; null when a cup earns nothing over its cost. */
export const breakEven = (price: number, rent: number) => (price <= COST_PER_CUP ? null : Math.ceil(rent / ((price - COST_PER_CUP) * DAYS)));
/** A month's money as a waterfall's steps: what the cups bring in, less what they cost to make, less the rent. */
export const month = (price: number, cups: number, rent: number) => [Math.round(price * cups * DAYS), -Math.round(COST_PER_CUP * cups * DAYS), -rent];
/** The day of the month by which the cups have paid the rent; null when a cup earns nothing over its cost. */
export const rentDay = (price: number, cups: number, rent: number) => (price <= COST_PER_CUP ? null : Math.ceil(rent / ((price - COST_PER_CUP) * cups)));

function pricingDash(): Dash {
  const [price, cups, rent] = [4.5, 140, 6800];
  const even = breakEven(price, rent) ?? 0;
  return {
    title: 'Café pricing, what-if', mode: 'Calculated as you move them',
    areas: ['s s s s s', 'w w w g g'], rows: 'auto 1fr',
    parts: [
      {
        kind: 'sliders', id: 's', title: 'Your numbers', sub: `A cup costs ${fmt(COST_PER_CUP, 'usd2')} to make · ${DAYS} days a month`,
        sliders: [
          { label: 'Price of a coffee', value: price, min: 2, max: 7, fmt: 'usd2' },
          { label: 'Cups per day', value: cups, min: 40, max: 300, fmt: 'int' },
          { label: 'Monthly rent', value: rent, min: 2000, max: 12000, fmt: 'usd' },
        ],
        results: [
          { label: 'Monthly profit', value: profit(price, cups, rent), fmt: 'usd', tone: 'good' },
          { label: 'Break-even', value: breakEven(price, rent) ?? 0, fmt: 'int', unit: 'cups a day' },
        ],
      },
      {
        kind: 'waterfall', id: 'w', title: 'Where a month’s revenue goes', sub: `${cups} cups a day at ${fmt(price, 'usd2')} · ${DAYS} days`, fmt: 'usdk',
        labels: ['Revenue', 'Cost of cups', 'Rent'], values: month(price, cups, rent), end: 'Profit',
      },
      {
        kind: 'goal', id: 'g', title: 'Break-even', sub: 'At these numbers', goals: [
          { label: 'Cups a day', value: cups, target: even, fmt: 'int', unit: `break-even ${even}`, note: `Sales can fall ${Math.round(((cups - even) / cups) * 100)}% before a loss` },
          { label: 'Rent paid off by day', value: rentDay(price, cups, rent) ?? DAYS, target: DAYS, fmt: 'int', unit: `of ${DAYS}`, note: 'Every cup after that is profit' },
        ],
      },
    ],
  };
}

export const DASHES: Record<DashName, Dash> = {
  'dash:branch': branchDash(),
  'dash:bench': benchDash(),
  'dash:orders': ordersDash(),
  'dash:pricing': pricingDash(),
};

// Colours: copied from the plugin's ui/colours.tsx (MIT), dark mode only.

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

export function parseHex(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 };
}
export const toHex = ({ r, g, b }: Rgb) => `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const linear = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ({ r, g, b }: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
export function contrast(a: Rgb, b: Rgb) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
function toHsl({ r, g, b }: Rgb): Hsl {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rr ? ((gg - bb) / d + 6) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { h: h * 60, s, l };
}
function fromHsl({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}
/** The plugin's stand-in for a dark card. */
export const SURFACE: Rgb = { r: 30, g: 30, b: 30 };
/** The colour, lightened just enough to keep 3:1 against the dark surface. */
export function forMarks(colour: Rgb, min = 3): Rgb {
  const hsl = toHsl(colour);
  let out = { ...colour };
  while (contrast(out, SURFACE) < min && hsl.l < 1) {
    hsl.l = Math.min(1, hsl.l + 0.02);
    out = fromHsl(hsl);
  }
  return out;
}
/** Eight series colours: the accent made legible, then seven hues a golden angle apart. */
export function palette(accent: Rgb): string[] {
  const { h, s } = toHsl(accent);
  const saturation = Math.min(0.8, Math.max(0.5, s));
  const rest = Array.from({ length: 7 }, (_, i) => toHex(forMarks(fromHsl({ h: (h + 137.508 * (i + 1)) % 360, s: saturation, l: 0.62 + (i % 2 === 0 ? 0.06 : -0.04) }))));
  return [toHex(forMarks(accent)), ...rest];
}

/** The plugin's accent swatches, as its Colours popover lists them. */
export const ACCENTS = [
  { name: 'Blue', hex: '#2f6fde' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Green', hex: '#2f9e44' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Orange', hex: '#e8590c' },
  { name: 'Red', hex: '#e03131' },
  { name: 'Pink', hex: '#d6336c' },
  { name: 'Purple', hex: '#7048e8' },
] as const;

// The demo's state.

/** The two ready-made requests the Edit popover offers, worded for what the chart is now. */
export const requests = (s: Spec) => [
  { text: s.trend === 'line' ? 'Show this as bars' : 'Show this as a line', apply: (x: Spec): Spec => ({ ...x, trend: x.trend === 'line' ? 'bars' : 'line' }) },
  { text: s.lastYear ? 'Remove last year’s line' : 'Add last year’s line', apply: (x: Spec): Spec => ({ ...x, lastYear: !x.lastYear }) },
];

export interface DemoState {
  /** Saved versions, oldest first. Empty: nothing has been asked for yet. */
  versions: Spec[];
  /** An older version shown read-only (its index), or null for the latest. */
  viewing: number | null;
  channel: Channel;
  /** An ACCENTS index, or null for the product's own colour. */
  accent: number | null;
  calls: number;
  editing: boolean;
  picked: boolean;
  request: number | null;
  open: 'colours' | 'versions' | null;
  /** Says "Checked and saved · version n" until something else is done. */
  saved: boolean;
}

export const HAND: DemoState = { versions: [FIRST], viewing: null, channel: 'all', accent: null, calls: 0, editing: false, picked: false, request: null, open: null, saved: false };

/** The version on screen. */
export const shown = (s: DemoState): Spec | undefined => s.versions[s.viewing ?? s.versions.length - 1];

/** A change asked of the agent: one model call, saved as the next version, back on the latest. */
export const save = (s: DemoState, edit: (x: Spec) => Spec): DemoState => {
  const latest = s.versions.at(-1) ?? FIRST;
  return { ...s, versions: [...s.versions, edit(latest)], viewing: null, calls: s.calls + 1, editing: false, picked: false, request: null, open: null, saved: true };
};

/** Send the request chosen in the Edit popover. Nothing is sent from an old version or without a request. */
export function send(s: DemoState): DemoState {
  const latest = s.versions.at(-1);
  if (s.request === null || s.viewing !== null || !latest) return s;
  return save(s, requests(latest)[s.request].apply);
}
