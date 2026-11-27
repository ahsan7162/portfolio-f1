// The playground's canvas: a real detail page, drawn from what the editor sends, inside a locked sandbox.
//
// It is served with `Content-Security-Policy: sandbox allow-scripts` and is embedded with sandbox="allow-scripts",
// so its origin is opaque: no cookies, no storage, no access to the editor or the site. The same policy allows no
// network at all (connect-src 'none', images, media and fonts from the site only), no frames, no workers, no
// forms, and only the editor may embed it (frame-ancestors 'self'). This file refuses to run unless both the
// sandbox and the frame are really there, so the code a visitor writes never runs anywhere else.
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/base.css';
import { markRevealed } from '../../arrive';
import { One } from '../../detail/blocks';
import { Written as WrittenBlocks } from '../../detail/blocks/Custom';
import { Detail } from '../../detail/Detail';
import type { Product } from '../../types';
import { readToFrame, type FromFrame, type Source } from '../protocol';
import { compile, type Written } from './compile';
import './frame.css';

const root = createRoot(document.getElementById('root')!);
const framed = window.parent !== window;
// An opaque origin is the proof the sandbox is on: the browser reports it as the string 'null'.
const sandboxed = self.origin === 'null';
// The editor is on the site's own origin (frame-ancestors 'self'), which is this page's URL origin.
const editor = location.origin;
const ancestors = (location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
const embeddedBySite = !ancestors || ancestors.length === 0 || ancestors[0] === editor;

if (!framed || !sandboxed || !embeddedBySite) {
  root.render(<p className="pg-refuse pp-mono">This canvas runs only inside the playground.</p>);
} else {
  start();
}

function start() {
  // WebRTC can open a connection that the content security policy does not cover: take it away before any code runs.
  for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection', 'RTCDataChannel', 'RTCSessionDescription', 'RTCIceCandidate']) {
    try { Object.defineProperty(window, name, { value: undefined, writable: false, configurable: false }); } catch { /* already gone */ }
  }
  // the policy already refuses a beacon's request; this makes the call itself fail, so nothing is even queued
  Object.defineProperty(navigator, 'sendBeacon', { value: () => false, writable: false, configurable: false });

  const send = (msg: FromFrame) => window.parent.postMessage(msg, editor);
  markRevealed();

  // The canvas never navigates: a link click selects its block instead of leaving.
  document.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('a[href]')) e.preventDefault();
    const block = target?.closest('.dt-blocks > .dt-block');
    if (block) send({ t: 'pick', i: [...block.parentElement!.children].indexOf(block) });
  }, true);
  document.addEventListener('submit', e => e.preventDefault(), true);

  let queued = 0;
  const report = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      const els = [...document.querySelectorAll('.dt-blocks > .dt-block')].map(el => el.getBoundingClientRect());
      send({ t: 'layout', tops: els.map(r => r.top), heights: els.map(r => r.height), view: innerHeight });
    });
  };
  addEventListener('scroll', report, { passive: true });
  addEventListener('resize', report);
  new ResizeObserver(report).observe(document.body);
  setInterval(() => send({ t: 'tick' }), 1000);

  root.render(<Canvas send={send} onDrawn={report} />);
  send({ t: 'ready' });
}

type Page = { product: Product; keys: string[]; selected: number };

function Canvas({ send, onDrawn }: { send: (m: FromFrame) => void; onDrawn: () => void }) {
  const [page, setPage] = useState<Page | null>(null);
  const [written, setWritten] = useState<Record<string, Written>>({});

  useEffect(() => {
    const sheets = new Map<string, CSSStyleSheet>();
    const build = (sources: Source[]) => {
      const out: Record<string, Written> = {};
      for (const s of sources) {
        try {
          out[s.name] = compile(s.name, s.code);
          send({ t: 'built', name: s.name, error: null });
        } catch (e) {
          send({ t: 'built', name: s.name, error: e instanceof Error ? e.message : String(e) });
        }
        // a block's CSS goes in as a constructed sheet: no <style> element, no @import, no request
        const sheet = sheets.get(s.name) ?? new CSSStyleSheet();
        sheet.replaceSync(s.css);
        sheets.set(s.name, sheet);
      }
      for (const name of sheets.keys()) if (!sources.some(s => s.name === name)) sheets.delete(name);
      document.adoptedStyleSheets = [...sheets.values()];
      setWritten(out);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== editor) return;
      const msg = readToFrame(e.data);
      if (!msg) return;
      if (msg.t === 'render') setPage({ product: msg.product, keys: msg.keys, selected: msg.selected });
      else if (msg.t === 'code') build(msg.sources);
      else if (msg.t === 'scroll') document.querySelectorAll('.dt-blocks > .dt-block')[msg.i]?.scrollIntoView({ block: 'start' });
      else if (msg.t === 'nudge') scrollBy(0, msg.by);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [send]);

  // the selected block is outlined in the canvas, so the outline scrolls with it
  useEffect(() => {
    document.querySelectorAll('[data-pg-sel]').forEach(el => el.removeAttribute('data-pg-sel'));
    if (page && page.selected >= 0) document.querySelectorAll('.dt-blocks > .dt-block')[page.selected]?.setAttribute('data-pg-sel', '');
    onDrawn();
  });

  if (!page) return null;
  const { product, keys } = page;
  return (
    <WrittenBlocks value={written}>
      <Detail
        key={product.slug}
        product={product}
        blocks={(
          <div className="dt-blocks">
            {product.blocks.map((b, i) => <Guard key={keys[i]} i={i} send={send} block={b}><One block={b} product={product} /></Guard>)}
          </div>
        )}
      />
    </WrittenBlocks>
  );
}

/** One block behind its own error boundary: a block that fails to draw shows why, and the page around it stays. */
type GuardProps = { i: number; send: (m: FromFrame) => void; block: unknown; children: ReactNode };
class Guard extends Component<GuardProps, { error: string | null; block: unknown }> {
  override state = { error: null as string | null, block: this.props.block };
  static getDerivedStateFromError(e: unknown) { return { error: e instanceof Error ? e.message : String(e) }; }
  // new data for the block: try drawing it again
  static getDerivedStateFromProps(props: GuardProps, state: { block: unknown }) { return props.block === state.block ? null : { error: null, block: props.block }; }
  override componentDidCatch(e: unknown, _info: ErrorInfo) { this.props.send({ t: 'fault', i: this.props.i, message: e instanceof Error ? e.message : String(e) }); }
  override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <section className="dt-block dt-sec pp-wrap pg-fault" role="alert">
        <p className="pp-mono">This block could not draw</p>
        <pre>{this.state.error}</pre>
      </section>
    );
  }
}
