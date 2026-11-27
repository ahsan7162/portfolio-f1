// The system page's block frame: every block draws in it with no errors, a scroll over the frame moves exactly one
// block, and at the last block the scroll goes on to the page.   node scripts/playground-check/system.mjs http://localhost:5174
// MOTION=1 runs it with motion on.
import { chrome, sleep } from './cdp.mjs';
const O = process.argv[2] ?? 'http://localhost:5174';
const motion = process.env.MOTION === '1';
const c = await chrome(9397, motion ? [] : ['--force-prefers-reduced-motion']);
let failed = 0;
const check = (n, ok, d = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
try {
  const t = await c.tab(`${O}/products/system`, { width: 1440, height: 900 });
  await sleep(4000);
  await t.evaluate(`document.getElementById('blocks').scrollIntoView()`);
  await sleep(1500);
  const stage = `document.querySelector('.sy-bf-stage')`;
  const state = () => t.evaluate(`[${stage}.dataset.type, ${stage}.dataset.status]`);
  const waitDrawn = async () => { for (let i = 0; i < 40; i++) { const [, s] = await state(); if (s !== 'drawing') return s; await sleep(150); } return 'timeout'; };
  check('the frame draws the first block', (await waitDrawn()) === 'drawn', (await state()).join(' '));

  // a wheel gesture over the frame: one block on
  const box = await t.evaluate(`(() => { const r = ${stage}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const wheel = async dy => { for (let i = 0; i < 6; i++) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: dy }); await sleep(16); } await sleep(400); };
  const y0 = await t.evaluate('scrollY');
  await wheel(60);
  const [afterOne] = await state();
  check('one scroll over the frame moves one block, and the page stays', afterOne === 'statement' && (await t.evaluate('scrollY')) === y0, `${afterOne}, page moved ${Math.round((await t.evaluate('scrollY')) - y0)}px`);
  await wheel(-60);
  check('scrolling back returns', (await state())[0] === 'stage');

  // the block page reloads (a dev hot reload, say): the frame tells it the current block again
  await t.evaluate(`document.querySelector('.sy-bf-stage iframe').contentWindow.location.reload()`);
  await sleep(3000);
  check('after the block page reloads, it draws the block again', await t.evaluate(`!!document.querySelector('.sy-bf-stage iframe').contentDocument.querySelector('.sy-view-blocks .dt-block')`));

  // every block, picked from the list
  const types = await t.evaluate(`[...document.querySelectorAll('.sy-bf-list button')].map(b => b.dataset.at)`);
  const bad = [];
  for (const i of types) {
    await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="${i}"]').click()`);
    await sleep(120);
    const s = await waitDrawn();
    if (s !== 'drawn') bad.push(`${(await state())[0]}: ${s}`);
  }
  check(`all ${types.length} blocks draw in the frame`, bad.length === 0, bad.join(', '));

  // at the last block, the scroll goes on to the page
  const y1 = await t.evaluate('scrollY');
  await wheel(80);
  check('past the last block, the page scrolls on', (await t.evaluate('scrollY')) > y1);

  const errs = t.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description?.split('\n')[0]?.slice(0, 160));
  const cons = t.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error').map(e => JSON.stringify(e.params.args.map(a => a.value ?? a.description)).slice(0, 200));
  check('no errors, in the page or the frame', !errs.length && !cons.length, [...errs, ...cons].slice(0, 4).join(' | '));
} finally { c.kill(); }
process.exit(failed ? 1 : 0);
