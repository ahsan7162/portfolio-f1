import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../data';
import { isLiteral, LiteralError, parse, print, type Literal } from './literal';

void test('every real page reads back exactly as it was written', () => {
  for (const p of products) {
    const blocks = JSON.parse(JSON.stringify(p.blocks));
    assert.ok(isLiteral(blocks), `${p.slug}: blocks are plain data`);
    assert.deepEqual(parse(print(blocks)), blocks, p.slug);
  }
});

void test('every real page can be written as it is in data.ts, optional fields left undefined and all', () => {
  for (const p of products) assert.doesNotThrow(() => print(p.blocks as unknown as Literal), p.slug);
  assert.equal(print({ a: 1, b: undefined } as unknown as Literal), '{ a: 1 }');
});

void test('reads what data.ts writes: bare keys, single quotes, trailing commas, comments, a declaration around it', () => {
  const src = `export const blocks: Block[] = [
    // the opening
    { type: 'statement', label: 'Why', head: 'It\\'s *fast*.', body: "two\\nlines", },
    /* a gap */ { type: 'stats', stats: [{ value: '3', unit: 'x', label: \`faster\` }] },
  ];`;
  assert.deepEqual(parse(src), [
    { type: 'statement', label: 'Why', head: "It's *fast*.", body: 'two\nlines' },
    { type: 'stats', stats: [{ value: '3', unit: 'x', label: 'faster' }] },
  ]);
  assert.deepEqual(parse('blocks: [1, -2.5, 1e3, true, false, null]'), [1, -2.5, 1000, true, false, null]);
  assert.deepEqual(parse("{ 'a-b': '\\u{1F600}\\x41' }"), { 'a-b': '😀A' });
});

void test('refuses anything that is code, so nothing typed can run', () => {
  const refuse = (src: string, word: RegExp) => assert.throws(() => parse(src), (e: unknown) => e instanceof LiteralError && word.test(e.message), src);
  refuse('[alert(1)]', /"alert" is code/);
  refuse('{ a: window.location }', /"window.location" is code/);
  refuse('[() => 1]', /Unexpected/);
  refuse('[`${fetch("/")}`]', /cannot hold \$\{/);
  refuse('{ __proto__: { polluted: true } }', /cannot be used/);
  refuse('{ "constructor": 1 }', /cannot be used/);
  refuse('{ a: 1, a: 2 }', /set twice/);
  refuse('[1] ; alert(1)', /after the value/);
  refuse('[new Date()]', /"new" is code/);
  refuse('[NaN]', /"NaN" is code/);
  refuse('[1e999]', /out of range/);
  refuse('[' .repeat(70) + ']'.repeat(70), /too deeply/);
  refuse('"open', /not closed/);
  refuse('/* open', /not closed/);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

void test('says where the problem is', () => {
  try {
    parse('[\n  { type: "a" },\n  { type: oops },\n]');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof LiteralError);
    assert.equal(e.line, 3);
    assert.equal(e.col, 11);
  }
});

void test('writes strings that cannot break out of their quotes or their line', () => {
  const tricky = "it's \\ a \n line \u2028 sep \u0007 bell </script>";
  const out = print([tricky]);
  assert.ok(!out.includes('\n') && !out.includes('\u2028') && !out.includes('\u0007'));
  assert.deepEqual(parse(out), [tricky]);
  assert.ok(!isLiteral([() => 1]) && !isLiteral([undefined]) && !isLiteral([NaN]) && !isLiteral([new Date()]));
});

void test('a long run of spaces after a declaration is read quickly', () => {
  const started = performance.now();
  assert.throws(() => parse(`const a:${' '.repeat(200_000)}`));
  assert.ok(performance.now() - started < 200, `${Math.round(performance.now() - started)} ms`);
});

