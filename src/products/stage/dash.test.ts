import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIVE_NAMES } from './names';
import {
  ACCENTS, BENCH, CHANNELS, COST_PER_CUP, DASHES, HAND, breakEven, change, contrast, fmt, forMarks, funnel, month, palette, parseHex, profit,
  rentDay, sales, salesDash, send, shown, split, ticks, toHex, treemap, waterfall, type Kpi, type Part, WEEKS,
} from './dash';
import type { LiveName } from './names';

const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
/** The first part of a kind on a live screen. */
const part = <K extends Part['kind']>(name: LiveName, kind: K) => DASHES[name].parts.find((p): p is Extract<Part, { kind: K }> => p.kind === kind)!;

void test('a split always adds up to its total', () => {
  assert.deepEqual(split(798, [412, 301, 85]), [412, 301, 85]);
  for (const total of [0, 1, 7, 131, 22460]) assert.equal(sum(split(total, [0.45, 0.35, 0.2])), total);
});

void test('the three channels add up to All, week by week and product by product', () => {
  const all = sales('all');
  const parts = CHANNELS.filter((c) => c !== 'all').map(sales);
  for (const key of ['revenue', 'orders', 'customers', 'lastYear', 'products'] as const) {
    all[key].forEach((total, i) => assert.equal(sum(parts.map((p) => p[key][i])), total, `${key}[${i}]`));
  }
  // the bars add up to the revenue tile in every channel
  for (const ch of CHANNELS) assert.equal(sum(sales(ch).products), sales(ch).revenue[WEEKS.length - 1], ch);
  assert.ok(parts.every((p) => p.products.every((v) => v > 0)), 'no empty bar');
});

void test('All shows the plugin’s own numbers', () => {
  const tiles = (salesDash('all').parts[0] as { tiles: Kpi[] }).tiles;
  assert.deepEqual(tiles.map((t) => fmt(t.value, t.fmt)), ['$22,460', '798', '$28.15', '131']);
  assert.deepEqual(tiles.map((t) => change(t.value, t.prev ?? 0)), ['+6.2%', '+4.9%', '+1.3%', '+10.1%']);
});

void test('the pricing maths: profit, break-even, and no break-even when a cup earns nothing', () => {
  assert.equal(profit(4.5, 140, 6800), 7480);
  assert.equal(profit(2, 40, 6800), -5720);
  assert.equal(breakEven(4.5, 6800), 67);
  assert.ok(profit(4.5, 67, 6800) >= 0 && profit(4.5, 66, 6800) < 0);
  assert.equal(breakEven(1.1, 6800), null);
  assert.equal(breakEven(0.5, 6800), null);
});

void test('the benchmark lists the worst p95 regression first', () => {
  const rises = BENCH.map((b) => b.p95 - b.p95prev);
  assert.deepEqual(rises, [...rises].sort((a, b) => b - a));
  assert.equal(BENCH[0].endpoint, 'POST /orders');
  // the heatmap's last two runs are the previous run and this one
  const heat = part('dash:bench', 'heatmap');
  heat.values.forEach((row, i) => assert.deepEqual(row.slice(-2), [BENCH[i].p95prev, BENCH[i].p95], BENCH[i].endpoint));
});

void test('the waterfall comes to the profit, and the rent is paid off on the day it says', () => {
  for (const [price, cups, rent] of [[4.5, 140, 6800], [3.2, 90, 4000], [6, 250, 12000]]) {
    assert.equal(waterfall(month(price, cups, rent)).at(-1)!.to, profit(price, cups, rent), `${price} ${cups} ${rent}`);
    const day = rentDay(price, cups, rent)!;
    const earned = (d: number) => (price - COST_PER_CUP) * cups * d;
    assert.ok(earned(day) >= rent && earned(day - 1) < rent, `day ${day}`);
  }
  assert.deepEqual(waterfall([10, -3, -2]), [{ from: 0, to: 10 }, { from: 10, to: 7 }, { from: 7, to: 5 }, { from: 0, to: 5 }]);
  assert.equal(rentDay(1.1, 140, 6800), null);
  const w = part('dash:pricing', 'waterfall');
  assert.deepEqual(w.values, [18900, -4620, -6800]);
});

