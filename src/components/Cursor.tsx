import { useEffect, useRef } from 'react';
import { ensureGsap, gsap } from '@/motion/gsap';
import { finePointer, motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

type State = 'idle' | 'link' | 'view' | 'open' | 'drag' | 'heat' | 'magnet' | 'scroll';
const LABEL: Partial<Record<State, string>> = { view: 'View', open: 'Open', drag: 'Drag', scroll: 'Scroll' };
const RING = 34; // px, the ring's resting size (also in the CSS)

/**
 * The custom pointer: a red dot exactly on the pointer (never eased, so pointing stays as
 * precise as the native cursor) and a ring that trails it and stretches along the direction
 * of travel. Elements opt into states with `data-cursor` (links and buttons default to
 * `link`). Desktop, fine pointer and motion only; the native cursor is hidden by a class
 * this adds, so if it never runs nothing changes.
 */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || !motionEnabled() || !finePointer()) return;
    ensureGsap();
    const html = document.documentElement;
    const ring = el.querySelector<HTMLElement>('[data-cring]')!, stretch = el.querySelector<HTMLElement>('[data-cstretch]')!;
    const dot = el.querySelector<HTMLElement>('[data-cdot]')!, label = el.querySelector<HTMLElement>('[data-clabel]')!;
    html.classList.add('has-cursor');

    const dx = gsap.quickSetter(dot, 'x', 'px') as (v: number) => void, dy = gsap.quickSetter(dot, 'y', 'px') as (v: number) => void;
    const ease = { duration: 0.35, ease: EASE.out };
    const rx = gsap.quickTo(ring, 'x', ease), ry = gsap.quickTo(ring, 'y', ease);
    const sx = gsap.quickTo(stretch, 'scaleX', { duration: DUR.split, ease: EASE.out }), sy = gsap.quickTo(stretch, 'scaleY', { duration: DUR.split, ease: EASE.out });
    const rot = gsap.quickSetter(stretch, 'rotation', 'deg') as (v: number) => void;
    const settle = gsap.delayedCall(0.08, () => { sx(1); sy(1); }).pause();

    let state: State = 'idle', shown = false, lapHint = true;
    let magnet: { cx: number; cy: number; pull: number } | null = null;
    let last = { x: 0, y: 0, t: 0 }, angle = 0;

    const setState = (next: State) => {
      if (next === state) return;
      state = next;
      el.dataset.state = next;
      const text = LABEL[next];
      if (text) gsap.to(label, { scrambleText: { text, chars: 'abcdefghijklmnopqrstuvwxyz' }, duration: 0.25, ease: EASE.none, overwrite: true });
    };

    const stateOf = (t: EventTarget | null): State => {
      const node = t instanceof Element ? t : null;
      const hit = node?.closest<HTMLElement>('[data-cursor], a, button');
      magnet = null;
      if (!hit) return 'idle';
      const s = (hit.dataset.cursor as State | undefined) ?? 'link';
      if (s === 'scroll' && !lapHint) return 'idle';
      if (s === 'magnet') {
        // Snap to the magnetic arrow's circle: read its rect once, on enter.
        const c = hit.querySelector('[data-cursor-target]')?.getBoundingClientRect();
        if (!c) return 'link';
        magnet = { cx: c.left + c.width / 2, cy: c.top + c.height / 2, pull: Number(hit.dataset.cursorPull ?? 0.3) };
        ring.style.setProperty('--ms', String(c.width / RING));
      }
      return s;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const { clientX: x, clientY: y } = e;
      dx(x); dy(y);
      if (!shown) { shown = true; gsap.set(ring, { x, y }); el.dataset.on = ''; }
      if (magnet) {
        rx(magnet.cx + (x - magnet.cx) * magnet.pull);
        ry(magnet.cy + (y - magnet.cy) * magnet.pull);
      } else { rx(x); ry(y); }
      // Speed stretch along the direction of travel, rounding back once the pointer rests.
      const t = e.timeStamp, dt = Math.max(1, t - last.t), mx = x - last.x, my = y - last.y;
      last = { x, y, t };
      const v = Math.hypot(mx, my) / dt; // px per ms
      if (v > 0.05 && state !== 'drag' && state !== 'magnet') {
        let a = (Math.atan2(my, mx) * 180) / Math.PI;
        // Shortest turn (a stretched ring is symmetric, so 180 degrees apart looks the same).
        while (a - angle > 90) a -= 180;
        while (a - angle < -90) a += 180;
        angle = a;
        rot(angle);
        const k = Math.min(1, v / 2.5);
        sx(1 + 0.5 * k); sy(1 - 0.25 * k);
      }
      settle.restart(true);
    };
    const over = (e: PointerEvent) => { if (e.pointerType === 'mouse') setState(stateOf(e.target)); };
    const down = () => el.toggleAttribute('data-down', true);
    const up = () => el.toggleAttribute('data-down', false);
    const leave = (e: PointerEvent) => { if (!e.relatedTarget) { delete el.dataset.on; shown = false; } };
    // The Lap's SCROLL hint goes away for good once the visitor scrolls inside the pin.
    const scrolled = () => { if (state === 'scroll') { lapHint = false; setState('idle'); } };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('scroll', scrolled, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', leave);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('scroll', scrolled);
      settle.kill();
      gsap.killTweensOf([ring, stretch, label]);
      html.classList.remove('has-cursor');
      delete el.dataset.on;
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" data-state="idle" className="cursor">
      <div data-cring className="cursor-pos">
        <div data-cstretch><div className="cursor-ring" /></div>
        <span data-clabel className="cursor-label" />
        <svg viewBox="0 0 12 8" className="cursor-chev"><path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </div>
      <div data-cdot className="cursor-pos"><div className="cursor-dot" /></div>
    </div>
  );
}
