import { gsap, ScrollTrigger } from '@/motion/gsap';
import { SHORT_SCREEN } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';
import { cubicAt, DROP, logLerp, type Pt } from './bezier';
import { ANCHOR, ROUTE, SHORT_ENDS, START_ROT, VIRTUAL, type AnchorId, type End } from './route';

/** Where the helmet is this frame: its anchor point and width in CSS px, rotation in radians. */
export type Flight = {
  x: number; y: number; size: number;
  /** 0 = centred on (x, y), 1 = standing on it (its bottom edge at y). */
  stand: number;
  rx: number; ry: number; rz: number;
  /** How much pointer tilt and float it keeps (0..1). */
  loose: number;
};

type Box = { p: Pt; w: number; stand: number };

/**
 * The helmet's flight down the page (landonorris.com's): the route's windows are
 * resolved to scroll positions on every ScrollTrigger refresh; each frame finds the
 * window the scroll is in and places the helmet on the Bézier between the two anchors'
 * boxes as they are on screen right now, so it lands exactly in them, pins and
 * transforms included (it rides the podium step up as the step builds). That is one
 * or two layout reads a frame, and none while it is away. Scroll is Lenis's, already
 * smoothed, so there is no extra lag on top.
 */
export function bindFlight() {
  const marks = new Map<string, ScrollTrigger>();
  const pinOf = (sel: string) => ScrollTrigger.getAll().find(t => t.pin === document.querySelector(sel));
  const endOf = (e: End) => {
    if ('pin' in e) {
      const p = pinOf(e.pin);
      return p ? (e.at === 'start' ? p.start : p.end) + (e.offsetVh ?? 0) * innerHeight : 0;
    }
    const key = `${e.trigger}|${e.start}`;
    let st = marks.get(key);
    if (!st) { st = ScrollTrigger.create({ trigger: e.trigger, start: e.start }); marks.set(key, st); }
    return st.start;
  };
  let ends: number[] = [];
  const els = new Map<AnchorId, HTMLElement | null>();
  const measure = () => {
    const short = matchMedia(SHORT_SCREEN).matches;
    const max = ScrollTrigger.maxScroll(window);
    ends = [];
    // Never backwards: one move at a time, whatever the layout does. The last window
    // ends by the bottom of the page, or the helmet could never park.
    ROUTE.forEach((w, i) => ends.push(Math.max(endOf((short && SHORT_ENDS[i]) || w.end), (ends[i - 1] ?? 0) + 1)));
    const last = ends.length - 1;
    ends[last] = Math.max(Math.min(ends[last], max), (ends[last - 1] ?? 0) + 1);
    els.clear();
  };
  measure(); // creates the boundary triggers
  ScrollTrigger.addEventListener('refresh', measure);
  // They were created after the sections' own pins: re-sort by page position, re-measure.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  const el = (id: AnchorId) => {
    if (!els.has(id)) els.set(id, document.querySelector<HTMLElement>(`[data-helmet-anchor="${id}"]`));
    return els.get(id) ?? null;
  };
  const boxOf = (id: AnchorId, W: number, H: number, out: Box) => {
    const a = ANCHOR[id], v = VIRTUAL[id];
    if (v) { out.p.x = v.x * W; out.p.y = v.y * H; out.w = v.size * H * a.fill; out.stand = 0; return out; }
    const r = el(id)?.getBoundingClientRect();
    if (!r) { out.p.x = W * 1.3; out.p.y = H * 0.3; out.w = H * 0.3; out.stand = 0; return out; }
    out.p.x = r.left + r.width / 2;
    out.p.y = a.stand ? r.top : r.top + r.height / 2;
    // Never 0 (an anchor inside something hidden): the size is interpolated by ratio (logLerp).
    out.w = Math.max(1, r.width * a.fill);
    out.stand = a.stand ? 1 : 0;
    return out;
  };

  const ease = gsap.parseEase(EASE.fly);
  const A: Box = { p: { x: 0, y: 0 }, w: 1, stand: 0 }, B: Box = { p: { x: 0, y: 0 }, w: 1, stand: 0 };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  /** Where the helmet is at scroll `y` in a W x H viewport, written into `out`. */
  const sample = (y: number, W: number, H: number, out: Flight) => {
    let i = ends.findIndex(end => y < end);
    if (i < 0) i = ROUTE.length - 1;
    const w = ROUTE[i], s0 = ends[i - 1] ?? 0;
    const raw = gsap.utils.clamp(0, 1, (y - s0) / Math.max(1, ends[i] - s0));
    const t = ease(raw);
    boxOf(w.from, W, H, A);
    if (w.to === w.from) { B.p.x = A.p.x; B.p.y = A.p.y; B.w = A.w; B.stand = A.stand; } else boxOf(w.to, W, H, B);
    cubicAt(A.p, B.p, w.bend ?? DROP, t, out);
    out.size = logLerp(A.w, B.w, t);
    out.stand = lerp(A.stand, B.stand, t);
    const r0 = ROUTE[i - 1]?.rot ?? START_ROT, r1 = w.rot;
    out.rx = lerp(r0[0], r1[0], t); out.ry = lerp(r0[1], r1[1], t); out.rz = lerp(r0[2], r1[2], t);
    out.loose = lerp(ANCHOR[w.from].loose, ANCHOR[w.to].loose, t);
    return out;
  };

  return {
    sample,
    dispose() {
      ScrollTrigger.removeEventListener('refresh', measure);
      marks.forEach(st => st.kill());
      marks.clear();
    },
  };
}
