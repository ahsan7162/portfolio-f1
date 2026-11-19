// The OpenUI Live Replies page against the plugin: what a click sends, how the demo's scenes rank, the figures the
// replies quote, and that every component the page says it draws is drawn.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { products } from '../data';
import { findBlock } from '../types';
import { LIVE_NAMES, OUI_UNDRAWN, SCENES } from './names';
import { OUI_GROUPS } from './oui/catalog.gen';
import { ASK_COPY } from './oui/copy';
import { OUI_EXAMPLES } from './oui/examples.gen';
import { els, num, nums, str } from './oui/kit';
import { isEl, resolve, type El } from './oui/lang';
import { rank, totals, weightedScore } from './oui/plugin/planning';
import { ASKS, DECISION } from './oui/programs';
import { clickedWords, send, OPENING, TUNE } from './ouiThread';
import { OUI_SCENES } from './ouiScenes';

/** The Decision in the demo's first reply, as data. */
function decision() {
  const root = resolve(DECISION.program) as El;
  const d = els(root.props.children)[0];
  return { options: els(d.props.options).map((o) => ({ name: str(o.props.name), scores: nums(o.props.scores) })), criteria: els(d.props.options).length ? (d.props.criteria as string[]) : [], weights: nums(d.props.weights) };
}

void test('Go with sends the plugin’s exact words, weights and all', async () => {
  const { decisionMessage } = await import('./oui/planning');
  const { criteria } = decision();
  // planning.tsx in the plugin: `Go with ${leader.name} (weights: ${criteria.map((c, i) => `${c} ${weights[i]}`).join(", ")})`
  assert.equal(decisionMessage('Redis queue', criteria, [5, 1, 4, 2]), 'Go with Redis queue (weights: Throughput 5, Ops cost 1, Delivery 4, Local dev 2)');
});

void test('the Tune scene’s clicks put Redis queue ahead, 85% to 82%, by the plugin’s own scoring', () => {
  const { options, weights } = decision();
  const w = [...weights];
  for (const sel of TUNE) {
    const [, dir, c] = /"(More|Less) weight on (.+)"/.exec(sel)!;
    const i = ['Throughput', 'Ops cost', 'Delivery', 'Local dev'].indexOf(c);
    w[i] += dir === 'More' ? 1 : -1;
  }
  assert.deepEqual(w, [5, 1, 4, 2]);
  assert.equal(options[rank(options, weights)[0]].name, 'Postgres queue');
  assert.equal(options[rank(options, w)[0]].name, 'Redis queue');
  assert.equal(Math.round(weightedScore(options[1].scores, w) * 100), 85);
  assert.equal(Math.round(weightedScore(options[0].scores, w) * 100), 82);
});

void test('the tally counts the words a click sent: 15 for Go with, 3 more for Approve', () => {
  const go = send(OPENING, 'Go with Redis queue (weights: Throughput 5, Ops cost 1, Delivery 4, Local dev 2)', true);
  assert.equal(clickedWords(go), 15);
  assert.equal(clickedWords(send(go, 'Approve the plan', true)), 18);
  assert.equal(OUI_SCENES.length, SCENES['openui-demo']);
});

void test('the estimate reply quotes the plugin’s own P50 and P90', () => {
  const est = ASKS.find((a) => a.id === 'estimate')!;
  const e = els((resolve(est.program) as El).props.children)[0];
  const t = totals(els(e.props.tasks).map((x) => ({ low: num(x.props.low)!, high: num(x.props.high)!, likely: num(x.props.likely) })));
  assert.match(est.prose, new RegExp(`About ${Math.round(t.p50)} days, ${Math.round(t.p90)} to be safe`));
});

void test('every ask has its program and its live screen', () => {
  for (const a of ASK_COPY) {
    assert.ok(ASKS.find((x) => x.id === a.id)?.program, a.id);
    assert.ok((LIVE_NAMES as readonly string[]).includes(`oui:${a.id}`), a.id);
  }
});

void test('every component the page draws has a drawing, and an example to draw it from', async () => {
  const { NUMBERS } = await import('./oui/numbers');
  const { PLANNING } = await import('./oui/planning');
  const { REPORTS } = await import('./oui/reports');
  const { WEB } = await import('./oui/web');
  const drawn = { ...NUMBERS, ...PLANNING, ...REPORTS, ...WEB };
  const names = OUI_GROUPS.flatMap((g) => g.items.map((i) => i.name));
  assert.equal(names.length, 62);
  for (const n of names) {
    assert.ok(OUI_EXAMPLES[n], `${n} has no example`);
    if (!OUI_UNDRAWN.includes(n)) assert.ok(drawn[n], `${n} is shown as drawn but the kit does not draw it`);
  }
  // every example parses to a root the kit can walk
  for (const n of names) assert.ok(isEl(resolve(OUI_EXAMPLES[n])), n);
});

void test('the page is wired: specimens list all 62, prompts all eight asks', () => {
  const p = products.find((x) => x.slug === 'openui-live-replies')!;
  const spec = findBlock(p, 'specimens')!;
  assert.equal(spec.groups.reduce((n, g) => n + g.items.length, 0), 62);
  assert.equal(findBlock(p, 'prompts')!.prompts.length, ASK_COPY.length);
});
