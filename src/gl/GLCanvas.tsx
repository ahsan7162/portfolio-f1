import { useEffect, useRef } from 'react';
import { loaded } from '@/motion/loading';
import { glEnabled } from '@/motion/prefs';
import { glState } from './state';

/**
 * One fixed full-screen WebGL canvas behind the page: contour background,
 * 3D helmet and the lap. three.js is loaded only after the page is idle, so it
 * never delays the first paint or the h1.
 */
export function GLCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!glEnabled()) { loaded('engine'); loaded('helmet'); return; }
    glState.enabled = true;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 300));
    idle(async () => {
      const { Stage } = await import('./Stage');
      loaded('engine');
      if (cancelled || !ref.current) return;
      try {
        const stage = new Stage(ref.current);
        stop = () => stage.dispose();
        document.documentElement.classList.add('gl-on');
        glState.ready = true;
      } catch (err) {
        console.warn('[gl] disabled', err);
        loaded('helmet');
      }
    });
    return () => {
      cancelled = true;
      stop?.();
      glState.enabled = glState.ready = false;
      document.documentElement.classList.remove('gl-on');
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="gl-canvas pointer-events-none fixed inset-0 -z-10 h-[100lvh] w-full opacity-0 transition-opacity duration-1000" />;
}
