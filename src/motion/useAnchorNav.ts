import { useEffect } from 'react';
import { useSmoothScroll } from './SmoothScroll';

/** In-page links scroll with Lenis, then move focus to the section for keyboard users. */
export function useAnchorNav() {
  const { scrollTo } = useSmoothScroll();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      const id = a.getAttribute('href')!.slice(1);
      const el = id ? document.getElementById(id) : document.body;
      if (!el) return;
      e.preventDefault();
      scrollTo(id ? el : 0);
      history.replaceState(null, '', id ? `#${id}` : location.pathname);
      window.setTimeout(() => el.focus({ preventScroll: true }), 900);
    };
    document.addEventListener('click', onClick);
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) requestAnimationFrame(() => scrollTo(el, { immediate: true }));
    }
    return () => document.removeEventListener('click', onClick);
  }, [scrollTo]);
}
