/** Run `cb` once the browser is idle, `timeout` ms at the latest; without requestIdleCallback, after `fallback` ms. */
export const whenIdle = (cb: () => void, timeout: number, fallback: number) =>
  'requestIdleCallback' in window ? requestIdleCallback(cb, { timeout }) : setTimeout(cb, fallback);
