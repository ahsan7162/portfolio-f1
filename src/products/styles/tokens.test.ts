// Holds the page CSS to the tokens in tokens.css: a raw value that has a token fails, and the few values
// that sit off the scales are listed here (OFF_SCALE) so the list can only shrink. Demo kits are exempt.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { OFF_SCALE } from './offScale';
import { parseTokens } from './tokenList';

const dir = new URL('./', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, dir), 'utf8');
/** The page's own stylesheets. The demo kits draw other products' interfaces in those products' values. */
export const PAGE_CSS = ['base.css', 'shell.css', 'home.css', 'detail.css', 'blocks-visual.css', 'blocks-content.css', 'frames.css', 'stage.css', 'hero-car.css', 'playground.css', 'system.css'];

/** Every token in tokens.css, name to value. */
export function tokens(css = read('tokens.css')) {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

/** The words of a value at its top level (outside any parentheses): what a token can stand for. */
function words(value: string) {
  const out: string[] = [];
  let cur = '', depth = 0;
  for (const ch of value) {
    if (depth === 0 && /[\s,/]/.test(ch)) { if (cur) out.push(cur); cur = ''; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const FAMILIES: [string, RegExp, RegExp, string][] = [
  // family, the properties, the raw words it covers, the prefix of its tokens
  ['radius', /^border(-[a-z]+)*-radius$/, /^\d*\.?\d+(px|rem)$|^50%$/, '--r-'],
  ['font-size', /^font-size$/, /^\d*\.?\d+(px|rem)$/, '--fs-'],
  ['weight', /^font-weight$/, /^\d+$/, '--w-'],
  ['line-height', /^line-height$/, /^\d*\.?\d+$/, '--lh-'],
  ['tracking', /^letter-spacing$/, /^-?\d*\.?\d+em$/, '--tr-'],
  // stacking inside a component (1 to 6) is local; anything above is a page layer
  ['layer', /^z-index$/, /^([7-9]|\d{2,})$/, '--z-'],
  // 0s (no delay, no duration) is not a step
  ['duration', /^(transition|animation)(-[a-z]+)?$/, /^(?!0s$)\d*\.?\d+m?s$/, '--t-'],
  ['space', /^((row-|column-)?gap|padding(-[a-z]+)*|margin(-[a-z]+)*|inset(-[a-z]+)*|top|left|right|bottom)$/, /^\d*\.?\d+px$/, '--sp-'],
];


/** Every raw word in the page CSS that a family covers, as `file: property: word`. */
function rawWords() {
  const found: { family: string; prefix: string; word: string; where: string }[] = [];
  for (const file of PAGE_CSS) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/(?<=[{;\s])([a-z][a-z-]*)\s*:\s*([^;{}]+)/g)) {
      const [, prop, value] = m;
      for (const [family, props, raw, prefix] of FAMILIES) {
        if (!props.test(prop)) continue;
        for (const w of words(value.replace(/\s*!important$/, ''))) if (raw.test(w)) found.push({ family, prefix, word: w, where: `${file}: ${prop}: ${value.trim()}` });
      }
    }
  }
  return found;
}

void test('the reader finds every token in tokens.css, each in a section', () => {
  const css = read('tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const all = [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
  const found = parseTokens(read('tokens.css'));
  assert.deepEqual(found.map(t => t.name), all);
  assert.ok(found.every(t => t.section), 'every token sits under a ---- section ---- heading');
});

void test('every token in tokens.css is defined once', () => {
  const css = read('tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
});

void test('the page CSS uses a token wherever one exists', () => {
  const all = [...tokens()];
  const tokenFor = (prefix: string, word: string) => all.find(([name, value]) => name.startsWith(prefix) && value === word)?.[0];
  const stray = rawWords().filter(r => tokenFor(r.prefix, r.word)).map(r => `${r.where}  (use var(${tokenFor(r.prefix, r.word)}))`);
  assert.deepEqual(stray, []);
});

void test('values off the scales are only the known ones', () => {
  const all = [...tokens()];
  const unknown = rawWords().filter(r => !all.some(([name, value]) => name.startsWith(r.prefix) && value === r.word) && !OFF_SCALE[r.family].includes(r.word)).map(r => `${r.where}  (${r.family}: ${r.word} is on no scale)`);
  assert.deepEqual(unknown, []);
});

void test('no colour is written outside tokens.css in the page CSS, except drawings that declare their own palette', () => {
  // A drawing (the car, the OpenUI demo's box) declares its palette once, as custom properties on its root; a mask is alpha only.
  const hex = PAGE_CSS.flatMap(f => [...read(f).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?<=[{;\s])([a-z][a-z-]*)\s*:\s*[^;{}]*#[0-9a-fA-F]{3,8}\b/g)]
    .filter(m => !/^mask(-image)?$/.test(m[1])).map(m => `${f}: ${m[0].trim()}`));
  assert.deepEqual(hex, []);
});
