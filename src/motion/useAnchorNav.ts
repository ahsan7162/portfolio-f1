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
    // Deep link: jump now (the sections' pins already exist; Lenis may not yet, so this
    // one can be the browser's own), on the next frame, and after every ScrollTrigger
    // refresh until the visitor takes over. On the prerendered page the browser has
    // already jumped, to where the target was before the pin spacers moved it, and each
    // later refresh (fonts, the fit sections' rebuild) lifts the pins while it measures,
    // which clamps the scroll to the shorter page for a moment.
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
