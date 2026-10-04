import { useEffect, useRef } from 'react';
import { whenIdle } from '@/lib/idle';
import { loaded } from '@/motion/loading';
import { glEnabled } from '@/motion/prefs';

/**
 * One fixed full-screen WebGL canvas behind the page: contour background,
 * 3D helmet and the lap. three.js is loaded only after the page is idle, so it
 * never delays the first paint or the h1.
 */
export function GLCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!glEnabled()) { loaded('engine'); loaded('helmet'); return; }
    let stop: (() => void) | undefined;
    let cancelled = false;
    whenIdle(async () => {
      const { Stage } = await import('./Stage');
      loaded('engine');
      if (cancelled || !ref.current) return;
      try {
        const stage = new Stage(ref.current);
        stop = () => stage.dispose();
        document.documentElement.classList.add('gl-on');
      } catch (err) {
        console.warn('[gl] disabled', err);
        loaded('helmet');
      }
    }, 1500, 300);
    return () => {
      cancelled = true;
      stop?.();
      document.documentElement.classList.remove('gl-on');
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="gl-canvas pointer-events-none fixed inset-0 -z-10 h-[100lvh] w-full opacity-0 transition-opacity duration-1000" />;
}
