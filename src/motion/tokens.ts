// Motion tokens, from the interaction thesis (docs/GSAP-ENHANCEMENTS.md, section 0):
// scroll is scrubbed with `none`; discrete events land once with `out`; anything
// leaving is quicker and quieter (`in`); clip and circle wipes use `wipe`.
// `settle` is the one bounce on the page, kept for the podium steps only.
export const EASE = {
  none: 'none',
  out: 'expo.out',
  in: 'power2.in',
  wipe: 'expo.inOut',
  settle: 'back.out(1.15)',
} as const;

// hit: hover, press, toggles (also CSS --dur-hit). split: UI events (menu rows,
// dialog content, Lap stage swap). wipe: menu and dialog open wipes (UI stays
// under 500 ms). reveal: one-off scroll reveals. show: intro and hero only.
export const DUR = { hit: 0.15, split: 0.3, wipe: 0.45, reveal: 0.9, show: 1.6 } as const;
export const STAGGER = { char: 0.015, word: 0.04, line: 0.08, card: 0.08 } as const;
