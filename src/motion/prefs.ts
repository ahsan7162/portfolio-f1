const q = () => (typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search));

export const isBrowser = () => typeof window !== 'undefined';

/** Motion is on unless the OS asks for reduced motion or `?nomotion` is set. */
export function motionEnabled() {
  if (!isBrowser()) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !q().has('nomotion');
}

export const debug = () => isBrowser() && q().has('debug');

/** WebGL scenes: off for reduced motion, Save-Data, weak devices, or `?nogl`. */
export function glEnabled() {
  if (!motionEnabled() || q().has('nogl')) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 4) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const isTouch = () => isBrowser() && window.matchMedia('(hover: none)').matches;
export const isMobile = () => isBrowser() && window.matchMedia('(max-width: 767px)').matches;
