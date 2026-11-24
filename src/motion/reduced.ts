/**
 * The OS asks for reduced motion: the one place both pages read it. Its own module, so the
 * products pages don't load the portfolio's other preferences (prefs.ts) with it.
 */
export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
