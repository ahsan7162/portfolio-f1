import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bare } from './stop';

void test('a one-sentence line loses its full stop', () => {
  assert.equal(bare('Open the selected ticket.'), 'Open the selected ticket');
  assert.equal(bare('Requires bb 0.49 or later.'), 'Requires bb 0.49 or later');
  assert.equal(bare('The `bb` thread, queued if it’s busy.'), 'The `bb` thread, queued if it’s busy');
});

void test('two sentences, questions and lines without a stop stay as they are', () => {
  assert.equal(bare('Move through the list. With a ticket open, open the next one.'), 'Move through the list. With a ticket open, open the next one.');
  assert.equal(bare('Which agent gets the fix?'), 'Which agent gets the fix?');
  assert.equal(bare('Every reason'), 'Every reason');
  assert.equal(bare('Wait for it...'), 'Wait for it...');
});
