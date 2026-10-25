// Pointer effects on fine pointers only. Each returns a cleanup for onRevert.
import { onPalette, PALETTE } from '@/art/palette';
import { gsap } from './gsap';
import { finePointer } from './prefs';
import { DUR, EASE } from './tokens';

/**
 * Magnetic arrow: while the pointer is over `host`, `target` leans toward it
 * (quickTo, DUR.split) and settles back on leave. Fine pointers only. `pull`
 * defaults to the host's data-cursor-pull, so the cursor ring (Cursor.tsx)
 * and the arrow move as one. Returns a cleanup for onRevert.
 */
export function magnet(host: HTMLElement | null, target: HTMLElement | null, pull = Number(host?.dataset.cursorPull ?? 0.35)) {
  if (!host || !target || !finePointer()) return;
  const v = { duration: DUR.split, ease: EASE.out };
  const xTo = gsap.quickTo(target, 'x', v), yTo = gsap.quickTo(target, 'y', v);
  const move = (e: PointerEvent) => {
    const r = target.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * pull);
    yTo((e.clientY - (r.top + r.height / 2)) * pull);
  };
  const leave = () => { xTo(0); yTo(0); };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  return () => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); gsap.set(target, { clearProps: 'x,y' }); };
}

/**
 * Pointer proximity on split display type: letters near the cursor lean, part
 * slightly and warm to the accent, then settle when it leaves. Transforms and colour
 * only; letter centres are measured on enter (and again after scrolling), not
 * per move. Desktop, fine pointer only. Returns a cleanup.
 */
export function proximityChars(host: HTMLElement | null, lines: HTMLElement[], opts: { radius?: number; skew?: number; spread?: number; active?: () => boolean } = {}) {
  if (!host || !finePointer()) return;
  const { radius = 220, skew = -12, spread = 10, active } = opts;
  let mix = gsap.utils.interpolate(PALETTE.letter, PALETTE.ac);
  const offPalette = onPalette(() => { mix = gsap.utils.interpolate(PALETTE.letter, PALETTE.ac); });
  type C = { el: HTMLElement; cx: number; cy: number; skew: (v: number) => void; x: (v: number) => void; heat: (v: number) => void };
  let chars: C[] = [], measuredAt = -1;
  const v = { duration: DUR.wipe, ease: EASE.out };
  const collect = () => {
    // SplitText may have re-split a line (fonts, resize), which replaces its letters: walk
    // the lines for the current ones only then, not on every move.
    if (!chars.length || chars.some(c => !c.el.isConnected)) {
      const els = lines.flatMap(l => [...l.querySelectorAll<HTMLElement>('*')].filter(n => !n.children.length && n.textContent?.trim()));
      chars = els.map(el => {
        const h = { v: 0 };
        return { el, cx: 0, cy: 0, skew: gsap.quickTo(el, 'skewX', v), x: gsap.quickTo(el, 'x', v),
          heat: gsap.quickTo(h, 'v', { ...v, onUpdate: () => { el.style.color = h.v > 0.01 ? mix(h.v) : ''; } }) };
      });
      measuredAt = -1;
    }
    if (measuredAt !== scrollY) {
      chars.forEach(c => { const r = c.el.getBoundingClientRect(); c.cx = r.left + r.width / 2 - (gsap.getProperty(c.el, 'x') as number); c.cy = r.top + r.height / 2 + scrollY; });
      measuredAt = scrollY;
    }
  };
  const leave = () => chars.forEach(c => { c.skew(0); c.x(0); c.heat(0); });
  let hot = false;
  const move = (e: PointerEvent) => {
    // Paused (e.g. while the hero scrolls away): settle once, then ignore the pointer.
    if (active && !active()) { if (hot) { hot = false; leave(); } return; }
    hot = true;
    collect();
    const py = e.clientY + scrollY;
    chars.forEach(c => {
      const dx = c.cx - e.clientX, d = Math.hypot(dx, c.cy - py);
      const k = Math.max(0, 1 - d / radius), heat = k * k * (3 - 2 * k); // smoothstep
      c.skew(skew * heat);
      c.x(Math.sign(dx) * spread * heat);
      c.heat(heat);
    });
  };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  return () => {
    offPalette();
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', leave);
    chars.forEach(c => { gsap.set(c.el, { clearProps: 'x,skewX,color' }); });
  };
}
