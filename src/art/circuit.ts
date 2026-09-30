// One hand-authored fictional F1 circuit. Closed loop in a 400 x 260 box.
// Used by: hero line drawing, About underline, TrackMap, and (sampled into 3D)
// the WebGL lap tube.
export const CIRCUIT_VIEWBOX = '0 0 400 260';

export const CIRCUIT_PATH =
  'M 58 196 ' +
  'C 40 196 28 184 28 166 ' +
  'L 28 118 ' +
  'C 28 96 44 84 64 84 ' +
  'L 118 84 ' +
  'C 136 84 146 72 150 56 ' +
  'C 155 36 170 26 192 28 ' +
  'L 300 36 ' +
  'C 330 38 350 58 350 84 ' +
  'C 350 104 336 116 318 118 ' +
  'L 262 124 ' +
  'C 246 126 240 138 250 150 ' +
  'L 300 190 ' +
  'C 330 212 370 206 372 226 ' +
  'C 374 244 356 250 336 248 ' +
  'L 190 236 ' +
  'C 170 234 160 222 150 212 ' +
  'C 138 200 124 196 106 196 ' +
  'Z';

/** A short open stretch (the "fix it" underline). */
export const SWOOSH_PATH = 'M 4 22 C 60 30 120 6 180 12 C 230 17 262 30 300 18 L 340 6';

/** Sector split points along the lap, as progress 0..1. */
export const SECTORS = [0, 0.34, 0.68] as const;
