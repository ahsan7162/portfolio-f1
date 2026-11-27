import assert from 'node:assert/strict';
import test from 'node:test';
import { guardLoops, makeGuard } from './loopGuard';

const g = (js: string) => guardLoops(js, '__g');

void test('every while and three-part for gets the guard in its condition', () => {
  assert.equal(g('while (x) y();'), 'while (__g() && (x)) y();');
  assert.equal(g('for (let i = 0; i < n; i++) {}'), 'for (let i = 0; __g() && ( i < n); i++) {}');
  assert.equal(g('for (;;) {}'), 'for (; __g() && (true);) {}');
  assert.equal(g('do { a(); } while (b(c));'), 'do { a(); } while (__g() && (b(c)));');
  assert.equal(g('while (a) { while (b) {} }'), 'while (__g() && (a)) { while (__g() && (b)) {} }');
});

void test('loops over a collection, and loop words in strings, comments and regexes, are left alone', () => {
  for (const js of ['for (const x of xs) {}', 'for (const k in o) {}', '"while (true)"', '`for (;;) ${a}`', '// while (1)', '/* for(;;) */', 'x = /while\\(/g;', 'a.while(1)', 'const forever = 1;']) {
    assert.equal(g(js), js, js);
  }
});

void test('guarded code still runs, and an endless loop throws', () => {
  const guard = makeGuard();
  // oxlint-disable-next-line typescript/no-implied-eval -- running the guarded code is the test
  const run = (js: string) => new Function('__g', g(js))(guard) as unknown;
  assert.equal(run('let s = 0; for (let i = 0; i < 10; i++) s += i; return s;'), 45);
  assert.equal(run('let n = 0; while (n < 5) n++; return n;'), 5);
  let t = 0;
  const fake = makeGuard(() => (t += 1));
  // oxlint-disable-next-line typescript/no-implied-eval -- as above
  assert.throws(() => new Function('__g', g('for (;;) {}'))(fake), /stopped/);
});
