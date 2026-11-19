import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changed, diffRows, gutter, linesChanged } from './lineDiff';

void test('nothing changed is zero lines, whatever the trailing newline', () => {
  assert.equal(linesChanged('a\nb\n', 'a\nb\n'), 0);
  assert.equal(linesChanged('a\nb', 'a\nb\n'), 0);
});

void test('a replaced line counts once, like git', () => {
  const rows = diffRows('a\nb\nc\n', 'a\nB\nc\n');
  assert.deepEqual(rows.map((r) => r.op), ['eq', 'del', 'add', 'eq']);
  assert.equal(changed(rows), 1);
  assert.deepEqual(gutter(rows).marks, ['same', 'mod', 'same']);
});

void test('added lines count each, and are marked added', () => {
  const rows = diffRows('a\nc\n', 'a\nb1\nb2\nc\n');
  assert.equal(changed(rows), 2);
  assert.deepEqual(gutter(rows).marks, ['same', 'add', 'add', 'same']);
});

void test('a removal with nothing in its place leaves a cut before the next line', () => {
  const rows = diffRows('a\nb\nc\n', 'a\nc\n');
  assert.equal(changed(rows), 1);
  const g = gutter(rows);
  assert.deepEqual(g.marks, ['same', 'same']);
  assert.deepEqual([...g.cuts], [1]);
});

void test('separate runs add up; within a run the longer side counts', () => {
  assert.equal(linesChanged('1\n2\n3\n4\n5\n', 'x\n2\n3\ny\nz\nw\n'), 1 + 3);
});
