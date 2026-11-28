import assert from 'node:assert/strict';
import test from 'node:test';
import { CANVAS_MIN, fit, FRESH, LEFT, readLayout, RIGHT } from './layout';

void test('a fresh layout suits the window', () => {
  assert.deepEqual(fit(FRESH, 1440), { left: 300, right: 420 });
  assert.deepEqual(fit(FRESH, 1100), { left: 260, right: 360 });
});

void test('a chosen width stays inside its bounds', () => {
  assert.deepEqual(fit({ ...FRESH, left: 40, right: 9000 }, 2400), { left: LEFT[0], right: RIGHT[1] });
});

void test('a closed pane takes no room', () => {
  assert.deepEqual(fit({ ...FRESH, leftOpen: false }, 1440), { left: 0, right: 420 });
  assert.deepEqual(fit({ ...FRESH, leftOpen: false, rightOpen: false }, 1440), { left: 0, right: 0 });
});

void test('a narrow window shrinks the right pane first, and the canvas keeps its room', () => {
  const { left, right } = fit({ ...FRESH, left: 400, right: 700 }, 1200);
  assert.equal(left, 400);
  assert.equal(left + right + CANVAS_MIN, 1200);
  const tight = fit({ ...FRESH, left: 400, right: 700 }, 1000);
  assert.deepEqual(tight, { left: 1000 - CANVAS_MIN - RIGHT[0], right: RIGHT[0] });
});

void test('a stored layout is read field by field', () => {
  assert.deepEqual(readLayout(null), FRESH);
  assert.deepEqual(readLayout('x'), FRESH);
  assert.deepEqual(readLayout({ left: '300', right: Infinity, split: 5, leftOpen: 'no', rightOpen: false }), { ...FRESH, split: 0.8, rightOpen: false });
  assert.deepEqual(readLayout({ left: 320, leftOpen: false }), { ...FRESH, left: 320, leftOpen: false });
  assert.deepEqual(readLayout({ closed: ['layers', 7, 'x'.repeat(61), 'fields'] }).closed, ['layers', 'fields']);
  assert.deepEqual(readLayout({ closed: 'layers' }).closed, []);
});
