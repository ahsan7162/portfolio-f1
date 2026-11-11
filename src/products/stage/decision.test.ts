import assert from 'node:assert/strict';
import { test } from 'node:test';
import { weighted } from './decision';

void test('a weighted score is the share of the best possible, and no weights means no score', () => {
  assert.equal(weighted([4, 5, 4, 4], [3, 5, 4, 2]), 87);
  assert.equal(weighted([5, 2, 4, 4], [3, 5, 4, 2]), 70);
  assert.equal(weighted([5, 5, 5, 5], [1, 2, 3, 4]), 100);
  assert.equal(weighted([4, 5, 4, 4], [0, 0, 0, 0]), 0);
});
