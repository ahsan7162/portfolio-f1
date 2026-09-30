// Shared timing, taken from what landonorris.com uses: expo/power curves, no
// overshoot on text. `settle` is only for small objects (podium steps, dots).
export const EASE = {
  out: 'expo.out',
  inOut: 'power4.inOut',
  soft: 'power3.out',
  wipe: 'expo.inOut',
  settle: 'back.out(1.15)',
  none: 'none',
} as const;

export const DUR = { xs: 0.35, s: 0.6, m: 0.9, l: 1.2, xl: 1.6 } as const;
export const STAGGER = { char: 0.015, word: 0.04, line: 0.08, card: 0.08 } as const;
