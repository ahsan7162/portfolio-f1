// node scripts/playground-check/trouble.mjs http://localhost:5174
// The editor under a misbehaving block: one that loops forever, one that navigates the canvas away,
// and page code that is not a page. The editor must stay responsive and say what happened.
import { chrome, sleep } from './cdp.mjs';
const O = process.argv[2] ?? 'http://localhost:5174';
const c = await chrome(9379);
let failed = 0;
const check = (n, ok, d = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const setValue = (sel, v) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`;
const click = text => `[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})).click()`;
try {
  const t = await c.tab(`${O}/products/playground`, { width: 1440, height: 900 });
  await sleep(3500);
  await t.evaluate(`document.querySelectorAll('.pg-start')[1].click()`);
  await sleep(2500);

  // page code that is not a page
  await t.evaluate(click('Page code'));
  await sleep(400);
  await t.evaluate(setValue('.pg-code-area', "[ { type: 'statement', label: 'Why', head: 'x', body: 'y' }, { type: 'nope' } ]"));
  await sleep(400);
  const err = await t.evaluate(`document.querySelector('.pg-code-error')?.textContent ?? ''`);
  check('page code with an unknown block is refused, with why', /Block 2/.test(err), err);
  check('the page is unchanged by bad code', (await t.evaluate(`document.querySelectorAll('.pg-layer').length`)) === 3);
  await t.evaluate(setValue('.pg-code-area', "[ { type: 'statement', label: 'Why', head: 'Edited *in code*.', body: 'y' } ]"));
  await sleep(1200);
  check('good page code applies at once', (await t.evaluate(`[...document.querySelectorAll('.pg-layer-name')].map(e => e.textContent).join('|')`)) === 'Why');
  await t.evaluate(setValue('.pg-code-area', "[ alert(document.cookie) ]"));
  await sleep(300);
  check('code is never run from the page pane', /is code, not data/.test(await t.evaluate(`document.querySelector('.pg-code-error')?.textContent ?? ''`)));

  // a block that loops forever
  await t.evaluate(click('Write a block'));
  await sleep(300);
  await t.evaluate(setValue('#pg-new-name', 'Loop'));
  await sleep(200);
  await t.evaluate(`document.querySelector('.pg-new button[type=submit]').click()`);
  await sleep(300);
  await t.evaluate(setValue('.pg-code-area', 'export function Loop() { for (;;) {} }'));
  await sleep(200);
  await t.evaluate(click('Add to the page'));
  await sleep(300);
  await t.evaluate(click('Write a block'));
  await sleep(300);
  const before = Date.now();
  await t.evaluate(click('Run'));
  let bad = '';
  for (let i = 0; i < 20 && !bad; i++) { await sleep(500); bad = await t.evaluate(`document.querySelector('.pg-layer-bad')?.title ?? ''`); }
  const took = Date.now() - before;
  let notice = '';
  check('the editor stays responsive while the block loops', took < 8000, `${took} ms`);
  check('an endless loop is stopped by its guard and shown as the block\'s error', /loop ran/.test(bad), bad.slice(0, 80));

  // a loop built at run time is guarded too: it shows as the block's error and the canvas keeps going
  await t.evaluate(setValue('.pg-code-area', "export function Loop() { new Function('for (;;) {}')(); return null; }"));
  await sleep(200);
  await t.evaluate(click('Run'));
  bad = '';
  for (let i = 0; i < 16 && !/loop ran/.test(bad); i++) { await sleep(500); bad = await t.evaluate(`document.querySelector('.pg-layer-bad')?.title ?? ''`); }
  check('a loop made with new Function is guarded as well', /loop ran/.test(bad) && !(await t.evaluate(`!!document.querySelector('.pg-canvas-stuck')`)));

  // a hang no guard sees (a regular expression that backtracks for ever): the canvas is taken down, a fresh tab offered
  await t.evaluate(setValue('.pg-code-area', "export function Loop() { /^(a|a)*$/.test('a'.repeat(64) + 'b'); return null; }"));
  await sleep(200);
  await t.evaluate(click('Run'));
  const hungAt = Date.now();
  for (let i = 0; i < 24 && !/stopped answering/.test(notice); i++) { await sleep(500); notice = await t.evaluate(`document.querySelector('.pg-notice')?.textContent ?? ''`); }
  check('a hung canvas is caught, taken down, and the way out explained', /stopped answering/.test(notice) && /close this tab/.test(await t.evaluate(`document.querySelector('.pg-canvas-stuck')?.textContent ?? ''`)), `${Date.now() - hungAt} ms`);
  await t.evaluate(setValue('.pg-code-area', 'export function Loop() { return null; }'));
  await sleep(800);
  // the way out: close the tab and open the playground again
  await t.close();
  const t2 = await c.tab(`${O}/products/playground`, { width: 1440, height: 900 });
  let drawn = false;
  for (let i = 0; i < 20 && !drawn; i++) { await sleep(500); drawn = await t2.evaluate(`!document.querySelector('.pg-canvas-wait') && document.querySelectorAll('.pg-layer').length > 0`).catch(() => false); }
  console.log(`INFO  closed and reopened, the canvas ${drawn ? 'drew again' : 'was still held by the stuck process (headless Chrome frees it unreliably)'}`);
  await t2.close();
  c.kill();
  // the leave check runs in a browser of its own, so it never meets the stuck process above
  const c2 = await chrome(9381);
  const t3 = await c2.tab(`${O}/products/playground`, { width: 1440, height: 900 });
  await sleep(3500);
  Object.assign(t, t3);
  await t.evaluate(`document.querySelectorAll('.pg-start')[1].click()`);
  await sleep(2500);
  await t.evaluate(click('Write a block'));
  await sleep(300);
  await t.evaluate(setValue('#pg-new-name', 'Leave'));
  await sleep(200);
  await t.evaluate(`document.querySelector('.pg-new button[type=submit]').click()`);
  await sleep(300);
  await t.evaluate(setValue('.pg-code-area', "import { useEffect } from 'react';\nexport function Leave() { useEffect(() => { location.href = 'https://example.com/?stolen=1'; }, []); return null; }"));
  await sleep(200);
  await t.evaluate(click('Add to the page'));
  await sleep(300);
  await t.evaluate(click('Write a block'));
  await sleep(300);
  await t.evaluate(click('Run'));
  notice = '';
  for (let i = 0; i < 16 && !/load another page/.test(notice); i++) { await sleep(500); notice = await t.evaluate(`document.querySelector('.pg-notice')?.textContent ?? ''`); }
  check('a block that leaves the canvas is caught, and written blocks stop', /load another page/.test(notice), notice.slice(0, 90));
  check('the editor itself never navigated', (await t.evaluate('location.pathname')) === '/products/playground');
  const errs = t.events.filter(e => e.method === 'Runtime.exceptionThrown' && !e.sessionId).map(e => e.params.exceptionDetails.exception?.description?.slice(0, 120));
  check('no errors in the editor', errs.length === 0, errs.join(' | '));
  await t.close();
  c2.kill();
} finally { c.kill(); }
process.exit(failed ? 1 : 0);
