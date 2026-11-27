import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from '../src/products/playground/literal';
import { EDITOR_CSP, FRAME_HEADERS, refuse, routeOf, SaveError, writeBlock, writePage } from './playground';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const rule = (source: string) => Object.fromEntries(vercel.headers.find(h => h.source === source)!.headers.map(h => [h.key, h.value]));

void test('Vercel sends the canvas the same lockdown headers the dev and preview servers do', () => {
  assert.deepEqual(rule('/products/playground/frame.html'), FRAME_HEADERS);
  assert.equal(rule('/products/playground(/|/index\\.html)?')['Content-Security-Policy'], EDITOR_CSP);
  assert.equal(rule('/products/playground(/|/index\\.html)?')['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.match(FRAME_HEADERS['Content-Security-Policy'], /sandbox allow-scripts$/);
  assert.match(FRAME_HEADERS['Content-Security-Policy'], /connect-src 'none'/);
});

void test('every spelling of the canvas and the editor gets their headers', () => {
  for (const u of ['/products/playground/frame.html', '/products/playground/frame', '/products/playground/frame%2Ehtml', '/products/playground/frame.html?x=1', '/products//playground/frame.html', '/products/playground/frame.html/', '/products/%70layground/frame.html']) assert.equal(routeOf(u), 'canvas', u);
  for (const u of ['/products/playground', '/products/playground/', '/products/playground/index.html', '/products/playground/index', '/products/playground?x']) assert.equal(routeOf(u), 'editor', u);
  for (const u of ['/products', '/products/playground/frame.js', '/products/playground-x', '/products/playground/%E0%A4%A']) assert.equal(routeOf(u), null, u);
});

void test('every page but the canvas still refuses to be framed', () => {
  const global = vercel.headers[0];
  const re = new RegExp(`^${global.source}$`);
  for (const path of ['/', '/products', '/products/playground', '/products/playground/', '/products/pr-dashboard', '/products/playground/frame.js']) assert.ok(re.test(path), path);
  assert.ok(!re.test('/products/playground/frame.html'));
  assert.equal(rule(global.source)['X-Frame-Options'], 'DENY');
});

const TOKEN = 'f'.repeat(64);
const req = (over: Record<string, unknown> = {}, headers: Record<string, string | undefined> = {}) => ({
  method: 'POST', socket: { remoteAddress: '::1' },
  headers: { host: 'localhost:5174', origin: 'http://localhost:5174', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', 'x-playground-token': TOKEN, ...headers },
  ...over,
}) as Parameters<typeof refuse>[0];

void test('Save answers only the playground page on this machine, with this run\'s token', () => {
  assert.equal(refuse(req(), 5174, TOKEN), null);
  assert.equal(refuse(req({}, { host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174' }), 5174, TOKEN), null);
  const refused = [
    req({ method: 'GET' }), req({ socket: { remoteAddress: '192.168.1.20' } }), req({}, { host: 'evil.example:5174', origin: 'http://evil.example:5174' }),
    req({}, { host: 'localhost:9999', origin: 'http://localhost:9999' }), req({}, { origin: 'https://evil.example' }), req({}, { origin: undefined }),
    req({}, { 'sec-fetch-site': 'cross-site' }), req({}, { 'content-type': 'text/plain' }), req({}, { 'x-playground-token': undefined }),
    req({}, { 'x-playground-token': TOKEN.slice(1) + 'e' }), req({}, { 'x-playground-token': TOKEN + 'f' }),
  ];
  for (const r of refused) assert.notEqual(refuse(r, 5174, TOKEN), null, JSON.stringify(r));
});

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'pg-save-'));
  mkdirSync(join(root, 'src/products/detail/blocks/saved'), { recursive: true });
  writeFileSync(join(root, 'src/products/data.ts'), "export const products = [{ slug: 'my-tool' }];\n");
  writeFileSync(join(root, 'src/products/detail/blocks/index.tsx'), 'const registry = {\n  text: Text,\n  stats: Stats,\n  custom: Custom,\n};\n');
  return root;
}

void test('a saved page is plain data, whatever its text says', () => {
  const root = repo();
  const evil = "'; require('child_process').execSync('rm -rf ~'); '";
  writePage(root, 'my-tool', [{ type: 'text', body: [evil, '${process.env.HOME}', '*/ alert(1) /*'] }]);
  const file = readFileSync(join(root, 'src/products/pages/my-tool.ts'), 'utf8');
  const literal = file.slice(file.indexOf('export const'));
  assert.deepEqual(parse(literal), [{ type: 'text', body: [evil, '${process.env.HOME}', '*/ alert(1) /*'] }]);
  assert.match(readFileSync(join(root, 'src/products/pages/index.ts'), 'utf8'), /'my-tool': p0,/);
});

void test('Save refuses a page for no product, an unknown block, or code in the data', () => {
  const root = repo();
  const no = (slug: unknown, blocks: unknown) => assert.throws(() => writePage(root, slug, blocks), SaveError);
  no('../../etc', []);
  no('not-there', []);
  no('my-tool', [{ type: 'script' }]);
  no('my-tool', [{ type: 'text', body: [() => 1] }]);
  no('my-tool', 'not a list');
  no('my-tool', Array.from({ length: 201 }, () => ({ type: 'text', body: [] })));
});

void test('a saved block lands only in saved/, by a component name', () => {
  const root = repo();
  const wrote = writeBlock(root, 'Pricing', "import './Pricing.css';\nexport function Pricing() { return null; }", '.cx { color: red }');
  assert.deepEqual(wrote.map(f => f.slice(root.length)), ['/src/products/detail/blocks/saved/Pricing.tsx', '/src/products/detail/blocks/saved/Pricing.css']);
  assert.match(readFileSync(join(root, 'src/products/detail/blocks/saved/index.ts'), 'utf8'), /Pricing: b0\.Pricing/);
  assert.match(readFileSync(join(root, 'src/products/detail/blocks/saved/names.ts'), 'utf8'), /savedNames: string\[\] = \['Pricing'\];/);
  for (const name of ['../Evil', 'evil', 'Evil/x', 'Evil.tsx', '', 'A'.repeat(41), 'Ünï']) assert.throws(() => writeBlock(root, name, 'x', ''), SaveError, name);
  assert.throws(() => writeBlock(root, 'Styled', 'export function Styled() {}', '.a{}'), SaveError);
  assert.deepEqual(readdirSync(join(root, 'src/products/detail/blocks/saved')).sort(), ['Pricing.css', 'Pricing.tsx', 'index.ts', 'names.ts']);
});
