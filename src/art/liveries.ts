// The liveries as colours: F1 (chalk and red, the CSS defaults), Barça (the 25/26 third
// kit, under html[data-theme]), a few more made from five colours each, and a visitor's own
// five. From five colours every other shade is derived (derive), kept readable (fit).
// The F1 values are the CSS variables at the top of src/index.css: change both together.

import { ensureContrast, fromLch, hexToLab, isHex, labToHex, toLch, withAlpha } from './colour';

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

export const BARCA: Palette = { ...F1, letter: '#d8b866', ac: '#9061f9', ac2: '#d8b866', lampOff: '#1d0f3a' };

/** The five colours a visitor picks. Every other shade follows from them (derive). */
export type Seeds = { ground: string; fg: string; ac: string; ac2: string; letter: string };
export type Role = keyof Seeds;

const seedsOf = (p: Palette): Seeds => ({ ground: p.carbon, fg: p.fg, ac: p.ac, ac2: p.ac2, letter: p.letter });
const CHALK = F1.fg, CARBON = F1.carbon;

/** The ready-made liveries. F1 and Barça are hand-tuned in index.css; the rest are derived like a visitor's own. */
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
export const isLivery = (x: unknown): x is Livery => x === 'custom' || LIVERIES.some(l => l.id === x);

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
const GROUND = { l: [0.1, 0.26], c: 0.06 } as const;

const F1_CARBON = hexToLab(F1.carbon);
export type Lab = [number, number, number];

/** The F1 ground shade `hex`, moved by `d` (the picked ground's offset from F1's carbon) in OKLab. */
export const shifted = (hex: string, d: Lab) => labToHex(hexToLab(hex).map((v, i) => v + d[i]) as Lab);

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

const SEED_ROLES: Role[] = ['ground', 'fg', 'ac', 'ac2', 'letter'];
/** Five colours this page can paint (a stored value is checked before it is used). */
export const isSeeds = (x: unknown): x is Seeds =>
  typeof x === 'object' && x !== null && SEED_ROLES.every(r => isHex(String((x as Record<string, unknown>)[r])));
