// The livery promise: whatever five colours a visitor picks (or a stored value holds),
// derive() paints only readable text.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast, toLch } from './colour';
import { derive, LIVERIES, type Seeds } from './liveries';

// A fixed-seed generator, so a failure names the same colours every run.
let seed = 4;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const hex = () => `#${Math.floor(rand() * 0x1000000).toString(16).padStart(6, '0')}`;
const randomSeeds = (): Seeds => ({ ground: hex(), fg: hex(), ac: hex(), ac2: hex(), letter: hex() });

const cases = [...LIVERIES.map(l => l.seeds), ...Array.from({ length: 300 }, randomSeeds)];

void test('every derived livery keeps its text readable', () => {
  for (const s of cases) {
    const c = derive(s).css, at = JSON.stringify(s);
    const pairs: Array<[string, string, number]> = [
      ['--fg', '--raise', 10], ['--ac', '--carbon', 4.5], ['--ac2', '--raise', 4.5], ['--letter', '--carbon', 4.5],
      ['--mute', '--raise', 4.5], ['--dim', '--panel', 4.5], ['--frame-4', '--fg', 4.5],
    ];
    for (const [a, b, min] of pairs) assert.ok(contrast(c[a], c[b]) >= min, `${a} on ${b} is ${contrast(c[a], c[b]).toFixed(2)}:1 for ${at}`);
    const g = toLch(c['--carbon']);
    // Within the ground's band, give or take one step of hex rounding.
    assert.ok(g.l >= 0.1 - 5e-3 && g.l <= 0.26 + 5e-3, `ground lightness ${g.l.toFixed(3)} for ${at}`);
  }
});
