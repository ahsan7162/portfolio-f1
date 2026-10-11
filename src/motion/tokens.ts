// Motion tokens. Motion works like F1 timing:
// scroll is scrubbed with `none`; discrete events land once with `out`; anything
// leaving is quicker and quieter (`in`); clip and circle wipes use `wipe`.
// `settle` is the one bounce in the content, kept for the podium steps only (the
// scroll rail's thumb wobbles too, but that is the scrollbar, not the page).
export const EASE = {
  none: 'none',
  out: 'expo.out',
  in: 'power2.in',
  wipe: 'expo.inOut',
  settle: 'back.out(1.15)',
} as const;

// hit: hover, press, toggles (also CSS --dur-hit). split: UI events (menu rows,
// dialog content, Lap stage swap). wipe: short clip wipes. open and close: the
// dialog wipes, between the original 0.8 s and the 0.45 s that felt rushed (the
// menu times its own steps in Nav.tsx). reveal: one-off scroll reveals. show:
// intro and hero only.
export const DUR = { hit: 0.15, split: 0.3, wipe: 0.45, close: 0.4, open: 0.65, reveal: 0.9, show: 1.6 } as const;
export const STAGGER = { char: 0.015, word: 0.04, line: 0.08, card: 0.08 } as const;
