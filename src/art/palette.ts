// The site's colours for code that can't read CSS: SVG attributes, canvas paint,
// three.js materials and GLSL. The same values are the CSS variables at the top of
// src/index.css; change both together.
//
// Liveries a visitor picks in the nav (LiveryPanel): F1 (chalk and red, the CSS defaults),
// Barça (the 25/26 third kit: purple for every accent surface, gold for accent text and the
// name, under html[data-theme]), a few more made from five colours each, and their own
// five. From five colours every other shade is derived (derive) and written onto <html> as
// inline variables. A change applies live: the CSS variables, and PALETTE (mutated in
// place) for the code that copied a colour, which re-reads it in onPalette; a pick
// crossfades the whole page. index.html applies the stored livery before first paint.
// The prerender runs in Node, without a document, and always gets F1: markup that is
// prerendered colours itself with var(--…) instead of these values.

import { motionEnabled } from '@/motion/prefs';
import { ensureContrast, fromLch, hexToLab, isHex, labToHex, mix, toLch, withAlpha } from './colour';


/** F1, the CSS defaults. Sections name their backdrops (data-bg) in its grounds, and the Stage carries them onto the livery's (groundShade). */
export const F1 = {
  carbon: '#0b0b0c',
  graphite: '#111113',
  /** Raised panels (the hero's lower gradient stop, the project scenes' windows). */
  panel: '#141417',
  /** The darkest ground: the Lap's 3D scene and the footer. */
  pit: '#070708',
  fg: '#f4f4ed',
  mute: '#a3a39c',
  /** Lettering: the hero name, the outline numbers and the helmet's, like the name and number on a shirt's back. */
  letter: '#f4f4ed',
  ac: '#ff2438',
  /** The livery's second colour: accent text, the car body, the helmet's stripes and initials. Red again in F1. */
  ac2: '#ff2438',
  /** The car's rain light between blinks. */
  lampOff: '#3a070c',
};
export type Palette = typeof F1;

const BARCA: Palette = { ...F1, letter: '#d8b866', ac: '#9061f9', ac2: '#d8b866', lampOff: '#1d0f3a' };

/** The five colours a visitor picks. Every other shade follows from them (derive). */
export type Seeds = { ground: string; fg: string; ac: string; ac2: string; letter: string };
export type Role = keyof Seeds;

const seedsOf = (p: Palette): Seeds => ({ ground: p.carbon, fg: p.fg, ac: p.ac, ac2: p.ac2, letter: p.letter });
const CHALK = F1.fg, CARBON = F1.carbon;

/**
 * The ready-made liveries. F1 and Barça are hand-tuned in index.css; the rest are five
 * colours each, derived like a visitor's own.
 */
export const LIVERIES = [
  { id: 'f1', label: 'F1', seeds: seedsOf(F1) },
  { id: 'barca', label: 'Barça', seeds: seedsOf(BARCA) },
  { id: 'papaya', label: 'Papaya', seeds: { ground: CARBON, fg: CHALK, ac: '#ff8a1f', ac2: '#ff8a1f', letter: CHALK } },
  { id: 'green', label: 'Racing green', seeds: { ground: '#0b1510', fg: CHALK, ac: '#3ccf7e', ac2: '#e6d3a3', letter: '#efe6c8' } },
  { id: 'ice', label: 'Ice', seeds: { ground: '#0b111c', fg: CHALK, ac: '#8ad4ff', ac2: '#8ad4ff', letter: CHALK } },
  { id: 'midnight', label: 'Midnight', seeds: { ground: '#0d1226', fg: CHALK, ac: '#6f8dff', ac2: '#ff7ab8', letter: CHALK } },
  { id: 'lime', label: 'Lime', seeds: { ground: '#0b0d0a', fg: CHALK, ac: '#c6f432', ac2: '#c6f432', letter: CHALK } },
  { id: 'mono', label: 'Mono', seeds: { ground: CARBON, fg: CHALK, ac: CHALK, ac2: CHALK, letter: CHALK } },
] as const;
export type Preset = (typeof LIVERIES)[number]['id'];
export type Livery = Preset | 'custom';
export const presetSeeds = (id: Preset): Seeds => LIVERIES.find(l => l.id === id)!.seeds;
const isLivery = (x: unknown): x is Livery => x === 'custom' || LIVERIES.some(l => l.id === x);

