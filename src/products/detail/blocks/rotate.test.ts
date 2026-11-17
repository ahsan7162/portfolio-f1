import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stepIndex } from './rotate';

void test('rotate: next and previous wrap around both ends', () => {
  assert.equal(stepIndex(0, 4, 'next'), 1);
  assert.equal(stepIndex(3, 4, 'next'), 0);
  assert.equal(stepIndex(0, 4, 'prev'), 3);
  assert.equal(stepIndex(2, 4, 'prev'), 1);
});

void test('rotate: go-to lands on the index, wrapping one that is out of range', () => {
  assert.equal(stepIndex(0, 5, 3), 3);
  assert.equal(stepIndex(2, 5, 5), 0);
  assert.equal(stepIndex(2, 5, -1), 4);
  assert.equal(stepIndex(2, 5, 12), 2);
});

void test('rotate: a count of 1 (or none) always stays on 0', () => {
  for (const move of ['next', 'prev', 0, 3, -2] as const) {
    assert.equal(stepIndex(0, 1, move), 0);
    assert.equal(stepIndex(0, 0, move), 0);
  }
});
