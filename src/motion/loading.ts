// What the first-visit loader waits for. Each part reports in when it is done;
// the loader's lights and counter follow the weighted share that has.
// The 3D isn't one of them: the helmet runs its own reveal once it is ready
// (Stage.ts), so a slow device never holds the start for it.
const PARTS = {
  fonts: { weight: 1, label: 'Fonts' },
  page: { weight: 1, label: 'Page assets' },
} as const;

export type LoadPart = keyof typeof PARTS;

const done = new Set<LoadPart>();
const TOTAL = Object.values(PARTS).reduce((s, p) => s + p.weight, 0);

export function loaded(part: LoadPart) { done.add(part); }

/** 0 to 1. */
export function loadProgress() {
  let n = 0;
  for (const p of done) n += PARTS[p].weight;
  return n / TOTAL;
}

/** The first part still loading, for the loader's caption (null once everything is in). */
export function loadingNow(): string | null {
  const p = (Object.keys(PARTS) as LoadPart[]).find(k => !done.has(k));
  return p ? PARTS[p].label : null;
}

if (typeof window !== 'undefined') {
  void (document.fonts?.ready ?? Promise.resolve()).then(() => loaded('fonts'));
  if (document.readyState === 'complete') loaded('page');
  else window.addEventListener('load', () => loaded('page'), { once: true });
}
