import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PR_PROMPTS, PR_RUNS } from './prData.gen';
import { BLOCKERS } from './prRules.gen';
import { blockersOf, facts, land, pick, promptKey, push, send, START, tally, totals, type Ci, type Review, type World } from './pr';

void test('the page’s blockersOf gives the plugin’s blockers for every state the rules block can show', () => {
  assert.equal(BLOCKERS.length, 288);
  for (const [state, want] of BLOCKERS) {
    const s = JSON.parse(state) as { isDraft: boolean; stacked: boolean; conflicts: boolean; ci: Ci; reviewDecision: Review; unresolvedThreads: number };
    const got = blockersOf({ ...s, stackedOn: s.stacked ? 478 : null, failingChecks: s.ci === 'failing' ? 2 : 0 });
    assert.deepEqual(got, want, state);
  }
});

const all = (w: World, keys: World['picked']) => keys.reduce(pick, w);

void test('#482 starts with three blockers, and one Send of everything clears them all', () => {
  assert.deepEqual(blockersOf(facts(START)), ['CI failing (2 checks)', 'Changes requested', '2 unresolved comments']);
  assert.equal(tally(START), 3);
  const sent = send(all(START, ['lint', 'jitter', 'unit', 'gone']));
  assert.deepEqual(sent.sent, ['jitter', 'gone', 'unit', 'lint'], 'sent in the PR’s order, as the plugin does');
  assert.deepEqual(blockersOf(facts(push(sent))), ['CI running', 'Changes requested', '2 unresolved comments']);
  const done = land(push(sent));
  assert.equal(tally(done), 0);
  assert.equal(done.alerts, 1, 'the approval arrives as one alert');
  assert.deepEqual(totals(done), { failing: 0, unresolved: 0, changes: 0, ready: 2 });
});

void test('the world fixes only what was sent', () => {
  const checks = land(push(send(all(START, ['unit', 'lint']))));
  assert.deepEqual(blockersOf(facts(checks)), ['Changes requested', '2 unresolved comments']);
  const mina = land(push(send(all(START, ['jitter']))));
  assert.deepEqual(blockersOf(facts(mina)), ['CI failing (2 checks)', '1 unresolved comment']);
  assert.equal(pick(mina, 'jitter'), mina, 'a fixed finding can’t be picked again');
});

void test('every pick has the plugin’s prompt, and the morning replays as the plugin alerts', () => {
  assert.equal(Object.keys(PR_PROMPTS).length, 15);
  assert.ok(PR_PROMPTS[promptKey(['lint', 'jitter'])]?.includes('### 2. Failed CI job'));
  const at = (key: string) => PR_RUNS[key].filter(c => c.alerts.length).map(c => `${c.at} ${c.alerts.map(a => a.headline).join(' | ')}`);
  assert.deepEqual(at('11||5'), [
    '09:30 ci-helper commented · acme/web-checkout#1210',
    '09:35 CI failing · acme/web-checkout#1207',
    '09:45 mina-k commented · acme/payments-api#482 | priya-n commented · acme/payments-api#479',
  ], 'the first check only records a baseline; the bot and your own comment never alert');
  assert.equal(at('11|ci-helper|5').length, 2, 'an ignored name never alerts');
  assert.equal(PR_RUNS['11||5'].find(c => c.at === '09:45')?.push?.title, '2 new PR alerts', 'one notification per check');
});
