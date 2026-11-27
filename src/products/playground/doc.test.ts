import assert from 'node:assert/strict';
import test from 'node:test';
import { CATALOG, sample, STARTERS } from './catalog';
import { act, notABlock, start } from './doc';
import { isLiteral } from './literal';

const plugin = STARTERS[0];

void test('every block in the catalogue has content to start from, as plain data', () => {
  for (const e of CATALOG) {
    const b = sample(e.type);
    assert.equal(b.type, e.type, e.type);
    assert.ok(isLiteral(JSON.parse(JSON.stringify(b))), e.type);
  }
  assert.equal(new Set(CATALOG.map(e => e.type)).size, CATALOG.length);
});

void test('insert, move, duplicate and remove keep blocks and keys together', () => {
  let s = start(plugin);
  const n = s.doc.blocks.length;
  s = act(s, { do: 'insert', block: sample('marquee'), at: 1 });
  assert.equal(s.doc.blocks[1].type, 'marquee');
  assert.equal(s.selected, 1);
  const k = s.doc.keys[1];
  s = act(s, { do: 'move', from: 1, to: 4 });
  assert.equal(s.doc.blocks[4].type, 'marquee');
  assert.equal(s.doc.keys[4], k);
  s = act(s, { do: 'duplicate', i: 4 });
  assert.equal(s.doc.blocks[5].type, 'marquee');
  assert.notEqual(s.doc.keys[5], k);
  assert.notEqual(s.doc.blocks[5], s.doc.blocks[4]);
  s = act(s, { do: 'remove', i: 5 });
  s = act(s, { do: 'remove', i: 4 });
  assert.equal(s.doc.blocks.length, n);
  assert.equal(s.doc.keys.length, n);
  assert.equal(new Set(s.doc.keys).size, n);
});

void test('undo and redo walk the history; a new change drops what was undone', () => {
  let s = start(plugin);
  const first = s.doc;
  s = act(s, { do: 'remove', i: 0 });
  s = act(s, { do: 'meta', meta: { brand: '#123456' } });
  s = act(s, { do: 'undo' });
  s = act(s, { do: 'undo' });
  assert.equal(s.doc, first);
  s = act(s, { do: 'redo' });
  assert.equal(s.doc.blocks.length, first.blocks.length - 1);
  s = act(s, { do: 'insert', block: sample('quote'), at: 0 });
  assert.equal(s.future.length, 0);
  assert.equal(act(s, { do: 'redo' }), s);
});

void test('code that rewrites the page keeps keys where the same type stays put', () => {
  let s = start(plugin);
  const keys = s.doc.keys;
  const blocks = s.doc.blocks.map(b => (b.type === 'statement' ? { ...b, head: 'Changed' } : b));
  s = act(s, { do: 'blocks', blocks: [...blocks.slice(0, 2), sample('quote'), ...blocks.slice(3)] });
  assert.equal(s.doc.keys[0], keys[0]);
  assert.equal(s.doc.keys[1], keys[1]);
  assert.notEqual(s.doc.keys[2], keys[2]);
});

void test('out-of-range actions change nothing', () => {
  const s = start(plugin);
  for (const a of [{ do: 'remove', i: 99 }, { do: 'duplicate', i: -1 }, { do: 'move', from: 99, to: 0 }, { do: 'update', i: 99, block: sample('quote') }] as const) {
    assert.equal(act(s, a), s);
  }
});

void test('only something the editor can show passes as a block', () => {
  assert.equal(notABlock({ type: 'faq', label: 'Questions', items: [] }), null);
  assert.equal(notABlock({ type: 'custom', name: 'Plans', props: {} }), null);
  for (const b of [null, [], 'faq', { type: 'nope' }, { label: 'x' }, { type: 'faq', label: { a: 1 } }, { type: 'custom', name: 'lower', props: {} }, { type: 'custom', name: 'Plans', props: [] }, { type: 'custom', name: 'Plans' }]) {
    assert.notEqual(notABlock(b), null, JSON.stringify(b));
  }
});

void test('a sample route only points at stops it has (they are numbered from 0)', () => {
  const r = sample('route');
  assert.ok(r.type === 'route');
  for (const run of r.runs) for (const h of run.hops) assert.ok(r.stops[h.from] && r.stops[h.to], `${run.name}: ${h.from} → ${h.to}`);
});

