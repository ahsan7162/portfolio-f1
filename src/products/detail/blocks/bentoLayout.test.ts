import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutBento, type TileKind } from './bentoLayout';

const KINDS: TileKind[] = ['number', 'text', 'media'];

/** Every mix of kinds for a count (3^n of them; n ≤ 8 keeps it under 7,000). */
function* mixes(n: number): Generator<TileKind[]> {
  for (let m = 0; m < 3 ** n; m++) yield Array.from({ length: n }, (_, i) => KINDS[Math.floor(m / 3 ** i) % 3]);
}

void test('bento: 3 to 8 tiles of any mix fill 3 and 2 columns with no holes and no overlaps', () => {
  for (const cols of [3, 2]) {
    for (let n = 3; n <= 8; n++) {
      for (const kinds of mixes(n)) {
        const places = layoutBento(kinds, cols);
        const rows = Math.max(...places.map(p => p.row + p.h));
        const seen = new Map<string, number>();
        places.forEach((p, i) => {
          assert.ok(p.col >= 0 && p.col + p.w <= cols, `${kinds.join()} @${cols}: tile ${i} inside the columns`);
          for (let y = p.row; y < p.row + p.h; y++) {
            for (let x = p.col; x < p.col + p.w; x++) {
              const k = `${y},${x}`;
              assert.ok(!seen.has(k), `${kinds.join()} @${cols}: tiles ${seen.get(k)} and ${i} overlap at ${k}`);
              seen.set(k, i);
            }
          }
        });
        assert.equal(seen.size, rows * cols, `${kinds.join()} @${cols}: no holes`);
      }
    }
  }
});
