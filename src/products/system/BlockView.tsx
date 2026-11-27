// The inside of the system page's block frame: /products/system?view=block, shown in a same-origin iframe. It draws one
// block at a time, on a page of its own at desktop width, so the block lays out, pins and enters exactly as on a
// product's page. The frame around it (BlockFrame.tsx) says which block to draw; nothing here runs anyone's code.
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { markRevealed } from '../arrive';
import { brandVars } from '../brand';
import { gsap, MOTION, reducedMotion } from '../motion';
import { One } from '../detail/blocks';
import { ACME, CATALOG, sampleSource, type BlockType } from '../playground/catalog';
import type { Product } from '../types';
import '../styles/system.css';

export type FrameMsg =
  | { t: 'show'; type: BlockType; brand: string; n: number; dir: -1 | 0 | 1 }
  | { t: 'ready' }
  | { t: 'drawn'; type: BlockType; n: number; error: string | null };

const TYPES = new Set<string>(CATALOG.map(e => e.type));

export function BlockView() {
  const [show, setShow] = useState<{ type: BlockType; brand: string; n: number; dir: -1 | 0 | 1 } | null>(null);
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRevealed();
    document.documentElement.classList.add('sy-view');
    const tell = (m: FrameMsg) => window.parent.postMessage(m, location.origin);
    const onMessage = (e: MessageEvent<FrameMsg>) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      const m = e.data;
      if (m?.t !== 'show' || !TYPES.has(m.type) || !/^#[0-9a-fA-F]{6}$/.test(m.brand)) return;
      const next = { type: m.type, brand: m.brand, n: m.n, dir: m.dir === 1 || m.dir === -1 ? m.dir : 0 } as const;
      // a step: the block on screen leaves the way the scroll goes, then the next one comes in (below)
      const el = page.current;
      if (el && next.dir && !reducedMotion()) gsap.to(el, { y: -next.dir * 36, opacity: 0, duration: 0.18, ease: MOTION.easeIn, overwrite: true, onComplete: () => setShow(next) });
      else setShow(next);
    };
    addEventListener('message', onMessage);
    // listening now: the frame may send the first block (it loads this page before this code arrives)
    tell({ t: 'ready' });
    return () => removeEventListener('message', onMessage);
  }, []);

  // The page is a fixed screen (the frame's 1440 x 900), so blocks that size themselves to the screen do so as on a
  // laptop. A block taller than the screen is scaled down to fit it whole; a transform, so its layout is untouched.
  const [scale, setScale] = useState(1);
  // each block's wrapper is new (it is keyed), so it is watched from its ref, and let go when it goes
  const fit = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, innerHeight / Math.max(1, el.offsetHeight))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ...and comes in from the side the scroll came from, as a page scrolls
  useLayoutEffect(() => {
    const el = page.current;
    if (!el || !show) return;
    if (show.dir && !reducedMotion()) gsap.fromTo(el, { y: show.dir * 48, opacity: 0 }, { y: 0, opacity: 1, duration: MOTION.enter, ease: MOTION.ease, overwrite: true });
    else gsap.set(el, { y: 0, opacity: 1, overwrite: true });
  }, [show]);

  if (!show) return null;
  const { block, from } = sampleSource(show.type);
  const product: Product = from ?? { ...ACME, brand: show.brand, blocks: [block] };
  return (
    <div className="dt pp-branded" ref={page} style={brandVars(product.brand)}>
      {/* a new key each time: the block mounts fresh, and its entrance plays */}
      <div className="dt-blocks sy-view-blocks" key={`${show.type}-${show.n}`} ref={fit} style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}>
        <Drawn type={show.type} n={show.n}><One block={block} product={product} /></Drawn>
      </div>
    </div>
  );
}

/** Tells the frame the block drew, or why it could not. */
class Drawn extends Component<{ type: BlockType; n: number; children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: e instanceof Error ? e.message : String(e) }; }
  override componentDidMount() { this.tell(); }
  override componentDidUpdate() { this.tell(); }
  tell() { window.parent.postMessage({ t: 'drawn', type: this.props.type, n: this.props.n, error: this.state.error } satisfies FrameMsg, location.origin); }
  override render() {
    return this.state.error === null ? this.props.children : <p className="dt-block pp-wrap pp-cap">This block could not draw: {this.state.error}</p>;
  }
}