void test('a treemap fills its box, each cell in proportion to its value', () => {
  const values = [148, 121, 96, 64, 52, 41, 23, 19, 18, 9, 4, 3];
  const cells = treemap(values);
  assert.equal(cells.length, values.length);
  cells.forEach((c, i) => {
    assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= 100 + 1e-9 && c.y + c.h <= 100 + 1e-9, `cell ${i} inside`);
    assert.ok(Math.abs(c.w * c.h - (values[i] / sum(values)) * 10000) < 1e-6, `cell ${i} in proportion`);
  });
  assert.deepEqual(treemap([5]), [{ x: 0, y: 0, w: 100, h: 100 }]);
});

void test('the branch screen agrees with itself', () => {
  const tiles = part('dash:branch', 'kpis').tiles;
  const rows = part('dash:branch', 'list').rows;
  const tree = part('dash:branch', 'treemap');
  const [commits, passed, reviewed, added] = tiles;
  assert.equal(commits.value, rows.length);
  assert.equal(sum(commits.spark ?? []), rows.length);
  // one dot per commit, oldest first, each the colour of its badge
  assert.deepEqual(passed.states, rows.map((r) => (r.badge?.tone === 'good' || r.badge?.tone === 'bad' ? r.badge.tone : null)).reverse());
  assert.equal(passed.value, rows.filter((r) => r.badge?.tone === 'good').length);
  assert.equal(reviewed.target, tree.values.length);
  assert.ok(reviewed.value <= (reviewed.target ?? 0));
  assert.equal(sum(tree.values), added.value + 112, 'lines added and removed');
  assert.deepEqual(tree.values, [...tree.values].sort((a, b) => b - a), 'biggest first');
});

void test('the orders funnel only shrinks, and its weakest step is the lowest conversion', () => {
  assert.deepEqual(funnel([42, 31, 24, 17]), { rates: [74, 77, 71], weakest: 3 });
  const f = part('dash:orders', 'funnel');
  assert.ok(f.values.every((v, i) => !i || v <= f.values[i - 1]));
  const tabs = part('dash:orders', 'tabs').tabs;
  assert.equal(tabs[2][1], f.values.at(-1), 'shipped today');
  assert.ok(part('dash:orders', 'callout').head.startsWith(`${tabs[1][1]} `), 'the callout counts what the tab counts');
  const list = part('dash:orders', 'list');
  assert.equal(part('dash:orders', 'drawer').title, list.rows[list.picked ?? -1]?.title, 'the drawer shows the picked row');
});

void test('the carousel shows many kinds of part, and plain line or bar charts on two screens at most', () => {
  const plain = Object.entries(DASHES).filter(([, d]) => d.parts.some((p) => p.kind === 'line' || (p.kind === 'bars' && !p.as)));
  assert.ok(plain.length <= 2, plain.map(([n]) => n).join());
  const looks = new Set(Object.values(DASHES).flatMap((d) => d.parts.flatMap((p) => [
    p.kind === 'bars' && p.as ? p.as : p.kind,
    ...(p.kind === 'kpis' ? p.tiles.flatMap((t) => [t.states ? 'states' : '', t.target === undefined ? '' : 'progress']) : []),
  ])));
  const fresh = [...looks].filter((l) => l && !['kpis', 'line', 'bars', 'donut', 'list', 'sliders'].includes(l));
  assert.ok(fresh.length >= 8, fresh.join());
});

