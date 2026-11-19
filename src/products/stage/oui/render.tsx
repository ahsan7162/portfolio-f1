// Draws an OpenUI Lang program as bb would show it in a reply, and streams one in as an agent writes it.
import { useEffect, useMemo, useState } from 'react';
import { reducedMotion } from '../../motion';
import { CORE, Node, OuiCtx, type Draw } from './kit';
import { resolve } from './lang';
import { NUMBERS } from './numbers';
import { PLANNING } from './planning';
import { REPORTS } from './reports';
import { WEB } from './web';
import '../../styles/oui.css';

/** Every component this page draws, by name. */
export const DRAW: Record<string, Draw> = { ...CORE, ...NUMBERS, ...PLANNING, ...REPORTS, ...WEB };

/**
 * One reply's block. While `streaming`, the program is still arriving: whole statements draw, the rest wait as
 * skeletons, and nothing can be clicked. Charts draw once it stops (`data-drawn`), as the plugin's do.
 */
export function OuiBlock({ src, streaming = false, ask, part }: { src: string; streaming?: boolean; ask?: (text: string) => void; part?: string }) {
  const tree = useMemo(() => resolve(src), [src]);
  const api = useMemo(() => ({ draw: DRAW, streaming, ask: ask ?? (() => {}) }), [streaming, ask]);
  return (
    <OuiCtx.Provider value={api}>
      <div className="oui-fence" data-streaming={streaming || undefined} data-drawn={!streaming || undefined} data-part={part}><Node v={tree} /></div>
    </OuiCtx.Provider>
  );
}

/** How long a program takes to stream in: about 600 characters a second, between 0.9 and 2.6 s. */
export const streamTime = (src: string) => Math.min(2.6, Math.max(0.9, src.length / 600));

/** The program as it stands `t` seconds into streaming: it arrives a character at a time, as an agent writes it. */
export function streamed(src: string, t: number) {
  const total = streamTime(src);
  return t >= total ? src : src.slice(0, Math.floor((t / total) * src.length));
}

/** Streams `src` in once each time `go` turns true; with reduced motion it is simply whole. */
export function useStream(src: string, go: boolean) {
  const calm = reducedMotion();
  const run = go && !calm ? src : null;
  // The time belongs to one run: a new run reads 0 until its first frame, so nothing flashes whole first.
  const [at, setAt] = useState<{ run: string | null; t: number }>({ run: null, t: 0 });
  useEffect(() => {
    if (run === null) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick() {
      const t = (performance.now() - t0) / 1000;
      setAt({ run, t });
      if (t < streamTime(run)) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [run]);
  const text = run === null ? src : streamed(src, at.run === run ? at.t : 0);
  return { text, streaming: text.length < src.length };
}
