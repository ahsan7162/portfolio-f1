import assert from 'node:assert/strict';
import test from 'node:test';
import { tokens } from './CodeEditor';

void test('the highlighter keeps every character and still marks keys', () => {
  const src = "const a = { label: 'Why', n: 3 }; // done";
  const toks = tokens(src, 'ts');
  assert.equal(toks.map(t => t[1]).join(''), src);
  assert.ok(toks.some(t => t[0] === 'p' && t[1] === 'label'));
  assert.ok(tokens('.a { color: var(--ink); }', 'css').some(t => t[0] === 'p' && t[1] === 'color'));
});

void test('a pasted wall of text is highlighted in linear time, so the editor never freezes', () => {
  for (const lang of ['ts', 'css'] as const) {
    const started = performance.now();
    tokens('a'.repeat(200_000), lang);
    tokens(`${'-'.repeat(100_000)} x`, lang);
    assert.ok(performance.now() - started < 400, `${lang}: ${Math.round(performance.now() - started)} ms`);
  }
});
