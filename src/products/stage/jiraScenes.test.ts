import assert from 'node:assert/strict';
import { test } from 'node:test';
import { products } from '../data';
import { findBlock } from '../types';
import { assignable, counts, positionOf, tally, type JState } from './jira';
import { JIRA_SCENES, type Input } from './jiraScenes';
import { SCENES } from './names';

const block = findBlock(products.find((p) => p.slug === 'jira-board')!, 'scenes')!;
const costOf = (i: number) => Number(/^(\d+)/.exec(block.scenes[i].cost ?? '')?.[1]);
const clicks = (inputs: Input[]) => inputs.filter((i) => 'click' in i).length;
/** Every state a scene passes through, in order. */
function states(i: number): JState[] {
  const sc = JIRA_SCENES[i];
  const out = [sc.start];
  for (const step of sc.inputs) out.push('type' in step ? step.run(out.at(-1)!, step.type) : step.run(out.at(-1)!));
  return out;
}

void test('the page has a tab for every scene the demo plays', () => {
  assert.equal(block.scenes.length, SCENES['jira-demo']);
  assert.equal(JIRA_SCENES.length, SCENES['jira-demo']);
});

void test('every scene’s inputs land before the hold ends', () => {
  for (const sc of JIRA_SCENES) for (const i of sc.inputs) assert.ok(i.at + ('type' in i ? i.type.length * 0.14 : 0) < 7.5, `an input at ${i.at}s is too late`);
});

void test('Close the tabs: one tab, and the list as it is', () => {
  assert.equal(costOf(0), 1);
  assert.equal(JIRA_SCENES[0].inputs.length, 0);
  assert.deepEqual(JIRA_SCENES[0].end, JIRA_SCENES[0].start);
});

void test('Hands on the keys: no clicks, and the walk reaches the initiative by way of ACME-121, 5 of 12', () => {
  assert.equal(clicks(JIRA_SCENES[1].inputs), costOf(1));
  const walk = states(1);
  assert.ok(walk.some((s) => s.open === 'ACME-121' && positionOf(s)?.index === 4));
  assert.deepEqual(walk.slice(-2).map((s) => s.open), ['ACME-100', 'ACME-10']);
});

void test('Move it on: one click, and the ticket leaves the open list for Done', () => {
  assert.equal(clicks(JIRA_SCENES[2].inputs), costOf(2));
  assert.deepEqual(counts(JIRA_SCENES[2].start), { open: 12, done: 6 });
  assert.deepEqual(counts(JIRA_SCENES[2].end), { open: 11, done: 7 });
});

void test('Hand it off: one ticket handed off, to the second Alex Kim, after "alex" finds both', () => {
  const sc = JIRA_SCENES[3];
  assert.equal(tally(sc.start) - tally(sc.end), costOf(3));
  assert.equal(sc.end.issues['ACME-147'].assignee, 'alex-2');
  assert.equal(assignable('alex').filter((p) => p.name === 'Alex Kim').length, 2);
});
