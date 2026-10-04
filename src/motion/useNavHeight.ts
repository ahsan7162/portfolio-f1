import { useEffect, type RefObject } from 'react';

/** The nav's height in px, as last written to --navh (64 until the nav has measured itself). */
export const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navh')) || 64;

/** Keeps --navh in sync with the nav's real height (anchor offsets, pins). */
export function useNavHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--navh', `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}
