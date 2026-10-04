// The site's colours for code that can't read CSS: SVG attributes, canvas paint,
// three.js materials and GLSL. The same values are the CSS variables at the top of
// src/index.css; change both together.
export const PALETTE = {
  carbon: '#0b0b0c',
  graphite: '#111113',
  /** Raised panels (the hero's lower gradient stop, the project scenes' windows). */
  panel: '#141417',
  /** The darkest ground: the Lap's 3D scene and the footer. */
  pit: '#070708',
  fg: '#f4f4ed',
  mute: '#a3a39c',
  ac: '#ff2438',
} as const;