/**
 * What each picked colour must stay readable against, so no choice breaks the page.
 * The ground stays dark (the 3D's fog, glows and helmet are lit for it); the rest
 * keep a WCAG contrast against the ground they sit on: carbon text on accent buttons,
 * accent text and figures on the lightest tiles, body text well above that.
 */
export const RULES: Record<Role, { against?: 'carbon' | 'tile'; min?: number }> = {
  ground: {},
  fg: { against: 'tile', min: 10 },
  ac: { against: 'carbon', min: 4.5 },
  ac2: { against: 'tile', min: 4.5 },
  letter: { against: 'carbon', min: 4.5 },
};
/** The ground's band in OKLCH: lightness and the most chroma (a tint, not a colour). */
export const GROUND = { l: [0.1, 0.26], c: 0.06 } as const;

const F1_CARBON = hexToLab(F1.carbon);
type Lab = [number, number, number];

/** The F1 ground shade `hex`, moved by `d` (the picked ground's offset from F1's carbon) in OKLab. */
const shifted = (hex: string, d: Lab) => labToHex(hexToLab(hex).map((v, i) => v + d[i]) as Lab);

export function fitGround(hex: string) {
  const x = toLch(hex);
  return fromLch({ l: Math.min(GROUND.l[1], Math.max(GROUND.l[0], x.l)), c: Math.min(GROUND.c, x.c), h: x.h });
}

/** The grounds a role is checked against, for this ground colour. */
export function groundsFor(groundHex: string) {
  const g = fitGround(groundHex);
  const d = hexToLab(g).map((v, i) => v - F1_CARBON[i]) as Lab;
  return { carbon: g, tile: shifted('#1a1a1e', d), d };
}

/** A picked colour as the page will use it: the ground clamped to its band, the rest lifted to their contrast. */
export function fit(role: Role, hex: string, groundHex: string) {
  if (role === 'ground') return fitGround(hex);
  const { against, min } = RULES[role], grounds = groundsFor(groundHex);
  return ensureContrast(hex, grounds[against!], min!);
}

/**
 * The whole palette from five picked colours: the CSS variables (every token index.css
 * defines) and the values for code. The F1 shades are measured against F1's red and
 * carbon and carried over: grounds keep their offsets from the picked ground, the lamps
 * and the footer frame keep their lightness in the picked accent's hue, with chroma in
 * proportion to the accent's.
 */
export function derive(s: Seeds) {
  const { carbon, tile, d } = groundsFor(s.ground);
  const g = (hex: string) => shifted(hex, d);
  const graphite = g(F1.graphite), panel = g(F1.panel), pit = g(F1.pit);
  const fg = fit('fg', s.fg, s.ground), ac = fit('ac', s.ac, s.ground), ac2 = fit('ac2', s.ac2, s.ground), letter = fit('letter', s.letter, s.ground);
  // Muted and dim text sit between the text and the ground, as F1's do (31% and 43% of the way down).
  const F = toLch(fg), down = (t: number) => fromLch({ l: F.l + (toLch(carbon).l - F.l) * t, c: F.c, h: F.h });
  const mute = ensureContrast(down(0.31), tile, 4.5), dim = ensureContrast(down(0.43), panel, 4.5);
  // F1's red is C 0.245: each tint keeps its F1 lightness and its share of that chroma.
  const A = toLch(ac), tint = (l: number, share: number) => fromLch({ l, c: A.c * share, h: A.h });
  const lampOff = tint(0.231, 0.32);
  const css: Record<string, string> = {
    '--carbon': carbon, '--graphite': graphite, '--panel': panel, '--pit': pit, '--raise': tile, '--lift': g('#18181b'),
    '--fg': fg, '--mute': mute, '--dim': dim, '--line': withAlpha(fg, 0.12),
    '--letter': letter, '--hover': letter, '--ac': ac, '--ac2': ac2,
    // Shadows: near black, tinted toward the accent.
    '--shade': tint(0.087, 0.14),
    '--lamp-hot': tint(0.912, 0.19), '--lamp-rim': tint(0.466, 0.74), '--lamp-off': tint(0.18, 0.15), '--lamp-socket': tint(0.202, 0.22),
    '--frame-0': tint(0.217, 0.25), '--frame-1': tint(0.238, 0.3), '--frame-2': tint(0.316, 0.455), '--frame-3': tint(0.463, 0.71),
    // The footer's legal line is chalk on the frame's deepest stop: 4.5:1 at least.
    '--frame-4': ensureContrast(tint(0.532, 0.84), fg, 4.5, -1),
  };
  const js: Palette = { carbon, graphite, panel, pit, fg, mute, letter, ac, ac2, lampOff };
  return { css, js, d };
}

