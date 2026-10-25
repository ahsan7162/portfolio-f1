import { useEffect, useRef, type ReactNode } from 'react';
import { onPalette } from '@/art/palette';
import { finished, type Fx, makeFx, replayOnHover, SceneSvg, sceneText } from '@/components/scene-kit';
import { ensureGsap, gsap, ScrollTrigger } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';

/**
 * A featured project's scene. The markup is its last frame, so it reads the same
 * prerendered and with motion off. With motion it plays when the card comes into view,
 * then loops (desktop) only while on screen; hovering a resting card replays it.
 * Touch screens play it once.
 */
export function LoopingScene({ build, children }: { build: (fx: Fx) => void; children: ReactNode }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !motionEnabled()) return;
    ensureGsap();
    const touch = isTouch();
    const text = sceneText();
    let tl!: gsap.core.Timeline;
    let started = false;
    // A wrapper can hold the first play back (Projects: until its reveal curtain has lifted).
    const delay = Number(svg.closest<HTMLElement>('[data-scene-delay]')?.dataset.sceneDelay ?? 0);
    const scene = () => gsap.context(() => {
      tl = gsap.timeline({ paused: true, delay, repeat: touch ? 0 : -1, repeatDelay: 2.5, defaults: { ease: EASE.out, duration: 0.4 }, onRepeat: text.toStart });
      build(makeFx(svg, tl, text));
      tl.progress(0);
      text.toStart();
      ScrollTrigger.create({
        trigger: svg, start: 'top 85%', end: 'bottom top',
        onToggle: self => {
          if (!self.isActive) tl.pause();
          else if (!started) { started = true; text.toStart(); tl.restart(true); }
          else tl.resume();
        },
      });
    }, svg);
    let ctx = scene();
    // The timeline holds PALETTE's colours: a livery change rebuilds it once the colours settle.
    const offPalette = onPalette(() => {
      ctx.revert();
      text.toEnd();
      started = false;
      ctx = scene();
    }, true);
    const offHover = replayOnHover(svg, '[data-card]', () => { if (started && finished(tl)) { text.toStart(); tl.restart(); } });
    return () => {
      offPalette();
      offHover();
      ctx.revert();
      text.toEnd();
    };
  }, [build]);
  return <SceneSvg ref={ref}>{children}</SceneSvg>;
}
