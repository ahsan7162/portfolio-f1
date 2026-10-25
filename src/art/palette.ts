// The live palette, for code that can't read CSS: SVG attributes, canvas paint, three.js
// materials and GLSL. A livery change applies live: the CSS variables on <html>, and PALETTE
// (mutated in place) for code that copied a colour, which re-reads it in onPalette; a pick
// crossfades the whole page. The choice is stored, and index.html applies it before first
// paint. The prerender runs in Node, without a document, and always gets F1: prerendered
// markup colours itself with var(--…) instead of these values.

import { motionEnabled } from '@/motion/prefs';
import { isHex, mix } from './colour';
import { BARCA, derive, F1, isLivery, isSeeds, type Lab, type Livery, type Palette, presetSeeds, type Seeds, shifted } from './liveries';

const STORE_KEY = 'v2-livery';
type Stored = { livery: Livery; seeds?: Seeds; vars?: Record<string, string> };

/** The stored livery, if it is one this page can paint: anything else falls back to F1. */
function read(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Partial<Stored> | null;
    const seeds = isSeeds(s?.seeds) ? s.seeds : undefined;
    if (s && isLivery(s.livery) && (s.livery !== 'custom' || seeds)) return { livery: s.livery, seeds };
  } catch { /* private mode or a bad value */ }
  return { livery: 'f1' };
}

const browser = typeof document !== 'undefined';
const stored: Stored = browser ? read() : { livery: 'f1' };

type LiveryState = { livery: Livery; seeds: Seeds };
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

// index.html painted the stored livery's variables before first paint. Repaint from the
// colours (derive may have changed since), which also clears them if that livery was unusable.
if (browser) {
  applied = TOKENS.filter(k => document.documentElement.style.getPropertyValue(k));
  paint(state.livery, first.css);
}

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
