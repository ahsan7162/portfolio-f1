import { useEffect, useRef } from 'react';
import { whenIdle } from '@/lib/idle';
import { ensureGsap, ScrollTrigger } from '@/motion/gsap';
import { loaded } from '@/motion/loading';
import { glEnabled } from '@/motion/prefs';

/**
 * Two fixed full-screen WebGL canvases: one behind the page (contour background and the
 * lap), one above it, see-through and click-through (the helmet, which flies in front of
 * the text). three.js is loaded only after the page is idle, so it never delays the first
 * paint or the h1.
 *
 * `html.helmet-flight` (set before first paint by index.html when motion is allowed) opens
 * the helmet's slot in the About sentence. It is dropped, and the page re-measured, when
 * the helmet can't fly here after all: no WebGL2, a weak device, a lost context.
 */
export function GLCanvas() {
  const ref = useRef<HTMLCanvasElement>(null), over = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const grounded = () => {
      root.classList.remove('gl-on');
      if (!root.classList.contains('helmet-flight')) return;
      root.classList.remove('helmet-flight');
      ensureGsap();
      ScrollTrigger.refresh();
    };
    if (!glEnabled()) { grounded(); loaded('engine'); loaded('helmet'); return; }
    let stop: (() => void) | undefined;
    let cancelled = false;
    whenIdle(async () => {
      const { Stage } = await import('./Stage');
      loaded('engine');
      if (cancelled || !ref.current || !over.current) return;
      try {
        const stage = new Stage(ref.current, over.current);
        stage.onLost = grounded;
        stop = () => stage.dispose();
        root.classList.add('gl-on');
      } catch (err) {
        console.warn('[gl] disabled', err);
        grounded();
        loaded('helmet');
      }
    }, 1500, 300);
    return () => {
      cancelled = true;
      stop?.();
      root.classList.remove('gl-on');
    };
  }, []);
  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="gl-canvas pointer-events-none fixed inset-0 -z-10 h-[100lvh] w-full opacity-0 transition-opacity duration-1000" />
      <canvas ref={over} aria-hidden="true" className="gl-helmet" />
    </>
  );
}
