import { useEffect, type RefObject } from 'react';
import { lapTime } from '@/lib/format';
import { gsap } from '@/motion/gsap';
import { magnet } from '@/motion/pointer';
import { motionEnabled } from '@/motion/prefs';
import { batchReveal, drawPath, inView } from '@/motion/reveals';
import { gridSlot } from '@/motion/split';
import { DUR, EASE } from '@/motion/tokens';
import type { MotionCtx } from '@/motion/useSectionMotion';

/** The finish's motion: the signed headline, the visitor's lap time, the frame coming up around the card. */
export function buildContact({ root, q, qa, onRevert }: MotionCtx) {
  const title = q('[data-ctitle]')!;
  gridSlot(title, { start: 'top 92%', end: 'top 50%' });

  // The visitor's real time on the page so far, frozen as their lap time.
  const clock = q('[data-lapclock]')!, total = q('[data-laptotal]')!;
  const freeze = () => {
    clock.textContent = lapTime(performance.now() / 1000);
    total.hidden = false;
    gsap.fromTo(total, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out });
  };
  onRevert(() => { total.hidden = true; clock.textContent = ''; });

  // The hero's circuit draws itself over the headline, then a light runs one lap of it; the
  // time freezes as it crosses the line.
  const light = q('[data-siglight]');
  const sig = gsap.timeline({ scrollTrigger: inView(title, { start: 'top 70%' }) });
  drawPath(q('[data-sig]'), { timeline: sig });
  sig.fromTo(q('[data-sigline]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: DUR.split }, '-=0.4')
    .fromTo(light, { strokeDashoffset: 0, autoAlpha: 1 }, { strokeDashoffset: -1, duration: 1.3, ease: 'power1.inOut', immediateRender: false }, '-=0.35')
    .add(freeze)
    .fromTo(q('[data-tabflash]'), { autoAlpha: 0.9 }, { autoAlpha: 0, duration: DUR.wipe, ease: EASE.out, immediateRender: false }, '<')
    .to(light, { autoAlpha: 0, duration: DUR.split });

  batchReveal(qa('[data-flink]'), { y: 16, stagger: 0.04 });
  onRevert(magnet(q('[data-cta]'), q('[data-ctamag]'), 0.3));

  // The frame's red comes up as the footer arrives, then the tab and the notches slide in,
  // locked to the scroll and done as the page ends.
  gsap.timeline({ defaults: { ease: EASE.none }, scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } })
    .fromTo(q('[data-fframe]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, 0)
    .fromTo(q('[data-ftab]'), { yPercent: -101 }, { yPercent: 0, duration: 0.3 }, 0.55)
    .fromTo(q('[data-fnotch="l"]'), { xPercent: -101 }, { xPercent: 0, duration: 0.35 }, 0.65)
    .fromTo(q('[data-fnotch="r"]'), { xPercent: 101 }, { xPercent: 0, duration: 0.35 }, 0.65);
}

/** Without motion the lap time still freezes, just without the light, when the footer shows. */
export function useStaticLapTime(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || motionEnabled()) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      root.querySelector('[data-lapclock]')!.textContent = lapTime(performance.now() / 1000);
      root.querySelector<HTMLElement>('[data-laptotal]')!.hidden = false;
    }, { threshold: 0.5 });
    io.observe(root);
    return () => io.disconnect();
  }, [ref]);
}