const STORE_KEY = 'v2-livery';
type Stored = { livery: Livery; seeds?: Seeds; vars?: Record<string, string> };

function read(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Stored | null;
    if (s && isLivery(s.livery) && (s.livery !== 'custom' || s.seeds)) return s;
  } catch { /* private mode or a bad value: F1 */ }
  return { livery: 'f1' };
}

const browser = typeof document !== 'undefined';
const stored: Stored = browser ? read() : { livery: 'f1' };

export type LiveryState = { livery: Livery; seeds: Seeds };
/** The livery and the visitor's own colours (kept while a preset is on, for coming back to Custom). */
let state: LiveryState = { livery: stored.livery, seeds: stored.seeds ?? presetSeeds('f1') };
const SERVER_STATE: LiveryState = { livery: 'f1', seeds: presetSeeds('f1') };
let offset: Lab = [0, 0, 0];

function computed(s: LiveryState) {
  if (s.livery === 'f1' || s.livery === 'barca') return { css: null, js: s.livery === 'barca' ? BARCA : F1, d: [0, 0, 0] as Lab };
  return derive(s.livery === 'custom' ? s.seeds : presetSeeds(s.livery));
}

const first = computed(state);
/** The live palette. Mutated in place on a livery change: read it when painting, and repaint in onPalette. */
export const PALETTE: Palette = { ...first.js };
offset = first.d;

/**
 * An F1 ground shade (the 3D's asphalt, the helmet's carbon, the sections' backdrops) on
 * the current ground: the same colour in F1 and Barça, moved with a custom ground.
 */
export function groundShade(hex: string) {
  return offset[0] || offset[1] || offset[2] ? shifted(hex, offset) : hex;
}

const frameFns = new Set<() => void>(), settledFns = new Set<() => void>(), stateFns = new Set<() => void>();
let frameReq = 0, settleTimer = 0;

/**
 * Run `fn` after the palette changes: once per frame while colours are being dragged, or
 * with `settled` once they have rested for a moment (for heavier rebuilds). Returns an unsubscribe.
 */
export function onPalette(fn: () => void, settled = false) {
  const set = settled ? settledFns : frameFns;
  set.add(fn);
  return () => { set.delete(fn); };
}

let applied: string[] = [];
/** Write a livery onto <html>: Barça's attribute, or a derived palette's variables. */
function paint(livery: Livery, css: Record<string, string> | null) {
  const root = document.documentElement;
  if (livery === 'barca') root.dataset.theme = 'barca'; else delete root.dataset.theme;
  const next = css ? Object.keys(css) : [];
  for (const k of applied) if (!next.includes(k)) root.style.removeProperty(k);
  if (css) for (const k of next) root.style.setProperty(k, css[k]);
  applied = next;
}
// index.html painted the stored variables; repaint them from the colours, in case derive changed since.
if (browser && first.css) { applied = Object.keys(stored.vars ?? {}); paint(state.livery, first.css); }

