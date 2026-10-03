import { useEffect, useRef, useState } from 'react';
import { SECTIONS } from '@/components/TrackMap';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { scrollState, useSmoothScroll } from '@/motion/SmoothScroll';

type Mark = { id: string; name: string; top: number; p: number };

/**
 * The page's scrollbar, desktop only (phones keep their own). A red pill with a
 * checkered band that stretches with scroll speed and wobbles back when you
 * stop; a dot per section lights up once passed, with names on hover. Drag the
 * pill, click the track, or click a section. The native bar is hidden only
 * while this is mounted, so without JS or with reduced motion it stays.
 */
export function ScrollRail() {
  const { lenis, scrollTo } = useSmoothScroll();
  const rail = useRef<HTMLDivElement>(null), thumb = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    const r = rail.current, th = thumb.current;
    if (!r || !th || !motionEnabled() || isTouch() || !window.matchMedia('(pointer: fine)').matches) return;
    const root = document.documentElement;
    root.classList.add('has-rail');
    let H = 0, T = 0, limit = 1, lastY = -1, lastV = 0;
    const clamp = gsap.utils.clamp(0, 1);
    const setY = gsap.quickSetter(th, 'y', 'px');
    const wobble = { duration: 0.9, ease: 'elastic.out(1, 0.35)' };
    const sY = gsap.quickTo(th, 'scaleY', wobble), sX = gsap.quickTo(th, 'scaleX', wobble);

    const place = () => {
      const p = clamp(scrollState.y / limit);
      setY(p * (H - T));
      const s = Math.min(0.6, Math.abs(scrollState.velocity) * 0.012);
      sY(1 + s); sX(1 - s * 0.4);
      r.querySelectorAll<HTMLElement>('[data-mark]').forEach(m => m.toggleAttribute('data-passed', p >= +m.dataset.p! - 0.002));
    };
    const layout = () => {
      H = r.clientHeight;
      limit = Math.max(1, root.scrollHeight - innerHeight);
      T = Math.max(44, (H * innerHeight) / root.scrollHeight);
      th.style.height = `${T}px`;
      setMarks(SECTIONS.map(([id, name]) => {
        const el = document.getElementById(id);
        const p = el ? clamp((el.getBoundingClientRect().top + scrollY) / limit) : 0;
        return { id, name, p, top: p * (H - T) + T / 2 };
      }));
      lastY = -1;
    };
    // Only does work on frames where the scroll moved or its speed changed.
    const tick = () => {
      if (scrollState.y === lastY && scrollState.velocity === lastV) return;
      lastY = scrollState.y; lastV = scrollState.velocity;
      place();
    };

    // Drag the pill (it follows the pointer 1:1); click the track to glide there.
    let grab = -1;
    const at = (e: PointerEvent, off: number) => clamp((e.clientY - r.getBoundingClientRect().top - off) / (H - T));
    const go = (p: number, immediate: boolean) => {
      const l = lenis();
      if (l) l.scrollTo(p * limit, immediate ? { immediate: true, force: true } : { duration: 1.1, force: true });
      else window.scrollTo(0, p * limit);
    };
    const down = (e: PointerEvent) => {
      if (e.button || (e.target as HTMLElement).closest('[data-mark]')) return;
      const y = e.clientY - r.getBoundingClientRect().top, ty = gsap.getProperty(th, 'y') as number;
      if (y >= ty && y <= ty + T) {
        grab = y - ty;
        r.setPointerCapture(e.pointerId);
        r.classList.add('dragging');
        e.preventDefault();
      } else go(at(e, T / 2), false);
    };
    const move = (e: PointerEvent) => { if (grab >= 0) go(at(e, grab), true); };
    const up = () => { grab = -1; r.classList.remove('dragging'); };
    r.addEventListener('pointerdown', down);
    r.addEventListener('pointermove', move);
    r.addEventListener('pointerup', up);
    r.addEventListener('pointercancel', up);

    ScrollTrigger.addEventListener('refresh', layout);
    ScrollTrigger.refresh(); // the page just got 10px wider
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener('refresh', layout);
      r.removeEventListener('pointerdown', down);
      r.removeEventListener('pointermove', move);
      r.removeEventListener('pointerup', up);
      r.removeEventListener('pointercancel', up);
      root.classList.remove('has-rail');
    };
  }, [lenis]);

  return (
    <div ref={rail} data-rail aria-hidden="true" className="rail">
      <span className="rail-line" />
      {marks.map(m => (
        <button key={m.id} type="button" tabIndex={-1} data-mark data-p={m.p} style={{ top: m.top }}
          onClick={() => scrollTo(`#${m.id}`)} className="rail-mark">
          <span className="rail-label">{m.name}</span>
        </button>
      ))}
      <div ref={thumb} data-cursor="drag" className="rail-thumb"><span className="rail-flag" /></div>
    </div>
  );
}