void test('formats and ticks', () => {
  assert.equal(fmt(-2720, 'usd'), '−$2,720');
  assert.equal(fmt(24000, 'usdk'), '$24K');
  assert.equal(fmt(486, 'plus'), '+486');
  assert.deepEqual(ticks(0, 22460), [0, 6000, 12000, 18000, 24000]);
  const t = ticks(-2720, 18700);
  assert.ok(t[0] <= -2720 && t.at(-1)! >= 18700 && t.includes(0) && t.length <= 7);
});

void test('every live screen is a well-formed dashboard', () => {
  for (const name of LIVE_NAMES) {
    const d = DASHES[name];
    const ids = d.parts.map((p) => p.id);
    const grid = (rows: string[]) => {
      const cols = rows.map((r) => r.split(' ').length);
      assert.ok(cols.every((c) => c === cols[0]), `${name}: rows of one width`);
      assert.deepEqual([...new Set(rows.join(' ').split(' '))].sort(), [...ids].sort(), `${name}: every part placed once`);
    };
    assert.ok(d.title && d.parts.length > 0, name);
    assert.equal(new Set(ids).size, ids.length, `${name}: unique ids`);
    grid(d.areas);
    if (d.narrow) grid(d.narrow);
    for (const p of d.parts) {
      if (p.kind === 'line') assert.ok(p.series.every((s) => s.values.length === p.x.length), `${name}/${p.id}`);
      if (p.kind === 'bars') assert.ok(p.series.every((s) => s.values.length === p.labels.length) && p.series.length <= 2, `${name}/${p.id}`);
      if (p.kind === 'donut') assert.equal(p.values.length, p.labels.length, `${name}/${p.id}`);
      if (p.kind === 'kpis') assert.ok(p.tiles.length >= 1 && p.tiles.length <= 4, `${name}/${p.id}`);
      if (p.kind === 'bars' && p.as) assert.equal(p.series.length, 2, `${name}/${p.id}: a dumbbell joins two series`);
      if (p.kind === 'treemap') assert.ok(p.values.length === p.labels.length && p.groups.length === p.labels.length && new Set(p.groups).size <= 4, `${name}/${p.id}`);
      if (p.kind === 'heatmap') assert.ok(p.values.length === p.rows.length && p.values.every((r) => r.length === p.cols.length), `${name}/${p.id}`);
      if (p.kind === 'table') assert.ok(p.rows.every((r) => r.length === p.cols.length), `${name}/${p.id}`);
      if (p.kind === 'funnel') assert.equal(p.values.length, p.labels.length, `${name}/${p.id}`);
      if (p.kind === 'waterfall') assert.equal(p.values.length, p.labels.length, `${name}/${p.id}`);
    }
  }
  for (const spec of [{ orders: true, trend: 'bars', lastYear: true }] as const) salesDash('wholesale', spec);
});

void test('only a Send costs a model call', () => {
  const filtered = { ...HAND, channel: 'shop' as const, accent: 3, viewing: null };
  assert.equal(send(filtered).calls, 0, 'nothing chosen: nothing sent');
  const asked = send({ ...filtered, editing: true, picked: true, request: 0 });
  assert.equal(asked.calls, 1);
  assert.equal(asked.versions.length, 2);
  assert.equal(shown(asked)?.trend, 'bars');
  assert.equal(asked.editing, false);
  const old = { ...asked, viewing: 0, request: 0 };
  assert.equal(send(old), old, 'an old version is read-only');
  assert.equal(shown(old)?.trend, 'line');
});

void test('picking an accent gives the plugin’s chart colours', () => {
  for (const { hex } of ACCENTS) {
    const p = palette(parseHex(hex));
    assert.equal(p.length, 8);
    assert.equal(new Set(p).size, 8);
    assert.equal(p[0], toHex(forMarks(parseHex(hex))));
    assert.ok(p.every((c) => contrast(parseHex(c), { r: 30, g: 30, b: 30 }) >= 3));
  }
  assert.equal(toHex(forMarks(parseHex('#2f6fde'))), '#2f6fde'); // as the plugin's own test has it
});
