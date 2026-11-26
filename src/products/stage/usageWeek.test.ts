import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leadOf, projectionOf, readWindow, verdictOf } from './usageRules';
import { BEATS, clockAt, momentAt, nowAt, REST } from './usageWeek';

const headline = (minute: number) => verdictOf(leadOf(momentAt(minute).windows.map(w => readWindow(w, nowAt(minute)))));

// The moments the demo stops on, read by the plugin's own rules, say what the page promises.
void test('the sample week tells its story', () => {
  assert.deepEqual(BEATS.map(headline), [
    'Room for a big task.',
    'Wrap up: this session is running out.',
    'Wait for the reset.',
    'Ease off to last the week.',
  ]);
  assert.equal(BEATS.at(-1), REST);
  assert.equal(clockAt(REST), 'Thursday, 22:00');
});

void test('at rest it reads like the plugin’s own screenshot', () => {
  const weekly = readWindow(momentAt(REST).windows[1], nowAt(REST));
  assert.equal(projectionOf(weekly), 'On pace to use 97% before it resets.');
});

void test('a session fills, stops at full and resets five hours after it began', () => {
  const at = (h: number, m = 0) => momentAt(2 * 1440 + h * 60 + m).windows[0];
  assert.ok(at(18, 40).usedPercent === 100 && at(18, 55).usedPercent === 100);
  assert.equal(at(18, 59).resetsAt, new Date(Date.UTC(2026, 10, 4, 19)).toISOString());
  assert.ok(at(19, 5).usedPercent < 5);
});
