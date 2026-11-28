// Proves the playground's layout controls work with real input: the side panes hide and come back (buttons and keys)
// and are remembered, the splitters resize by dragging across the canvas and by keys, the canvas goes full screen and
// back, sections fold away and are remembered, and the smaller controls (deselect, search, remove with undo, the save
// question, tabs, shortcuts) behave.
//   node scripts/playground-check/layout.mjs http://localhost:5174
import { chrome, sleep } from './cdp.mjs';

const ORIGIN = process.argv[2] ?? 'http://localhost:5174';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const c = await chrome(9366);
try {
  const t = await c.tab(`${ORIGIN}/products/playground`, { width: 1440, height: 900 });
  const ev = (x) => t.evaluate(x);
  const box = async sel => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r && r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height } : null; })()`);
  const mouse = (type, x, y, extra = {}) => t.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
  const click = async sel => {
    // a real click lands only where the thing is on screen: bring it there first, as a visitor would scroll to it
    await ev(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({ block: 'nearest' })`);
    const b = await box(sel);
    if (!b) throw new Error(`nothing to click: ${sel}`);
    await mouse('mousePressed', b.x, b.y); await mouse('mouseReleased', b.x, b.y); await sleep(250);
  };
  // modifiers: 1 Alt, 2 Ctrl, 4 Meta, 8 Shift
  const key = async (k, code, modifiers = 0) => {
    // the browser's own handling (a modal dialog's Esc) goes by the key code
    const vk = { '[': 219, ']': 221, Escape: 27, Enter: 13, Delete: 46, Backspace: 8, Tab: 9, Home: 36, End: 35, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, '/': 191, '?': 191 }[k] ?? k.toUpperCase().charCodeAt(0);
    for (const type of ['rawKeyDown', 'keyUp']) await t.send('Input.dispatchKeyEvent', { type, key: k, code, modifiers, windowsVirtualKeyCode: vk });
    await sleep(250);
  };
  const shown = sel => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); return !!el && el.getBoundingClientRect().width > 0; })()`);
  const canvasWidth = () => ev(`document.querySelector('.pg-canvas-in')?.getBoundingClientRect().width ?? 0`);
  const drawn = async () => { for (let i = 0; i < 30; i++) { if (await ev(`!document.querySelector('.pg-canvas-wait') && !!document.querySelector('.pg-frame')`)) return true; await sleep(300); } return false; };

  await sleep(2000);
  await ev(`localStorage.removeItem('pg-layout'); document.querySelectorAll('.pg-start')[0].click()`);
  check('the canvas draws the page', await drawn());

  // ---- the side panes ----
  const w0 = await canvasWidth();
  check('both panes start open', (await shown('.pg-left')) && (await shown('.pg-right')));
  await click('.pg-left .pg-pane-x');
  const w1 = await canvasWidth();
  check('the blocks pane hides from its own button, and the canvas widens', !(await shown('.pg-left')) && w1 > w0, `${Math.round(w0)} → ${Math.round(w1)}`);
  check('its button in the top bar takes the focus and says it is off', await ev(`document.activeElement?.getAttribute('aria-controls') === 'pg-left' && document.activeElement.getAttribute('aria-pressed') === 'false'`));
  await key('[', 'BracketLeft');
  check('[ shows it again', await shown('.pg-left'));
  await key(']', 'BracketRight');
  check('] hides the edit pane', !(await shown('.pg-right')));
  await ev(`location.reload()`);
  await sleep(2500);
  check('the layout is remembered after a reload', (await shown('.pg-left')) && !(await shown('.pg-right')) && (await drawn()));
  await click('.pg-bar [aria-controls="pg-right"]');
  check('the top bar brings the edit pane back', await shown('.pg-right'));
  await key('[', 'BracketLeft');
  await key('/', 'Slash');
  check('/ opens the closed blocks pane and focuses the search', (await shown('.pg-left')) && (await ev(`document.activeElement === document.querySelector('.pg-search input')`)));
  await ev(`document.activeElement.blur()`);

  // ---- resizing ----
  const frameScale = () => ev(`Number(/scale\\(([\\d.]+)\\)/.exec(document.querySelector('.pg-frame').style.transform)?.[1] ?? 0)`);
  const width = sel => ev(`document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().width`);
  const drag = async (sel, dx, dy = 0) => {
    const b = await box(sel);
    await mouse('mousePressed', b.x, b.y);
    for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', b.x + (dx * i) / 12, b.y + (dy * i) / 12); await sleep(16); }
    await sleep(60);
    await mouse('mouseReleased', b.x + dx, b.y + dy);
    await sleep(300);
  };
  const s0 = await frameScale(), l0 = await width('.pg-left');
  await drag('.pg-split[aria-controls="pg-left"]', 120);
  const l1 = await width('.pg-left');
  check('the blocks pane widens when its handle is dragged across the canvas', Math.abs(l1 - l0 - 120) <= 2, `${Math.round(l0)} → ${Math.round(l1)}`);
  check('the canvas is drawn smaller to fit', (await frameScale()) < s0, `${s0} → ${await frameScale()}`);
  check('nothing is left covering the page after the drag', !(await ev(`!!document.querySelector('.pg-shield')`)));
  const r0 = await width('.pg-right');
  await drag('.pg-split[aria-controls="pg-right"]', -100);
  const r1 = await width('.pg-right');
  check('the edit pane widens when its handle is dragged left', Math.abs(r1 - r0 - 100) <= 2, `${Math.round(r0)} → ${Math.round(r1)}`);
  await ev(`document.querySelector('.pg-split[aria-controls="pg-right"]').focus()`);
  await key('ArrowLeft', 'ArrowLeft');
  check('an arrow key moves a focused handle', Math.abs((await width('.pg-right')) - r1 - 16) <= 1);
  await drag('.pg-split[aria-controls="pg-right"]', -2000);
  check('the canvas keeps its room however far a pane is dragged', (await canvasWidth()) >= 360, `${Math.round(await canvasWidth())} px`);
  const sb = await box('.pg-split[aria-controls="pg-right"]');
  await mouse('mousePressed', sb.x, sb.y, { clickCount: 1 }); await mouse('mouseReleased', sb.x, sb.y, { clickCount: 1 });
  await mouse('mousePressed', sb.x, sb.y, { clickCount: 2 }); await mouse('mouseReleased', sb.x, sb.y, { clickCount: 2 });
  await sleep(300);
  check('a double click puts the edit pane back to its width', Math.round(await width('.pg-right')) === 420, `${Math.round(await width('.pg-right'))}`);
  const h0 = await ev(`document.querySelector('.pg-layers').getBoundingClientRect().height`);
  await drag('.pg-split--y', 0, 120);
  const h1 = await ev(`document.querySelector('.pg-layers').getBoundingClientRect().height`);
  check('the page\'s blocks take more of the left pane when its handle is dragged down', Math.abs(h1 - h0 - 120) <= 3, `${Math.round(h0)} → ${Math.round(h1)}`);
  await ev(`location.reload()`);
  await sleep(2500);
  check('the widths are remembered after a reload', Math.abs((await width('.pg-left')) - l1) <= 1 && (await drawn()));
  await ev(`localStorage.removeItem('pg-layout'); location.reload()`);
  await sleep(2500);
  await drawn();

  // ---- the canvas's bar and full screen ----
  const pct = () => ev(`document.querySelector('.pg-scale').textContent`);
  check('the canvas says how large it draws the page', (await pct()) === `${Math.round((await frameScale()) * 100)}%`, await pct());
  await click('.pg-canvas-bar [role=radio]:nth-child(3)');
  check('a phone width draws the page at full size', (await pct()) === '100%' && (await ev(`document.querySelector('.pg-frame').getBoundingClientRect().width`)) === 390);
  await click('.pg-canvas-bar [role=radio]:nth-child(1)');
  const before = await frameScale();
  await click('.pg-canvas-bar [aria-label="Full screen"]');
  await sleep(400);
  const fs = await ev(`({ el: document.fullscreenElement?.tagName ?? null, w: document.querySelector('.pg-main').getBoundingClientRect().width, pressed: document.querySelector('.pg-canvas-bar [aria-label="Full screen"]').getAttribute('aria-pressed') })`);
  check('full screen fills the screen with the canvas', fs.w === 1440 && fs.pressed === 'true', `${fs.el ?? 'window only'}, ${fs.w} px`);
  check('and draws the page larger', (await frameScale()) > before, `${before} → ${await frameScale()}`);
  await click('.pg-canvas-bar [aria-label="Full screen"]');
  check('its button leaves it', (await ev(`!document.fullscreenElement && !document.querySelector('.pg[data-full]')`)) && Math.abs((await frameScale()) - before) < 0.001);
  await key('f', 'KeyF');
  check('F goes full screen', await ev(`!!document.querySelector('.pg[data-full]')`));
  await key('Escape', 'Escape');
  await sleep(300);
  check('Esc leaves it', await ev(`!document.fullscreenElement && !document.querySelector('.pg[data-full]')`));

  // ---- picking and letting go ----
  const tabName = () => ev(`document.querySelector('#pg-tab-block').textContent`);
  await ev(`document.querySelectorAll('.pg-layer-btn')[9].click()`);
  await sleep(300);
  check('a picked block low in the list is scrolled into view', await ev(`(() => { const l = document.querySelector('.pg-layer-list').getBoundingClientRect(), b = document.querySelector('.pg-layer-btn[aria-current]').getBoundingClientRect(); return b.top >= l.top - 1 && b.bottom <= l.bottom + 1; })()`));
  await ev(`document.activeElement.blur()`);
  await key('Escape', 'Escape');
  check('Esc lets go of the picked block and shows the page settings', (await tabName()) === 'Page settings' && !(await ev(`!!document.querySelector('.pg-layer-btn[aria-current]')`)));
  await ev(`document.querySelectorAll('.pg-layer-btn')[1].click()`);
  await sleep(200);
  await click('.pg-back');
  check('so does the Page settings button', (await tabName()) === 'Page settings');

  // ---- finding a block ----
  const count = () => ev(`document.querySelectorAll('.pg-layer').length`);
  await key('/', 'Slash');
  await t.send('Input.insertText', { text: 'faq' });
  await sleep(250);
  check('the search narrows the blocks', (await ev(`document.querySelectorAll('.pg-palette .pg-entry').length`)) === 1);
  const n0 = await count();
  await key('Enter', 'Enter');
  check('Enter adds the first block found', (await count()) === n0 + 1);
  await key('Escape', 'Escape');
  check('Esc clears the search and keeps the focus there', (await ev(`document.querySelector('.pg-search input').value`)) === '' && (await ev(`document.activeElement === document.querySelector('.pg-search input')`)));
  await t.send('Input.insertText', { text: 'zzzz' });
  await sleep(250);
  check('a search with no match says so', /No block matches/.test(await ev(`document.querySelector('.pg-none')?.textContent ?? ''`)));
  await click('.pg-search .pg-x');
  check('the clear button empties it', (await ev(`document.querySelector('.pg-search input').value`)) === '');
  await key('Escape', 'Escape');
  check('Esc in an empty search leaves it', await ev(`document.activeElement !== document.querySelector('.pg-search input')`));
  await key('z', 'KeyZ', 4);

  // ---- removing a block ----
  const names = () => ev(`[...document.querySelectorAll('.pg-layer-name')].map(e => e.textContent).join('|')`);
  const names0 = await names();
  await ev(`document.querySelectorAll('.pg-layer-btn')[2].focus()`);
  await key('Delete', 'Delete');
  const toast = await ev(`document.querySelector('.pg-notice--toast')?.textContent ?? ''`);
  check('removing a block says which, with Undo', /^Removed .+\.Undo$/.test(toast), toast);
  await click('.pg-notice--toast .pg-pill');
  check('Undo puts it back and the notice goes', (await names()) === names0 && !(await ev(`!!document.querySelector('.pg-notice')`)));
  await ev(`document.querySelectorAll('.pg-layer-btn')[2].focus()`);
  await key('Delete', 'Delete');
  await ev(`document.querySelectorAll('.pg-layer-btn')[0].focus()`);
  await key('ArrowDown', 'ArrowDown', 1);
  check('once something else changes, Undo is no longer offered there', !(await ev(`!!document.querySelector('.pg-notice--toast .pg-pill')`)));
  await key('z', 'KeyZ', 4); await key('z', 'KeyZ', 4);
  check('and ⌘Z still walks back both', (await names()) === names0);

  // ---- deleting a written block ----
  const button = text => `[...document.querySelectorAll('.pg-right button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`;
  await ev(`document.querySelector('#pg-tab-write').click()`);
  await sleep(200);
  await ev(`(() => { const el = document.querySelector('#pg-new-name'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Plans'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(150);
  await ev(`document.querySelector('.pg-new button[type=submit]').click()`);
  await sleep(250);
  const tabs = () => ev(`document.querySelectorAll('.pg-written [role=tab]').length`);
  await ev(`${button('Delete')}.click()`);
  await sleep(200);
  check('Delete on a written block asks first, with the focus on keeping it', (await ev(`!!document.querySelector('.pg-sure')`)) && (await ev(`document.activeElement?.textContent === 'Keep it'`)) && (await tabs()) === 1);
  await ev(`document.activeElement.click()`);
  await sleep(200);
  check('Keep it keeps it', !(await ev(`!!document.querySelector('.pg-sure')`)) && (await tabs()) === 1);
  await ev(`${button('Delete')}.click()`);
  await sleep(200);
  await ev(`${button('Delete Plans')}.click()`);
  await sleep(200);
  check('the second answer deletes it', (await tabs()) === 0);

  // ---- the dialogs ----
  const backdrop = async () => { await mouse('mousePressed', 40, 450); await mouse('mouseReleased', 40, 450); await sleep(300); };
  await click('.pg-bar .pg-pill');
  check('the start dialog opens from the top bar', await ev(`document.querySelector('.pg-dialog').open`));
  await mouse('mousePressed', 720, 120); await mouse('mouseReleased', 720, 120); await sleep(200);
  check('a click inside it leaves it open', await ev(`document.querySelector('.pg-dialog').open`));
  await backdrop();
  check('a click outside it closes it', !(await ev(`document.querySelector('.pg-dialog').open`)));
  if (await ev(`!!document.querySelector('meta[name="playground-save"]')`)) {
    await click('.pg-bar .pg-pill');
    await ev(`document.querySelectorAll('.pg-start')[8].click()`);
    await sleep(800);
    const save = `[...document.querySelectorAll('.pg-bar button')].find(b => b.textContent === 'Save page')`;
    await ev(`${save}.click()`);
    await sleep(250);
    check('the save question is a modal dialog, with the focus on Cancel', await ev(`document.querySelector('.pg-confirm').open && document.activeElement?.textContent === 'Cancel' && document.querySelector('.pg-confirm').matches(':modal')`));
    await key('Escape', 'Escape');
    check('Esc cancels it', !(await ev(`document.querySelector('.pg-confirm').open || !!document.querySelector('.pg-confirm-in')`)));
    await ev(`${save}.click()`);
    await sleep(250);
    await backdrop();
    check('so does a click outside it', !(await ev(`document.querySelector('.pg-confirm').open`)));
    check('and nothing was sent to Save', !t.events.some(e => e.method === 'Network.requestWillBeSent' && e.params.request.url.includes('/__playground/save')));
  }

  // ---- tabs and choices by keyboard ----
  await ev(`document.querySelector('#pg-tab-block').focus()`);
  await key('ArrowRight', 'ArrowRight');
  check('an arrow key moves to the next tab and opens it', await ev(`document.activeElement?.id === 'pg-tab-page' && document.activeElement.getAttribute('aria-selected') === 'true' && !!document.querySelector('#pg-panel-page')`));
  await key('End', 'End');
  check('End goes to the last tab', await ev(`document.activeElement?.id === 'pg-tab-write'`));
  await key('ArrowRight', 'ArrowRight');
  check('and the arrows wrap round', await ev(`document.activeElement?.id === 'pg-tab-block'`));
  check('only the chosen tab is in the Tab order', await ev(`[...document.querySelectorAll('[role=tablist][aria-label=Edit] [role=tab]')].map(b => b.tabIndex).join() === '0,-1,-1'`));
  await ev(`document.querySelector('.pg-canvas-bar [role=radio][aria-checked=true]').focus()`);
  await key('ArrowRight', 'ArrowRight');
  check('the canvas widths move with the arrows too', await ev(`document.querySelector('.pg-canvas-bar [role=radio][aria-checked=true]').textContent === '900'`));
  await key('Home', 'Home');
  await ev(`document.activeElement.blur()`);

  // ---- the shortcuts ----
  await key('?', 'Slash', 8);
  check('? lists the shortcuts', await ev(`document.querySelector('.pg-keys').open && document.querySelectorAll('.pg-keys-list div').length >= 15`));
  await key('Escape', 'Escape');
  check('Esc closes the list', !(await ev(`document.querySelector('.pg-keys').open`)));
  await click('.pg-keys-btn');
  check('so does its button in the top bar open it', await ev(`document.querySelector('.pg-keys').open`));
  await key('Escape', 'Escape');

  // ---- folding sections away ----
  const hidden = sel => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); return !!el && el.getBoundingClientRect().height === 0; })()`);
  const paletteH = () => ev(`document.querySelector('.pg-palette').getBoundingClientRect().height`);
  const p0 = await paletteH();
  await click('[aria-controls="pg-layer-list"]');
  check('the page\'s blocks fold away, and every block gets the room', (await hidden('#pg-layer-list')) && (await paletteH()) > p0 + 100 && (await hidden('.pg-split--y')), `${Math.round(p0)} → ${Math.round(await paletteH())}`);
  await click('[aria-controls="pg-group-tell-it"]');
  check('a group of blocks folds from its heading', (await hidden('#pg-group-tell-it')) && (await ev(`document.querySelector('[aria-controls="pg-group-tell-it"]').getAttribute('aria-expanded')`)) === 'false');
  await ev(`location.reload()`);
  await sleep(2500);
  check('what is folded is remembered after a reload', (await hidden('#pg-layer-list')) && (await hidden('#pg-group-tell-it')) && !(await hidden('#pg-group-open-with')));
  await click('.pg-fold-all');
  check('one button folds every group', await ev(`[...document.querySelectorAll('.pg-palette .pg-group-list > div')].every(d => d.hidden)`));
  await key('/', 'Slash');
  await t.send('Input.insertText', { text: 'stat' });
  await sleep(250);
  check('a search shows what it finds, folded or not', await ev(`[...document.querySelectorAll('.pg-palette .pg-entry')].some(b => b.getBoundingClientRect().height > 0)`));
  await key('Escape', 'Escape'); await key('Escape', 'Escape');
  check('and the groups fold again once it is cleared', await ev(`[...document.querySelectorAll('.pg-palette .pg-group-list > div')].every(d => d.hidden)`));
  await click('.pg-fold-all');
  await click('[aria-controls="pg-layer-list"]');
  check('the same button opens every group again', await ev(`[...document.querySelectorAll('.pg-palette .pg-group-list > div')].every(d => !d.hidden)`) && !(await hidden('#pg-layer-list')));
  // the first block on the page with a list among its fields
  await ev(`new Promise(ok => { const all = [...document.querySelectorAll('.pg-layer-btn')]; const next = i => { if (i >= all.length) return ok(false); all[i].click(); setTimeout(() => (document.querySelector('.pg-right fieldset.pg-list') ? ok(true) : next(i + 1)), 120); }; next(0); })`);
  await sleep(200);
  await click('[aria-controls="pg-block-code"]');
  check('a block\'s code folds away', await hidden('#pg-block-code'));
  await click('.pg-right fieldset.pg-list .pg-fold');
  check('so does a list in its fields, keeping its count', (await ev(`document.querySelector('.pg-right fieldset.pg-list .pg-group-body').hidden`)) && /\d/.test(await ev(`document.querySelector('.pg-right fieldset.pg-list .pg-count').textContent`)));
  await click('[aria-controls="pg-block-fields"]');
  check('and the fields as a whole', await hidden('#pg-block-fields'));
  await click('[aria-controls="pg-block-fields"]'); await click('[aria-controls="pg-block-code"]');
  await ev(`document.querySelector('#pg-tab-write').click()`);
  await sleep(200);
  check('with nothing written, the new-block form always shows', !(await ev(`!!document.querySelector('[aria-controls="pg-new-block"]')`)) && !(await hidden('#pg-new-name')));
  await ev(`(() => { const el = document.querySelector('#pg-new-name'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Fold'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(150);
  await ev(`document.querySelector('.pg-new button[type=submit]').click()`);
  await sleep(250);
  const codeH0 = await ev(`document.querySelector('.pg-write > .pg-code').getBoundingClientRect().height`);
  await click('[aria-controls="pg-new-block"]');
  const codeH1 = await ev(`document.querySelector('.pg-write > .pg-code').getBoundingClientRect().height`);
  check('once a block is written, the form folds away and the code takes its room', (await hidden('#pg-new-block')) && codeH1 > codeH0, `${Math.round(codeH0)} → ${Math.round(codeH1)} px`);
  await click('[aria-controls="pg-new-block"]');

  const errors = t.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'));
  check('the editor logs no errors', errors.length === 0, errors.map(e => e.params.exceptionDetails?.exception?.description ?? e.params.entry?.text).join(' | ').slice(0, 300));
  await t.close();
} finally {
  c.kill();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
