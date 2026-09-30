import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '@/motion/gsap';
import { EASE } from '@/motion/tokens';
import { loaderWanted, playIntro, skipIntro } from '@/motion/intro';
import { useSmoothScroll } from '@/motion/SmoothScroll';

/**
 * F1 start sequence: five lights on, hold, lights out, then the overlay wipes
 * up and the hero reveal plays. The h1 is already rendered underneath, so the
 * loader never delays the page content.
 */
export function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  const { lock, unlock } = useSmoothScroll();

  useLayoutEffect(() => {
    // An inline script in index.html adds `intro` to <html> before first paint
    // when the loader should run, so the overlay never shows without JS.
    if (!loaderWanted() || !document.documentElement.classList.contains('intro')) {
      document.documentElement.classList.remove('intro');
      setShow(false);
      skipIntro();
      return;
    }
    const root = ref.current!;
    const lights = root.querySelectorAll<HTMLElement>('[data-light]');
    lock();
    const fontsOrTimeout = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 1200))]);
    const tl = gsap.timeline({ paused: true });
    tl.to(lights, { opacity: 1, duration: 0.08, stagger: 0.16, ease: 'none' })
      .to(lights, { opacity: 0.08, duration: 0.05 }, '+=0.3')
      .add(() => playIntro(), '+=0.02')
      .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: EASE.wipe }, '<')
      .add(() => { unlock(); document.documentElement.classList.remove('intro'); setShow(false); });
    fontsOrTimeout.then(() => tl.play());
    return () => { tl.kill(); unlock(); };
  }, [lock, unlock]);

  if (!show) return null;
  return (
    <div ref={ref} data-intro aria-hidden="true" className="fixed inset-0 z-[80] hidden place-items-center bg-carbon" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
      <div className="flex gap-3 md:gap-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md bg-[#18181b] p-2 md:gap-3 md:p-3">
            <span className="block size-6 rounded-full bg-[#2a0a0e] md:size-10" />
            <span data-light className="block size-6 rounded-full bg-ac opacity-[0.08] md:size-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