let unsaved: Stored | null = null;
function save() {
  if (!unsaved) return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(unsaved)); } catch { /* private mode: this visit only */ }
  unsaved = null;
}
// A colour still being dragged is stored when it rests, or as the page goes away.
if (browser) addEventListener('pagehide', save);

/** Every variable a livery sets, for reading the page's current colours (crossfade). */
const TOKENS = Object.keys(derive(presetSeeds('f1')).css);
const readTokens = () => {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map(k => [k, cs.getPropertyValue(k).trim()]));
};
let fade = 0;
const FADE_MS = 520;

/**
 * Blend the whole page from the colours it showed (`from`) into the livery just applied,
 * over about half a second: the CSS variables inline, PALETTE and the ground offset for the
 * 3D, every frame. The last frame hands back to the livery's own paint.
 */
function crossfade(from: { css: Record<string, string>; js: Palette; d: Lab }, livery: Livery, css: Record<string, string> | null) {
  const to = { css: readTokens(), js: { ...PALETTE }, d: offset };
  const root = document.documentElement.style;
  const blend = TOKENS.map(k => {
    const a = from.css[k], b = to.css[k];
    return [k, isHex(a) && isHex(b) ? (t: number) => mix(a, b, t) : (t: number) => (t < 0.5 ? a : b)] as const;
  });
  const keys = Object.keys(to.js) as Array<keyof Palette>;
  const frame = (e: number) => {
    for (const [k, f] of blend) root.setProperty(k, f(e));
    for (const k of keys) PALETTE[k] = mix(from.js[k], to.js[k], e);
    offset = from.d.map((v, i) => v + (to.d[i] - v) * e) as Lab;
  };
  applied = TOKENS.slice(); // the blend writes every variable; the last paint removes what the livery doesn't set
  frame(0); // in the same task as the livery's paint, so nothing flashes
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / FADE_MS);
    if (k < 1) {
      frame(1 - (1 - k) ** 3);
      frameFns.forEach(f => f());
      fade = requestAnimationFrame(step);
      return;
    }
    fade = 0;
    paint(livery, css);
    Object.assign(PALETTE, to.js);
    offset = to.d;
    frameFns.forEach(f => f());
    settledFns.forEach(f => f());
  };
  fade = requestAnimationFrame(step);
}

/**
 * Switch livery, or (with `seeds`) change the visitor's own colours. With `fade` (a pick,
 * not a drag) the page crossfades into it, unless motion is off. A switch or a pick is
 * stored at once, a drag once it rests.
 */
export function setLivery(livery: Livery, seeds: Seeds = state.seeds, opts: { fade?: boolean } = {}) {
  const fading = !!opts.fade && motionEnabled();
  const from = fading ? { css: readTokens(), js: { ...PALETTE }, d: offset } : null;
  cancelAnimationFrame(fade);
  fade = 0;
  const switched = livery !== state.livery;
  state = { livery, seeds };
  const c = computed(state);
  paint(livery, c.css);
  Object.assign(PALETTE, c.js);
  offset = c.d;
  unsaved = { livery, seeds, vars: c.css ?? undefined };
  if (switched || opts.fade) save();
  stateFns.forEach(f => f());
  clearTimeout(settleTimer);
  if (from) { crossfade(from, livery, c.css); return; }
  if (!frameReq) frameReq = requestAnimationFrame(() => { frameReq = 0; frameFns.forEach(f => f()); });
  settleTimer = window.setTimeout(() => { save(); settledFns.forEach(f => f()); }, 250);
}

/** For React (useSyncExternalStore): the livery state and its subscription. The server always has F1. */
export const liveryStore = {
  subscribe: (fn: () => void) => { stateFns.add(fn); return () => { stateFns.delete(fn); }; },
  get: () => state,
  server: () => SERVER_STATE,
};
