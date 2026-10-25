// The helmet's flight between two layout boxes: a cubic Bézier whose control points sit off
// each end by fractions of the distance between them. No allocation: called every frame.

export type Pt = { x: number; y: number };
/** [k1x, k1y, k2x, k2y]: control point 1 = a + (k1x·dx, k1y·dy); control point 2 = b + (k2x·dx, k2y·dy). */
export type Bend = readonly [number, number, number, number];

/** Drop then glide in, and a hook out to the side. */
export const DROP: Bend = [0, 0.4, 0, -0.3];
export const HOOK: Bend = [0, 0.3, -0.4, -0.2];

/** The curve's two control points. */
function controls(a: Pt, b: Pt, bend: Bend, c1: Pt, c2: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  c1.x = a.x + bend[0] * dx; c1.y = a.y + bend[1] * dy;
  c2.x = b.x + bend[2] * dx; c2.y = b.y + bend[3] * dy;
}

const c1: Pt = { x: 0, y: 0 }, c2: Pt = { x: 0, y: 0 };

/** The point at `t` (0..1) on the curve from a to b, written into `out`. */
export function cubicAt(a: Pt, b: Pt, bend: Bend, t: number, out: Pt) {
  controls(a, b, bend, c1, c2);
  const u = 1 - t, w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  out.x = w0 * a.x + w1 * c1.x + w2 * c2.x + w3 * b.x;
  out.y = w0 * a.y + w1 * c1.y + w2 * c2.y + w3 * b.y;
  return out;
}

/** Sizes change by ratio, so they interpolate on a log scale (a halving reads as even). */
export const logLerp = (a: number, b: number, t: number) => a * Math.pow(b / a, t);
