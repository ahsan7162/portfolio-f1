// Every block in one frame. A list of all of them on the left; on the right, a frame that shows one at a time, drawn
// by its real component at desktop width and scaled to fit. Scrolling over the frame steps to the next or the previous
// block (one gesture, one block) once the whole frame is on screen; scrolling in, the page stops there. Before that,
// and past the first or the last block, the scroll goes on to the page. Arrow keys and the
// Previous and Next buttons step too, and a pick in the list jumps.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HOME } from '../router';
import { targetY, wheelToY } from '../scroll';
import { GROUPS, CATALOG, sampleSource, type Entry } from '../playground/catalog';
import { Glyph } from '../playground/Glyph';
import type { FrameMsg } from './BlockView';

/** Every block, in the order the list shows them. */
export const ORDER: Entry[] = GROUPS.flatMap(g => CATALOG.filter(e => e.group === g));
/** The screen the blocks are drawn on inside the frame: a laptop, or on a narrow screen a phone, so each block lays out as a product's page lays it out there. */
const LAPTOP = { w: 1440, h: 900 };
const PHONE = { w: 390, h: 780 };

export function BlockFrame({ brand, brands }: { brand: string; brands: { name: string; hex: string }[] }) {
  const [at, setAt] = useState(0);
  const [tint, setTint] = useState(brand);
  const [n, setN] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [status, setStatus] = useState<'drawing' | 'drawn' | 'failed'>('drawing');
  // counts the block page's loads: each one, a reload included, is told the current block afresh
  const [ready, setReady] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const atRef = useRef(at);
  useLayoutEffect(() => { atRef.current = at; }, [at]);
  const entry = ORDER[at];
  const { from } = sampleSource(entry.type);

  /** Which way the last step went: the block page moves the next block in from that side. */
  const dirRef = useRef<-1 | 0 | 1>(0);
  const go = useCallback((i: number) => { const j = Math.max(0, Math.min(ORDER.length - 1, i)); if (j !== atRef.current) { dirRef.current = j > atRef.current ? 1 : -1; setStatus('drawing'); setAt(j); } }, []);

  // keep the list's current item in view inside the list (a column, or a row on a phone), without moving the page
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-at="${at}"]`);
    const l = list.current;
    if (!el || !l) return;
    const across = l.scrollWidth > l.clientWidth;
    const r = el.getBoundingClientRect(), lr = l.getBoundingClientRect();
    l.scrollBy(across ? { left: r.left - lr.left - lr.width / 2 + r.width / 2, behavior: 'smooth' } : { top: r.top - lr.top - lr.height / 2 + r.height / 2, behavior: 'smooth' });
  }, [at]);

  // the frame's size, for the scale
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // what the block page says: its height, and whether the block drew
  useEffect(() => {
    const onMessage = (e: MessageEvent<FrameMsg>) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data;
      if (m?.t === 'ready') setReady(r => r + 1);
      if (m?.t === 'drawn' && m.type === ORDER[atRef.current]?.type) setStatus(m.error ? 'failed' : 'drawn');
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, []);

  // tell the block page what to draw
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage({ t: 'show', type: entry.type, brand: tint, n, dir: dirRef.current } satisfies FrameMsg, location.origin);
    dirRef.current = 0; // a colour or a replay is not a step
  }, [ready, entry.type, tint, n]);

  // One push over the frame steps one block, while the whole frame is on screen and it has blocks left that way.
  // Otherwise the frame moves the page itself: a wheel inside the block page never reaches the page's smooth scroller.
  // A push is told from momentum as the featured section on /products tells it (Featured.tsx): momentum arrives without
  // a pause and only ever shrinks; a hand starts after a pause, or grows, or holds steady. So a trackpad's long tail
  // never steps a block, and a new push steps one at once, without waiting for the tail to die out.
  // shortcut: the detector is copied from Featured.tsx, not shared, because Featured's own test (steptest.mjs) is not in the repo; share it when that test is.
  const wheel = useRef({ lastAt: 0, lastSize: 0, hand: 0, movedAt: 0, carried: false });
  const onWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) return; // a pinch zooms
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    const dir = Math.sign(dy);
    const r = stage.current?.getBoundingClientRect();
    if (!dir || !r) return;
    e.preventDefault();
    const w = wheel.current;
    // this page's clock: a wheel inside the block page carries that page's own timeStamp
    const now = performance.now();
    const size = Math.abs(dy);
    if (now - w.lastAt > 110) { w.hand = 2; w.carried = false; }
    else if (size > w.lastSize * 1.15 + 1) w.hand += 2;
    // after a step, only a growing push counts: a tail's last deltas hold steady (1, 1, 1 ...) and must not step again
    else if (size >= w.lastSize && !w.carried) w.hand += 1;
    else w.hand = Math.max(0, w.hand - 1);
    w.lastAt = now; w.lastSize = size;
    const i = atRef.current;
    // on screen means below the page's sticky bar, too
    const bar = document.querySelector<HTMLElement>('[data-sticky]')?.offsetHeight ?? 0;
    const whole = r.top >= bar - 4 && r.bottom <= innerHeight + 4;
    // a push still going after its step has to keep going a good while longer before it counts again
    const push = w.hand >= 2 && now - w.movedAt > (w.carried ? 600 : 120);
    if (!whole) {
      // coming in, the page stops with the whole frame on screen, and the push that brought it there steps no block
      const coming = dir > 0 ? r.top > bar && r.bottom > innerHeight : r.bottom < innerHeight && r.top < bar;
      const dock = scrollY + (dir > 0 ? r.bottom - innerHeight : r.top - bar);
      const y = targetY() + dy;
      wheelToY(coming ? (dir > 0 ? Math.min(y, dock) : Math.max(y, dock)) : y);
      w.movedAt = now; w.carried = true;
      return;
    }
    const to = i + dir;
    // past the first or the last block a new push hands the wheel back to the page; the tail of the one that got there does not
    if (to < 0 || to >= ORDER.length) { if (push) wheelToY(targetY() + dy); return; }
    if (push) { w.carried = true; w.movedAt = now; w.hand = 0; go(to); }
  }, [go]);
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(atRef.current + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(atRef.current - 1); }
  }, [go]);

  // the wheel lands inside the block page (it is the iframe's document), so the frame listens there too
  const attach = () => {
    const win = frame.current?.contentWindow;
    win?.addEventListener('wheel', onWheel, { passive: false });
    win?.addEventListener('keydown', onKey);
    // so does the pointer: the page's cursor dot (Cursor.tsx) follows it in, instead of stopping at the frame's edge
    win?.addEventListener('pointermove', e => {
      const f = frame.current;
      if (!f) return;
      const r = f.getBoundingClientRect(), k = r.width / Math.max(1, f.offsetWidth); // the frame's scale
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + e.clientX * k, clientY: r.top + e.clientY * k, pointerType: e.pointerType }));
    }, { passive: true });
  };
  useEffect(() => {
    const el = stage.current;
    el?.addEventListener('wheel', onWheel, { passive: false });
    return () => el?.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const page = box.w && box.w < 700 ? PHONE : LAPTOP;
  const scale = box.w ? Math.min(box.w / page.w, box.h / page.h, 1) : 0.5;
  const touch = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

  return (
    <div className="sy-bf">
      <nav className="sy-bf-list" aria-label="Blocks">
        {/* data-lenis-prevent: the smooth scroller would take the wheel, and the list could not scroll on its own */}
        <ol ref={list} data-lenis-prevent>
          {GROUPS.map(g => (
            <li key={g}>
              <p className="pp-mono sy-dim">{g}</p>
              <ol>
                {ORDER.map((e, i) => e.group === g && (
                  <li key={e.type}>
                    <button type="button" data-at={i} aria-current={i === at ? 'true' : undefined} onClick={() => go(i)}>
                      <Glyph rects={e.glyph} className="pg-glyph sy-glyph sy-glyph--sm" />
                      <span>{e.name}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </nav>

      <div className="sy-bf-main">
        <header className="sy-bf-head">
          <div>
            {/* the hint lives up here, not on the frame, where it would cover the block's own bottom edge */}
            <p className="pp-mono sy-dim">{String(at + 1).padStart(2, '0')} / {ORDER.length} · {entry.group}<span aria-hidden="true"> · {at === ORDER.length - 1 ? 'the last block' : touch ? '↓ for the next block' : 'scroll for the next block'}</span></p>
            <h3 className="sy-bf-name">{entry.name} <code>{entry.type}</code></h3>
            <p className="sy-bf-use">{entry.use}. <span className="sy-dim">{from ? `Shown on ${from.name}, with its own data and colour: this block draws that product.` : 'Demo content, on Acme Notes, a product that does not exist.'}</span></p>
          </div>
          <div className="sy-bf-acts">
            {!from && (
              <div className="sy-brand-pick sy-bf-tints" role="radiogroup" aria-label="The demo product's colour">
                {brands.map(b => <button key={b.hex} type="button" role="radio" aria-checked={tint === b.hex} aria-label={`${b.name}, ${b.hex}`} title={b.name} onClick={() => setTint(b.hex)} style={{ background: b.hex }} />)}
              </div>
            )}
            <button type="button" className="pp-btn pp-btn--ghost" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous block">↑</button>
            <button type="button" className="pp-btn pp-btn--ghost" onClick={() => go(at + 1)} disabled={at === ORDER.length - 1} aria-label="Next block">↓</button>
            <button type="button" className="pp-btn pp-btn--ghost" onClick={() => setN(x => x + 1)}>Replay</button>
            <a className="pp-btn pp-btn--ghost" href={`${HOME}/playground`}>Try it</a>
          </div>
        </header>
        {/* data-lenis-prevent-wheel: the wheel over the frame is the frame's (see onWheel), not the smooth scroller's */}
        <div className="sy-bf-stage" ref={stage} data-type={entry.type} data-status={status} data-lenis-prevent-wheel style={{ aspectRatio: `${page.w} / ${page.h}` }}>
          <div className="sy-bf-page" style={{ width: page.w * scale, height: page.h * scale }}>
            {/* oxlint-disable-next-line react/iframe-missing-sandbox -- the site's own page, trusted, same origin on purpose: the frame listens for the wheel inside it */}
            <iframe
              ref={frame} title={`${entry.name}, drawn live. Scroll over it, or use the arrow keys inside it, for the next block.`}
              src={`${HOME}/system?view=block`} onLoad={attach}
              style={{ width: page.w, height: page.h, transform: `scale(${scale})` }} data-status={status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
