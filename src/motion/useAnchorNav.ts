import { useEffect } from 'react';
import { ScrollTrigger } from './gsap';
import { finishRevealsAbove } from './patterns';
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
      if (id) finishRevealsAbove(el.getBoundingClientRect().top + window.scrollY);
      scrollTo(id ? el : 0);
      history.replaceState(null, '', id ? `#${id}` : location.pathname);
      window.setTimeout(() => el.focus({ preventScroll: true }), 900);
    };
    document.addEventListener('click', onClick);
    // Deep link: jump now, then again after ScrollTrigger measures the pins
    // (pin spacers change the page height, so the first position is stale).
    let off = () => {};
    const el = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (el) {
      const jump = () => { finishRevealsAbove(el.getBoundingClientRect().top + window.scrollY); scrollTo(el, { immediate: true }); };
      requestAnimationFrame(jump);
      const onRefresh = () => { jump(); off(); };
      ScrollTrigger.addEventListener('refresh', onRefresh);
      off = () => ScrollTrigger.removeEventListener('refresh', onRefresh);
    }
    return () => { document.removeEventListener('click', onClick); off(); };
  }, [scrollTo]);
}
