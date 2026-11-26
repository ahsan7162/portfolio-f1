// Back to top: a round frosted icon button that shows once `from` reaches the middle of the screen (shell.css .pp-up);
// the middle, not the top, so it still shows where the page ends before `from` could reach the top (the catalogue on
// a phone). Used by the main page and the detail page; it takes the page back up, then focuses its heading (the
// hero's is hidden while off screen, so focus waits for the scroll to land).
import { useEffect, useState } from 'react';
import { reducedMotion } from './motion';
import { focusOn, scrollToY } from './scroll';

export function BackToTop({ from }: { from: string }) {
  const [on, setOn] = useState(false);

  // An observer, not a measured ScrollTrigger: images and demos that load late move `from`, and a stale start left
  // the button hidden on phones. Its box is the top half of the screen; past it counts as shown too.
  useEffect(() => {
    const el = document.querySelector(from);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.boundingClientRect.top < window.innerHeight / 2), { rootMargin: '0px 0px -50% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [from]);

  return (
    <button type="button" className={on ? 'pp-up pp-up--on' : 'pp-up'} aria-label="Back to top" onClick={() => scrollToY(0, reducedMotion(), () => focusOn(document.querySelector('h1')))}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}
