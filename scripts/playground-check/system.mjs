// The system page's live blocks: scroll it all so each mounts, then count what drew, what failed, and any errors.
// Every block on /products/system draws, live, with no errors: node scripts/playground-check/system.mjs http://localhost:5174
// MOTION=1 runs it with motion on (the entrances play as the page is scrolled).
import { chrome, sleep } from './cdp.mjs';
const motion = process.env.MOTION === '1';
const c = await chrome(9397, motion ? [] : ['--force-prefers-reduced-motion']);
try {
  const t = await c.tab(`${process.argv[2] ?? 'http://localhost:5174'}/products/system`, { width: 1440, height: 900 });
  await sleep(4000);
  await t.evaluate(`(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); let last = 0;
    for (let pass = 0; pass < 3; pass++) { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await wait(120); }
      const h = document.documentElement.scrollHeight; if (h === last) break; last = h; } scrollTo(0, 0); await wait(800); })()`);
  const out = await t.evaluate(`(() => {
    const lives = [...document.querySelectorAll('.sy-live')];
    return { total: lives.length,
      drawn: lives.filter(l => l.querySelector('.dt-blocks > *')).length,
      failed: lives.filter(l => /could not draw/.test(l.textContent)).map(l => l.id + ': ' + l.querySelector('.dt-blocks')?.textContent.slice(0, 160)),
      empty: lives.filter(l => { const b = l.querySelector('.dt-blocks'); return b && b.getBoundingClientRect().height < 60; }).map(l => l.id),
      height: document.documentElement.scrollHeight };
  })()`);
  console.log(JSON.stringify(out, null, 1));
  const errs = t.events.filter(e => e.method === 'Runtime.exceptionThrown' && !e.sessionId).map(e => e.params.exceptionDetails.exception?.description?.split('\n')[0]?.slice(0, 160));
  const cons = t.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error' && !e.sessionId).map(e => JSON.stringify(e.params.args.map(a => a.value ?? a.description)).slice(0, 200));
  console.log('exceptions:', errs.length, errs.slice(0, 6), '\nconsole errors:', cons.length, cons.slice(0, 6));
  const ok = out.total > 0 && out.drawn === out.total && !out.failed.length && !out.empty.length && !errs.length && !cons.length;
  console.log(ok ? 'PASS  every block drew, with no errors' : 'FAIL');
  process.exitCode = ok ? 0 : 1;
} finally { c.kill(); }
