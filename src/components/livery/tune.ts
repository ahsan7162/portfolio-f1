import { contrast, fromLch, toLch } from '@/art/colour';

// A painted colour as the panel's sliders hold it: OKLCH hue and chroma, and `s`, its shade
// between the darkest lightness that still reads against its ground (0) and near white (1).

export type Ink = 'ac' | 'ac2' | 'letter';
export type Tune = { h: number; c: number; s: number };

/** OKLCH hue names, each up to its bound. */
const HUES = [[12, 'Pink'], [42, 'Red'], [70, 'Orange'], [100, 'Amber'], [118, 'Yellow'], [138, 'Lime'], [168, 'Green'], [195, 'Teal'], [225, 'Cyan'], [255, 'Sky'], [282, 'Blue'], [308, 'Violet'], [338, 'Purple'], [361, 'Pink']] as const;
export const hueName = (h: number) => HUES.find(([bound]) => h < bound)![1];

const L_TOP = 0.96;

/** The darkest lightness at this hue and chroma that keeps `min` contrast against `bg`. */
function lowest(h: number, c: number, bg: string, min: number) {
  if (contrast(fromLch({ l: L_TOP, c, h }), bg) < min) return L_TOP;
  let lo = 0, hi = L_TOP;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(fromLch({ l: mid, c, h }), bg) >= min) hi = mid; else lo = mid;
  }
  return hi;
}

export const lightness = (t: Tune, bg: string, min: number) => { const lo = lowest(t.h, t.c, bg, min); return lo + (L_TOP - lo) * t.s; };
export const colourOf = (t: Tune, bg: string, min: number) => fromLch({ l: lightness(t, bg, min), c: t.c, h: t.h });

/** A hex colour as slider positions; a grey keeps the last hue (`hue`), since it has none of its own. */
export function tuneOf(hex: string, hue: number, bg: string, min: number): Tune {
  const x = toLch(hex), h = x.c < 0.02 ? hue : x.h, lo = lowest(h, x.c, bg, min);
  return { h, c: x.c, s: lo < L_TOP ? Math.min(1, Math.max(0, (x.l - lo) / (L_TOP - lo))) : 1 };
}

/** A slider track: `n` stops of the colours it reaches. */
export const track = (n: number, at: (i: number) => string) => `linear-gradient(90deg, ${Array.from({ length: n }, (_, i) => at(i)).join(', ')})`;
