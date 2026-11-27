// The canvas: the sandboxed frame that draws the page, at the chosen width, scaled to fit. Everything the frame
// says is checked by readFromFrame(); a frame that stops answering, or that loads a page of its own, is replaced.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Product } from '../../types';
import { readFromFrame, type Source, type ToFrame } from '../protocol';

export interface CanvasApi {
  /** Where a block dropped at this point would go (0 to the block count), or null when the point is off the canvas. */
  indexAt(x: number, y: number): number | null;
  /** Scroll the canvas while a drag is near its top or bottom edge. */
  edge(y: number): void;
  scrollTo(i: number): void;
}

type Props = {
  product: Product; keys: string[]; selected: number; width: number;
  /** The blocks being written, and whether to run them (set by Run, cleared if a block misbehaves). */
  sources: Source[]; armed: boolean;
  dropAt: number | null;
  onPick: (i: number) => void;
  onBuilt: (name: string, error: string | null) => void;
  onFault: (i: number, message: string) => void;
  onTrouble: (why: 'stuck' | 'left') => void;
};

const FRAME = '/products/playground/frame.html';
/** Messages a frame may send in a second before the rest are dropped: a block spamming the editor slows nothing. */
const RATE = 240;
type Layout = { tops: number[]; heights: number[] };

export const Canvas = forwardRef<CanvasApi, Props>(function Canvas(p, ref) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [mount, setMount] = useState(0);
  /** The canvas is stuck in a loop: it is taken down and stays down until the playground reloads. */
  const [stuck, setStuck] = useState(false);
  /** The canvas never said it was ready: some embedded browsers refuse sandboxed frames outright. */
  const [late, setLate] = useState(false);
  const [layout, setLayout] = useState<Layout>({ tops: [], heights: [] });
  const tick = useRef(0);
  const loads = useRef(0);
  // the newest props, for the message listener that is set up once
  const latest = useRef(p);
  useLayoutEffect(() => { latest.current = p; });

  const scale = size.w ? Math.min(1, size.w / p.width) : 1;
  const send = useCallback((m: ToFrame) => frame.current?.contentWindow?.postMessage(m, '*'), []);
  // A new frame starts only once the old one is gone: a frame stuck in a loop holds its browser process, and a new
  // frame of the same site started at once would join that process and hang with it.
  const replace = useCallback(() => {
    setReady(false); loads.current = 0; setMount(-1);
    setTimeout(() => { tick.current = performance.now(); setMount(m => (m < 0 ? Date.now() : m)); }, 900);
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // what the frame says
  useEffect(() => {
    let count = 0, since = performance.now();
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const now = performance.now();
      if (now - since > 1000) { since = now; count = 0; }
      if (++count > RATE) return;
      const msg = readFromFrame(e.data, latest.current.product.blocks.length);
      if (!msg) return;
      tick.current = now;
      if (msg.t === 'ready') setReady(true);
      else if (msg.t === 'leaving') { latest.current.onTrouble('left'); replace(); }
      else if (msg.t === 'layout') setLayout({ tops: msg.tops, heights: msg.heights });
      else if (msg.t === 'pick') latest.current.onPick(msg.i);
      else if (msg.t === 'built') latest.current.onBuilt(msg.name, msg.error);
      else if (msg.t === 'fault') latest.current.onFault(msg.i, msg.message);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [replace]);

  // the page, whenever it changes, once the frame is listening; and the written blocks, when armed
  const { product, keys, selected, armed, sources } = p;
  useEffect(() => { if (ready) send({ t: 'render', product, keys, selected }); }, [ready, product, keys, selected, send]);
  useEffect(() => { if (ready) send({ t: 'code', sources: armed ? sources : [] }); }, [ready, armed, sources, send]);

  // a frame stuck in a loop stops ticking: it is taken down, and the playground offers a fresh start
  useEffect(() => {
    const t = setInterval(() => {
      // A new frame cannot help here: it would join the stuck one's browser process and hang with it.
      if (ready && performance.now() - tick.current > 4500) { latest.current.onTrouble('stuck'); setReady(false); setMount(-1); setStuck(true); }
    }, 1000);
    return () => clearInterval(t);
  }, [ready]);

  useEffect(() => {
    if (ready || stuck || mount < 0) return;
    const t = setTimeout(() => setLate(true), 6000);
    return () => { clearTimeout(t); setLate(false); };
  }, [ready, stuck, mount]);

  // a dev rebuild of the canvas reloads it on purpose
  useEffect(() => {
    if (!import.meta.hot) return;
    import.meta.hot.on('playground:canvas', replace);
    return () => import.meta.hot?.off('playground:canvas', replace);
  }, [replace]);

  useImperativeHandle(ref, () => ({
    indexAt(x, y) {
      const r = box.current?.getBoundingClientRect();
      if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
      const fy = (y - r.top) / scale;
      const i = layout.tops.findIndex((top, k) => fy < top + layout.heights[k] / 2);
      return i < 0 ? layout.tops.length : i;
    },
    edge(y) {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const by = y < r.top + 70 ? -24 : y > r.bottom - 70 ? 24 : 0;
      if (by) send({ t: 'nudge', by: by / scale });
    },
    scrollTo(i) { send({ t: 'scroll', i }); },
  }), [scale, layout, send]);

  // the drop line: between two blocks, in the frame's coordinates, scaled
  const { tops, heights } = layout;
  const lineY = p.dropAt === null ? null
    : p.dropAt < tops.length ? tops[p.dropAt] * scale
      : tops.length ? (tops.at(-1)! + heights.at(-1)!) * scale : 0;

  return (
    <div className="pg-canvas" ref={box}>
      <div className="pg-canvas-in" style={{ width: p.width * scale, height: size.h }}>
        {mount >= 0 && <iframe
          key={mount}
          ref={frame}
          className="pg-frame"
          title="The page, drawn in a sandbox"
          src={FRAME}
          sandbox="allow-scripts"
          allow=""
          referrerPolicy="no-referrer"
          style={{ width: p.width, height: size.h / scale, transform: `scale(${scale})` }}
          onLoad={() => {
            loads.current++;
            // a second load means something in the frame navigated it: replace it, and stop the written blocks
            if (loads.current > 1) { latest.current.onTrouble('left'); replace(); }
          }}
        />}
        {lineY !== null && (
          <div className="pg-drop" style={{ top: Math.max(0, Math.min(size.h - 3, lineY)) }} aria-hidden="true">
            <span className="pp-mono">Drop here</span>
          </div>
        )}
      </div>
      {!ready && !stuck && (
        <div className="pg-canvas-wait" role="status">
          <p className="pp-mono">Drawing the page…</p>
          {late && <p className="pg-cap">The canvas has not started. Some browsers built into other apps refuse sandboxed frames; open this page in Chrome, Safari or Firefox.</p>}
        </div>
      )}
      {stuck && (
        <div className="pg-canvas-stuck" role="alert">
          <p className="pg-title">The canvas is stuck.</p>
          <p className="pg-cap">A written block never stopped running, and the browser keeps that process busy until this tab closes. Your page is saved: close this tab and open the playground again, and written blocks will wait for Run.</p>
        </div>
      )}
    </div>
  );
});
