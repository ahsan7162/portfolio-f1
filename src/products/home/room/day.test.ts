import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTS, buildLoop, initialState, nextMark } from './day';

void test('the room loop ends where it starts, so the seam does not show', () => {
  const S = initialState(), start = { ...S };
  const loop = buildLoop(S);
  loop.tl.totalTime(loop.length - 0.001);
  for (const k of ['x', 'y', 'rot', 'face', 'walk', 'phone', 'blanket', 'cx', 'cy', 'cpose', 'cface', 'day', 'mon', 'tv', 'zoom'] as const) {
    assert.ok(Math.abs(S[k] - start[k]) < 0.05, `${k}: ${S[k]} at the end, ${start[k]} at the start`);
  }
  assert.ok(Math.abs(S.moon - start.moon) < 0.01);
});

void test('each part of the day can be skipped to on all four days, always forward', () => {
  const loop = buildLoop(initialState());
  for (const { id } of ACTS) {
    assert.equal(loop.marks.filter(m => m[1] === id).length, 4, id);
    for (const now of [0, 50, loop.length - 1, loop.length * 3 + 10]) {
      const at = nextMark(loop, id, now);
      assert.ok(at > now && at <= now + loop.length, `${id} from ${now}: ${at}`);
    }
  }
});
