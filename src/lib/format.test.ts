import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lapTime } from './format';

void test('lapTime carries a rounded-up second into the minute', () => {
  assert.equal(lapTime(0), '0:00.000');
  assert.equal(lapTime(83.456), '1:23.456');
  assert.equal(lapTime(59.9996), '1:00.000');
  assert.equal(lapTime(119.99951), '2:00.000');
});
