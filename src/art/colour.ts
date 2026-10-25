// Colour maths for the livery picker: hex <-> OKLab/OKLCH (Björn Ottosson's), sRGB gamut
// limits and WCAG contrast. OKLCH keeps hue and lightness apart, so a colour can be made
// lighter for contrast without drifting in hue.

export type Lch = { l: number; c: number; h: number };
type Vec = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): Vec {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHex([r, g, b]: Vec) {
  const k = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0');
  return `#${k(r)}${k(g)}${k(b)}`;
}

function linearToLab([r, g, b]: Vec): Vec {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function labToLinear([L, a, b]: Vec): Vec {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export const hexToLab = (hex: string) => linearToLab(hexToRgb(hex).map(toLinear) as Vec);
export const labToHex = (lab: Vec) => rgbToHex(labToLinear(lab).map(toGamma) as Vec);

const lchToLab = ({ l, c, h }: Lch): Vec => [l, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];

export function toLch(hex: string): Lch {
  const [l, a, b] = hexToLab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

/** Linear sRGB of an OKLCH colour, possibly outside 0..1 (out of gamut). */
const lchToLinear = (x: Lch) => labToLinear(lchToLab(x));
const inGamut = (lin: Vec) => lin.every(v => v >= -1e-4 && v <= 1 + 1e-4);

/** The most chroma sRGB can show at this lightness and hue. */
export function maxChroma(l: number, h: number) {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(lchToLinear({ l, c: mid, h }))) lo = mid; else hi = mid;
  }
  return lo;
}

/** OKLCH to hex, pulling chroma in until it fits sRGB (hue and lightness stay put). */
export function fromLch(x: Lch) {
  const l = Math.min(1, Math.max(0, x.l));
  const c = Math.min(x.c, maxChroma(l, x.h));
  return rgbToHex(lchToLinear({ l, c, h: x.h }).map(toGamma) as Vec);
}

const luminanceLinear = ([r, g, b]: Vec) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const luminance = (hex: string) => luminanceLinear(hexToRgb(hex).map(toLinear) as Vec);
const ratio = (y1: number, y2: number) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
/** WCAG contrast ratio of two colours, 1 to 21. */
export const contrast = (a: string, b: string) => ratio(luminance(a), luminance(b));

/**
 * The colour, lightened (or darkened, `dir` -1) only as far as it needs to reach `min`
 * contrast against `bg`. Hue is kept; chroma shrinks only where sRGB runs out.
 */
export function ensureContrast(hex: string, bg: string, min: number, dir: 1 | -1 = 1) {
  if (contrast(hex, bg) >= min) return hex;
  const x = toLch(hex);
  let lo = x.l, hi = dir > 0 ? 1 : 0;
  if (contrast(fromLch({ ...x, l: hi }), bg) < min) return fromLch({ ...x, l: hi });
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(fromLch({ ...x, l: mid }), bg) >= min) hi = mid; else lo = mid;
  }
  return fromLch({ ...x, l: hi });
}

/** Mix two colours in OKLab, `t` 0 (a) to 1 (b). */
export function mix(a: string, b: string, t: number) {
  const A = hexToLab(a), B = hexToLab(b);
  return labToHex(A.map((v, i) => v + (B[i] - v) * t) as Vec);
}

/** `#rrggbb` with an alpha, as CSS `rgb()`. */
export function withAlpha(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex).map(c => Math.round(c * 255));
  return `rgb(${r} ${g} ${b} / ${a})`;
}

export const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);
