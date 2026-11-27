import assert from 'node:assert/strict';
import test from 'node:test';
import { readFromFrame, readToFrame } from './protocol';

void test('the editor keeps only the known messages from the canvas, rebuilt fresh', () => {
  assert.deepEqual(readFromFrame({ t: 'pick', i: 2, extra: 'x' }, 3), { t: 'pick', i: 2 });
  assert.deepEqual(readFromFrame({ t: 'layout', tops: [0, 400], heights: [400, 300], view: 900 }, 2), { t: 'layout', tops: [0, 400], heights: [400, 300], view: 900 });
  assert.deepEqual(readFromFrame({ t: 'built', name: 'Pricing', error: null }, 0), { t: 'built', name: 'Pricing', error: null });
  const long = readFromFrame({ t: 'fault', i: 0, message: 'x'.repeat(10_000) }, 1);
  assert.equal(long?.t === 'fault' && long.message.length, 2000);
});

void test('the editor drops anything a hostile canvas could send to confuse it', () => {
  const bad: unknown[] = [
    null, 'pick', [], { t: 'save' }, { t: 'eval', code: '1' }, { t: 'pick', i: 3 }, { t: 'pick', i: -1 }, { t: 'pick', i: 1.5 },
    { t: 'pick', i: '0' }, { t: 'layout', tops: [0], heights: [1, 2], view: 1 }, { t: 'layout', tops: [NaN], heights: [1], view: 1 },
    { t: 'layout', tops: [0], heights: [-1], view: 1 }, { t: 'layout', tops: Array(500).fill(0), heights: Array(500).fill(0), view: 1 },
    { t: 'built', name: '../../evil', error: null }, { t: 'built', name: 'lower', error: null }, { t: 'built', name: 'Ok', error: 5 },
    { t: 'fault', i: 0, message: { toString: () => 'x' } }, JSON.parse('{"t":"pick","__proto__":{"i":1}}'),
  ];
  for (const b of bad) assert.equal(readFromFrame(b, 3), null, JSON.stringify(b));
});

void test('the canvas checks what it is asked to draw and compile', () => {
  const product = { blocks: [{ type: 'marquee', words: ['a'] }] };
  assert.ok(readToFrame({ t: 'render', product, keys: ['k'], selected: 0 }));
  assert.equal(readToFrame({ t: 'render', product, keys: [], selected: 0 }), null);
  assert.ok(readToFrame({ t: 'code', sources: [{ name: 'Pricing', code: 'export function Pricing() {}', css: '' }] }));
  assert.equal(readToFrame({ t: 'code', sources: [{ name: 'pricing', code: '', css: '' }] }), null);
  assert.equal(readToFrame({ t: 'code', sources: [{ name: 'Big', code: 'x'.repeat(200_001), css: '' }] }), null);
  assert.equal(readToFrame({ t: 'nudge', by: Infinity }), null);
});
