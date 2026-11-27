// Tries to make the dev server's Save write something it must not. Every attempt must be refused, and nothing is written.
//   node scripts/playground-check/save.mjs 5174      (with `npm run dev` running)
import http from 'node:http';

const port = Number(process.argv[2] ?? 5174);
const page = await new Promise((ok, no) => http.get({ port, path: '/products/playground' }, r => { let b = ''; r.on('data', c => (b += c)); r.on('end', () => ok(b)); }).on('error', no));
const token = /name="playground-save" content="([a-f0-9]+)"/.exec(page)?.[1];
if (!token) { console.log('FAIL  no token on the playground page'); process.exit(1); }

const post = (headers, body, host = 'localhost') => new Promise(ok => {
  headers = Object.fromEntries(Object.entries(headers).filter(([, v]) => v !== undefined));
  const req = http.request({ host, port, path: '/__playground/save', method: headers['x-method'] ?? 'POST', headers }, r => { let b = ''; r.on('data', c => (b += c)); r.on('end', () => ok({ status: r.statusCode, body: b })); });
  req.on('error', e => ok({ status: 0, body: e.message }));
  req.end(body);
});
const good = { host: `localhost:${port}`, origin: `http://localhost:${port}`, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', 'x-playground-token': token };
const block = (name, code = `export function ${name}() { return null; }`) => JSON.stringify({ kind: 'block', name, code, css: '' });

let failed = 0;
const expect = async (name, headers, body, want) => {
  const r = await post(headers, body);
  const ok = want === 'refused' ? r.status >= 400 : r.status === 200;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${r.status} ${r.body.slice(0, 110)}`);
};

await expect('no token', { ...good, 'x-playground-token': '' }, block('Probe'), 'refused');
await expect('wrong token', { ...good, 'x-playground-token': 'a'.repeat(64) }, block('Probe'), 'refused');
await expect('another site (Origin)', { ...good, origin: 'https://evil.example' }, block('Probe'), 'refused');
await expect('no Origin', { ...good, origin: undefined }, block('Probe'), 'refused');
await expect('cross-site fetch metadata', { ...good, 'sec-fetch-site': 'cross-site' }, block('Probe'), 'refused');
await expect('rebound DNS name (Host)', { ...good, host: `evil.example:${port}`, origin: `http://evil.example:${port}` }, block('Probe'), 'refused');
await expect('form-encoded body', { ...good, 'content-type': 'application/x-www-form-urlencoded' }, block('Probe'), 'refused');
await expect('a GET', { ...good, 'x-method': 'GET' }, undefined, 'refused');
await expect('a name that climbs out', good, block('../../../../tmp/Evil'), 'refused');
await expect('a lower-case name', good, block('evil'), 'refused');
await expect('a page for a product that does not exist', good, JSON.stringify({ kind: 'page', slug: 'nope', blocks: [] }), 'refused');
await expect('a page slug that climbs out', good, JSON.stringify({ kind: 'page', slug: '../data', blocks: [] }), 'refused');
await expect('a page with an unknown block type', good, JSON.stringify({ kind: 'page', slug: 'markwright', blocks: [{ type: 'script' }] }), 'refused');
await expect('a page smuggling a prototype key', good, '{"kind":"page","slug":"markwright","blocks":[{"type":"text","body":[],"__proto__":{"x":1}}]}', 'refused');
await expect('CSS without its import', good, JSON.stringify({ kind: 'block', name: 'Probe', code: 'export function Probe() { return null; }', css: '.a{}' }), 'refused');
await expect('a body far too large', good, JSON.stringify({ kind: 'block', name: 'Big', code: 'x'.repeat(500_000), css: '' }), 'refused');
await expect('not JSON', good, '{', 'refused');
process.exit(failed ? 1 : 0);
