// The system page's block frame: every block draws in it with no errors, a scroll over the frame moves exactly one
// block once the frame is all on screen (not while it is half below the fold), and at the last block the scroll goes on.   node scripts/playground-check/system.mjs http://localhost:5174
// MOTION=1 runs it with motion on.
import { chrome, sleep } from './cdp.mjs';
const O = process.argv[2] ?? 'http://localhost:5174';
const motion = process.env.MOTION === '1';
const c = await chrome(9397, motion ? [] : ['--force-prefers-reduced-motion']);
let failed = 0;
/** What in the block page is still Acme's orange: a warm, saturated colour drawn anywhere, or one of Acme's pictures. */
const ORANGE = `(() => {
  const d = document.querySelector('.sy-bf-stage iframe').contentDocument, root = d.querySelector('.sy-view-blocks');
  if (!root) return ['no block'];
  const warm = v => (v.match(/rgba?\\([^)]+\\)/g) || []).some(c => {
    const [r, g, b, a = 1] = c.match(/[\\d.]+/g).map(Number);
    if (a < 0.15) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn, l = (mx + mn) / 510;
    if (!dd) return false;
    const sat = l > 0.5 ? dd / (510 - mx - mn) : dd / (mx + mn);
    const h = mx === r ? ((g - b) / dd + 6) % 6 * 60 : mx === g ? ((b - r) / dd + 2) * 60 : ((r - g) / dd + 4) * 60;
    return sat > 0.45 && l > 0.25 && l < 0.85 && (h < 32 || h > 348);
  });
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = d.defaultView.getComputedStyle(el, pseudo);
      if (cs.display === 'none' || cs.visibility === 'hidden' || (pseudo && (cs.content === 'none' || cs.content === 'normal'))) continue;
      for (const p of ['color', 'background-color', 'border-top-color', 'border-left-color', 'fill', 'stroke', 'box-shadow', 'background-image', 'outline-color'])
        if (warm(cs.getPropertyValue(p))) out.push(el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).split(' ')[0] + (pseudo || '') + ' ' + p);
      if (/acme-notes\\/(?!poster)/.test(cs.backgroundImage)) out.push('background picture ' + cs.backgroundImage.slice(0, 80));
    }
  }
  for (const m of root.querySelectorAll('img')) if (/acme-notes\\/(?!poster)/.test(m.currentSrc || m.src)) out.push('picture ' + (m.currentSrc || m.src).split('/').pop());
  return [...new Set(out)];
})()`;
const check = (n, ok, d = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
try {
  const t = await c.tab(`${O}/products/system`, { width: 1440, height: 900 });
  await sleep(4000);
  // the whole frame on screen (a frame half below the fold lets the page scroll: checked below)
  await t.evaluate(`document.querySelector('.sy-bf-stage').scrollIntoView({ block: 'center' })`);
  await sleep(1500);
  const stage = `document.querySelector('.sy-bf-stage')`;
  const state = () => t.evaluate(`[${stage}.dataset.type, ${stage}.dataset.status]`);
  const waitDrawn = async () => { for (let i = 0; i < 40; i++) { const [, s] = await state(); if (s !== 'drawing') return s; await sleep(150); } return 'timeout'; };
  check('the frame draws the first block', (await waitDrawn()) === 'drawn', (await state()).join(' '));

  // the cursor dot follows the pointer onto the frame (its moves land in the block page), not stopping at the edge
  const mid = await t.evaluate(`(() => { const r = ${stage}.getBoundingClientRect(); return { x: Math.round(r.x + r.width * 0.6), y: Math.round(r.y + r.height * 0.6) }; })()`);
  for (const [dx, dy] of [[-300, -300], [-150, -150], [0, 0]]) { await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mid.x + dx, y: mid.y + dy }); await sleep(60); }
  await sleep(500);
  const dot = await t.evaluate(`(() => { const c = document.querySelector('.pp-cursor'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), on: 'on' in c.dataset }; })()`);
  check('the cursor dot follows the pointer onto the frame', !!dot && dot.on && Math.abs(dot.x - mid.x) <= 3 && Math.abs(dot.y - mid.y) <= 3, dot ? `dot at ${dot.x},${dot.y}, pointer at ${mid.x},${mid.y}` : 'no dot');

  // the block list scrolls on its own under the wheel, down and back to its top, and the page stays
  const ol = `document.querySelector('.sy-bf-list > ol')`;
  const lp = await t.evaluate(`(() => { const r = ${ol}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const ly = await t.evaluate('scrollY');
  for (const dy of [80, -80]) {
    for (let i = 0; i < (dy > 0 ? 6 : 14); i++) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: lp.x, y: lp.y, deltaX: 0, deltaY: dy }); await sleep(16); }
    await sleep(700);
    if (dy > 0) check('the block list scrolls on its own under the wheel', (await t.evaluate(`${ol}.scrollTop`)) > 0 && (await t.evaluate('scrollY')) === ly, `list at ${await t.evaluate(`${ol}.scrollTop`)}, page moved ${Math.round((await t.evaluate('scrollY')) - ly)}px`);
    else check('...and back to its top, and the page stays', (await t.evaluate(`${ol}.scrollTop`)) === 0 && (await t.evaluate('scrollY')) === ly, `list at ${await t.evaluate(`${ol}.scrollTop`)}, page moved ${Math.round((await t.evaluate('scrollY')) - ly)}px`);
  }

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

  // arriving by scrolling down: while the frame is half below the fold the page scrolls and no block steps; once it is
  // all on screen, a new gesture steps one block
  await t.evaluate(`scrollTo(0, scrollY + ${stage}.getBoundingClientRect().top - innerHeight * 0.6)`);
  await sleep(800);
  const near = () => t.evaluate(`(() => { const r = ${stage}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: Math.max(100, Math.min(innerHeight - 40, r.y + 60)), top: r.top, bottom: r.bottom }; })()`);
  const wheelAt = async (p, dy, n = 6) => { for (let i = 0; i < n; i++) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: dy }); await sleep(16); } await sleep(400); };
  const y2 = await t.evaluate('scrollY');
  await wheelAt(await near(), 60, 3);
  check('half on screen, a scroll over the frame moves the page, not the block', (await t.evaluate('scrollY')) > y2 && (await state())[0] === 'stage', `${Math.round((await t.evaluate('scrollY')) - y2)}px, ${(await state())[0]}`);
  // a long gesture on: the page stops with the whole frame on screen, still on the first block
  await wheelAt(await near(), 60, 12);
  await sleep(1200);
  const docked = await near(), ih = await t.evaluate('innerHeight');
  check('scrolling in, the page stops with the whole frame on screen', docked.top >= 0 && Math.abs(docked.bottom - ih) <= 6 && (await state())[0] === 'stage', `bottom ${Math.round(docked.bottom)} of ${ih}, ${(await state())[0]}`);
  const y3 = await t.evaluate('scrollY');
  await wheelAt(await near(), 60);
  check('all on screen, the next gesture steps one block and the page stays', (await state())[0] === 'statement' && (await t.evaluate('scrollY')) === y3, `${(await state())[0]}, page moved ${Math.round((await t.evaluate('scrollY')) - y3)}px`);
  await wheelAt(await near(), -60);

  // a trackpad flick: a push, its momentum fading out for most of a second, and a second flick before that tail has
  // died. The tail steps nothing; the second flick steps one more.
  const flick = [12, 30, 60, 90, 80, 64, 50, 40, 32, 25, 20, 16, 13, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  await sleep(600);
  const from = (await state())[0], fp = await near();
  for (const d of [...flick, ...flick]) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: fp.x, y: fp.y, deltaX: 0, deltaY: d }); await sleep(16); }
  await sleep(800);
  check('two flicks, the second in the first one\'s tail, step two blocks', from === 'stage' && (await state())[0] === 'text', `${from} to ${(await state())[0]}`);
  await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="0"]').click()`);
  await sleep(800);

  // every block, picked from the list. The demo product in blue: no block keeps Acme's orange (a colour drawn warm,
  // or one of Acme's pictures, the film's poster aside, which is footage)
  const swatch = n => t.evaluate(`document.querySelectorAll('.sy-bf-tints button')[${n}]?.click()`);
  await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="0"]').click()`);
  await sleep(600);
  const blue = await t.evaluate(`[...document.querySelectorAll('.sy-bf-tints button')].findIndex(b => b.style.background.replaceAll(' ', '') === 'rgb(47,129,247)')`);
  await swatch(blue);
  await sleep(1200);
  const types = await t.evaluate(`[...document.querySelectorAll('.sy-bf-list button')].map(b => b.dataset.at)`);
  const bad = [], kept = [];
  for (const i of types) {
    await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="${i}"]').click()`);
    await sleep(120);
    const s = await waitDrawn();
    if (s !== 'drawn') bad.push(`${(await state())[0]}: ${s}`);
    if (!(await t.evaluate(`!!document.querySelector('.sy-bf-tints')`))) continue; // a real product's block, in its own colour
    await sleep(900);
    const left = await t.evaluate(ORANGE);
    if (left.length) kept.push(`${(await state())[0]}: ${left.slice(0, 2).join(' | ')}`);
  }
  check(`all ${types.length} blocks draw in the frame`, bad.length === 0, bad.join(', '));
  check('in another colour, no demo block keeps Acme\'s orange', blue >= 0 && kept.length === 0, blue < 0 ? 'no blue swatch' : kept.slice(0, 4).join('; '));
  // and a colour picked while a block shows recolours it at once
  await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="0"]').click()`);
  await waitDrawn();
  await swatch(0); await sleep(900); await swatch(blue); await sleep(900);
  const live = await t.evaluate(ORANGE);
  check('a colour picked on a showing block recolours it at once', live.length === 0, live.slice(0, 2).join(' | '));
  await swatch(0);

  // the screens gallery: nothing pins in the frame (a pin could not move there), so it is drawn whole, at full size,
  // and a sideways swipe over its row scrolls the row, not to another block
  const at = await t.evaluate(`[...document.querySelectorAll('.sy-bf-list button')].find(b => b.textContent.trim() === 'Screens').dataset.at`);
  await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="${at}"]').click()`);
  await waitDrawn();
  await sleep(1500);
  const inner = `document.querySelector('.sy-bf-stage iframe').contentDocument`;
  const gal = await t.evaluate(`(() => { const f = document.querySelector('.sy-bf-stage iframe'), d = f.contentDocument, g = d.querySelector('.dt-gal'), w = d.querySelector('.sy-view-blocks'); if (!g) return null; const fr = f.getBoundingClientRect(), k = fr.width / f.offsetWidth, r = g.getBoundingClientRect(); return { x: fr.left + (r.left + r.width / 2) * k, y: fr.top + (r.top + r.height / 2) * k, pinned: !!d.querySelector('.pin-spacer'), scaled: /scale/.test(w.style.transform) }; })()`);
  check('nothing pins in the frame, and the screens gallery is drawn at full size', !!gal && !gal.pinned && !gal.scaled, gal ? `pinned ${gal.pinned}, scaled ${gal.scaled}` : 'no gallery');
  if (gal) {
    // screen-sized steps: the row snaps to each screen, and headless Chrome snaps after every synthetic wheel event
    for (let i = 0; i < 2; i++) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: gal.x, y: gal.y, deltaX: 700, deltaY: 4 }); await sleep(30); }
    await sleep(700);
    const left = await t.evaluate(`${inner}.querySelector('.dt-gal').scrollLeft`);
    check('a sideways swipe over the screens row scrolls it, and the frame stays on it', left > 0 && (await state())[0] === 'screens', `row at ${left}px, on ${(await state())[0]}`);
  }

  await t.evaluate(`document.querySelector('.sy-bf-list button[data-at="${types.at(-1)}"]').click()`);
  await waitDrawn();
  await sleep(600);

  // at the last block, the scroll goes on to the page
  const y1 = await t.evaluate('scrollY');
  await wheel(80);
  check('past the last block, the page scrolls on', (await t.evaluate('scrollY')) > y1);

  const errs = t.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description?.split('\n')[0]?.slice(0, 160));
  const cons = t.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error').map(e => JSON.stringify(e.params.args.map(a => a.value ?? a.description)).slice(0, 200));
  check('no errors, in the page or the frame', !errs.length && !cons.length, [...errs, ...cons].slice(0, 4).join(' | '));
} finally { c.kill(); }
process.exit(failed ? 1 : 0);
