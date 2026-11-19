// Names the data refers to. No browser code and no styles here, so tests and build scripts can import it.

/** Every live screen (a screen drawn in code). stage/live.tsx must draw each one. */
export const LIVE_NAMES = ['dash:sales', 'dash:branch', 'dash:bench', 'dash:orders', 'dash:pricing'] as const;
export type LiveName = (typeof LIVE_NAMES)[number];

/** How many scenes a live demo can play by itself, by stage. A `scenes` block must have exactly this many. */
export const SCENES: Partial<Record<string, number>> = { 'dash-demo': 4, 'md-demo': 4 };
