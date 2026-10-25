// Motion tokens. Scroll is scrubbed with `none`; discrete events land once with `out`;
// anything leaving is quicker and quieter (`in`); clip and circle wipes use `wipe`.
// `settle` is the one bounce in the content, kept for the podium steps.
export const EASE = {
  none: 'none',
  out: 'expo.out',
  in: 'power2.in',
  wipe: 'expo.inOut',
  settle: 'back.out(1.15)',
  /** The helmet's scrubbed flight between two layout boxes (gl/flight): eases out of one, into the next. */
  fly: 'power1.inOut',
} as const;

// hit: hover, press, toggles (also CSS --dur-hit). split: UI events (menu rows, dialog
// content, the Lap's stage swap). wipe: short clip wipes. open and close: the dialog wipes
// (the menu times its own steps, nav/motion.ts). reveal: one-off scroll reveals. show: the
// intro and the hero only.
export const DUR = { hit: 0.15, split: 0.3, wipe: 0.45, close: 0.4, open: 0.65, reveal: 0.9, show: 1.6 } as const;
export const STAGGER = { char: 0.015, word: 0.04, line: 0.08, card: 0.08 } as const;
