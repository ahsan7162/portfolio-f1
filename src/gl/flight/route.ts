import { DROP, HOOK, type Bend } from './bezier';

// The helmet's route down the page, as data (the motion is flight.ts). Anchors are
// layout boxes marked [data-helmet-anchor] (the helmet lands in them and scrolls with
// them), or virtual boxes in viewport terms (off-screen while the Lap has the canvas).
// Windows run back to back down the page: each starts where the last one ended, so two
// moves never write the helmet at once. A window whose `from` and `to` are the same
// anchor is a hold (it can still turn the helmet).

export type AnchorId = 'hero' | 'slot' | 'away' | 'podium' | 'finale' | 'parc';

/** Where a window ends, in scroll terms. */
export type End =
  | { trigger: string; start: string } // a ScrollTrigger start, e.g. '#about', 'top bottom'
  | { pin: string; at: 'start' | 'end'; offsetVh?: number }; // the pin on this element

/** rx, ry, rz in radians. */
export type Rot = readonly [number, number, number];

/** `rot` is the helmet's rotation when the window ends; it turns there from the last window's. */
export type Window = { from: AnchorId; to: AnchorId; end: End; bend?: Bend; rot: Rot };

/**
 * How the helmet sits in each anchor: its width as a share of the box, centred in it or
 * standing on its top edge, and how much of the pointer tilt and the float it keeps.
 */
export const ANCHOR: Record<AnchorId, { fill: number; stand?: boolean; loose: number }> = {
  hero: { fill: 1, loose: 1 },
  slot: { fill: 1, loose: 0.5 },
  away: { fill: 1, loose: 0 },
  podium: { fill: 0.95, stand: true, loose: 0 },
  finale: { fill: 1, loose: 1 },
  parc: { fill: 1, loose: 1 },
};

/** The virtual anchors: centre as fractions of the viewport, size in viewport heights. */
export const VIRTUAL: Partial<Record<AnchorId, { x: number; y: number; size: number }>> = {
  away: { x: 1.3, y: 0.3, size: 0.35 },
};

/** The rotation before the first window ends: the hero's. */
export const START_ROT: Rot = [0.08, -0.65, 0.02];

const PIN = '#about [data-pin]';

export const ROUTE: Window[] = [
  { from: 'hero', to: 'hero', end: { trigger: '#about', start: 'top bottom' }, rot: START_ROT },
  // Down into the About sentence, over its lines, landing in the slot after "fast.".
  { from: 'hero', to: 'slot', end: { pin: PIN, at: 'start' }, bend: DROP, rot: [0.12, -2.1, -0.05] },
  // Held in the sentence while it lights up, turning slowly.
  { from: 'slot', to: 'slot', end: { pin: PIN, at: 'end', offsetVh: -0.3 }, rot: [0.02, -3.3, 0.04] },
  // Out to the side as the Lap's 3D track takes over the canvas.
  { from: 'slot', to: 'away', end: { trigger: '#timeline', start: 'top 40%' }, bend: HOOK, rot: [0.3, -4.2, 0.2] },
  { from: 'away', to: 'away', end: { trigger: '#results', start: 'top bottom' }, rot: [0.3, -4.2, 0.2] },
  // Onto the P3 step of the podium, as it builds.
  { from: 'away', to: 'podium', end: { trigger: '[data-p3step]', start: 'top 75%' }, bend: DROP, rot: [0.12, -7.55, 0] },
  { from: 'podium', to: 'podium', end: { trigger: '[data-p3step]', start: 'top 40%' }, rot: [0.12, -7.55, 0] },
  // Beside 450+ (timed on the number itself, so the hold keeps its length at every
  // screen size), then down into the footer. The last window is cut at the page's end
  // (flight.ts), so the helmet always lands.
  { from: 'podium', to: 'finale', end: { trigger: '[data-bignum]', start: 'center 60%' }, bend: HOOK, rot: [0.04, -7.85, 0] },
  { from: 'finale', to: 'finale', end: { trigger: '[data-bignum]', start: 'center 25%' }, rot: [0.04, -7.85, 0] },
  // Parc fermé: down into the footer, turning almost a full circle back to the hero's
  // pose, parked as the page ends: the lap ends the way it began.
  { from: 'finale', to: 'parc', end: { trigger: '#contact', start: 'bottom bottom' }, bend: DROP, rot: [START_ROT[0], START_ROT[1] - Math.PI * 4, START_ROT[2]] },
];

/** Short screens don't pin About: the helmet lands in the sentence as it passes instead. */
export const SHORT_ENDS: Partial<Record<number, End>> = {
  1: { trigger: '#about [data-statement]', start: 'top 60%' },
  2: { trigger: '#about [data-statement]', start: 'bottom 35%' },
};
