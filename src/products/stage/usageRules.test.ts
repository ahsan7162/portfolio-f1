import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIVE_HOURS, fmtDuration, leadOf, ONE_WEEK, projectionOf, readWindow, verdictOf, type Window } from './usageRules';

const NOW = Date.UTC(2026, 10, 6, 12);
const at = (leftMs: number) => new Date(NOW + leftMs).toISOString();
const H = 3_600_000;

// The plugin's own limits screenshot (limits.jpg): its three tiles, read by the copied rules, say what the screenshot says.
void test('the screenshot’s windows read as the plugin shows them', () => {
  const windows: Window[] = [
    { kind: 'five-hour', label: 'Session', usedPercent: 28, resetsAt: at(3 * H + 12 * 60_000), windowMs: FIVE_HOURS },
    { kind: 'weekly', label: 'Weekly', usedPercent: 54, resetsAt: at(3 * 24 * H + 2 * H), windowMs: ONE_WEEK },
    { kind: 'weekly', label: 'Weekly · Fable', usedPercent: 6, resetsAt: at(3 * 24 * H + 2 * H), windowMs: ONE_WEEK },
  ];
  const [session, weekly, fable] = windows.map(w => readWindow(w, NOW));
  assert.equal(verdictOf(session), 'Room for a big task.');
  assert.equal(projectionOf(session), 'On pace to use 78% before it resets.');
  assert.equal(verdictOf(weekly), 'Ease off to last the week.');
  assert.equal(projectionOf(weekly), 'On pace to use 97% before it resets.');
  assert.equal(verdictOf(fable), 'On pace for the week.');
  assert.equal(projectionOf(fable), 'On pace to use 11% before it resets.');
  assert.equal(verdictOf(leadOf([session, weekly, fable])), 'Ease off to last the week.');
  assert.equal(fmtDuration(3 * H + 12 * 60_000), '3h 12m');
  assert.equal(fmtDuration(3 * 24 * H + 2 * H), '3d 2h');
});

void test('a window running out says so, and a full one says when it is back', () => {
  const session = (used: number, leftMs: number) => readWindow({ kind: 'five-hour', label: 'Session', usedPercent: used, resetsAt: at(leftMs), windowMs: FIVE_HOURS }, NOW);
  assert.equal(verdictOf(session(80, 4 * H)), 'Wrap up: this session is running out.');
  assert.equal(projectionOf(session(80, 4 * H)), 'At this pace the limit is hit in 15m.');
  assert.equal(verdictOf(session(100, H)), 'Wait for the reset.');
  assert.equal(projectionOf(session(100, H)), 'Limit reached. Back in 1h 0m.');
});
