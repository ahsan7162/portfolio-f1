import { useEffect, useRef, useState } from 'react';
import { whenIdle } from '@/lib/idle';
import { ensureGsap } from '@/motion/gsap';
import { refreshSoon } from '@/motion/startup';
import { gl3d, lost3d, onGl3d } from './gl3d';

/**
 * The two fixed full-screen WebGL canvases (Stage.ts). three.js loads only while the 3D is
 * on (gl3d.ts), and on load only once the page is idle, so it never delays the first paint.
 * `html.helmet-flight` (set before first paint by index.html) opens the helmet's slot in the
 * About sentence; it opens and closes with the 3D.
 */
export function GLCanvas() {
  const ref = useRef<HTMLCanvasElement>(null), over = useRef<HTMLCanvasElement>(null);
  // A stopped stage gives its contexts back and a canvas can't get a new one, so a restart
  // gets fresh canvases (new keys) and this effect runs again with them.
  const [gen, setGen] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    const slot = (open: boolean) => {
      if (root.classList.contains('helmet-flight') === open) return;
      root.classList.toggle('helmet-flight', open);
      ensureGsap();
      refreshSoon();
    };
    // On load the stage waits for an idle moment; from the toggle it starts straight away.
    const start = (idle: boolean) => {
      slot(true);
      let stop: (() => void) | undefined;
      let cancelled = false;
      const go = async () => {
        const { Stage } = await import('./Stage');
        if (cancelled || !ref.current || !over.current) return;
        try {
          const stage = new Stage(ref.current, over.current);
          stage.onLost = lost3d;
          stop = () => stage.dispose();
          root.classList.add('gl-on');
        } catch (err) {
          console.warn('[gl] disabled', err);
          lost3d();
        }
      };
      if (idle) whenIdle(() => void go(), 1500, 300);
      else void go();
      return () => { cancelled = true; stop?.(); root.classList.remove('gl-on'); };
    };
    let on = gl3d().on;
    let used = false;
    let stop: (() => void) | undefined;
    const apply = (idle: boolean) => {
      stop?.();
      stop = undefined;
      if (on) { used = true; stop = start(idle); } else slot(false);
    };
    apply(gen === 0);
    const off = onGl3d(() => {
      const next = gl3d().on;
      if (next === on) return;
      if (next && used) { setGen(g => g + 1); return; }
      on = next;
      apply(false);
    });
    return () => { off(); stop?.(); };
  }, [gen]);
  return (
    <>
      <canvas key={`bg${gen}`} ref={ref} aria-hidden="true" className="gl-canvas pointer-events-none fixed inset-0 -z-10 h-[100lvh] w-full opacity-0 transition-opacity duration-1000" />
      <canvas key={`hl${gen}`} ref={over} aria-hidden="true" className="gl-helmet" />
    </>
  );
}
