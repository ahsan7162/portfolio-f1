import { useEffect } from 'react';
import { ScrollTrigger } from './gsap';
import { finishRevealsAbove } from './reveals';
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
    // Deep link: jump now, on the next frame, and after every ScrollTrigger refresh until
    // the visitor takes over. The browser's own jump landed before the pin spacers moved the
    // target, and each refresh lifts the pins while it measures, clamping the scroll for a moment.
    let off = () => {};
    const el = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (el) {
      const jump = () => { finishRevealsAbove(el.getBoundingClientRect().top + window.scrollY); scrollTo(el, { immediate: true }); };
      jump();
      requestAnimationFrame(jump);
      const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
      const release = () => off();
      ScrollTrigger.addEventListener('refresh', jump);
      inputs.forEach(e => window.addEventListener(e, release, { passive: true }));
      off = () => {
        ScrollTrigger.removeEventListener('refresh', jump);
        inputs.forEach(e => window.removeEventListener(e, release));
      };
    }
    return () => { document.removeEventListener('click', onClick); off(); };
  }, [scrollTo]);
}
