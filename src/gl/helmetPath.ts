import { gsap, ScrollTrigger } from '@/motion/gsap';
import { debug, SHORT_SCREEN } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';

// Where the helmet sits in each section, in viewport terms:
//   x, y: -1..1 of half the viewport (0 = centre), s: scale, rx/ry/rz: radians.
// GSAP scrubs a plain object between these poses; the renderer copies it onto
// the 3D group every frame, so React never re-renders for it.
export type Pose = { x: number; y: number; s: number; rx: number; ry: number; rz: number };

const DESKTOP: Record<string, Pose> = {
  hero:    { x: 0.56, y: -0.1,  s: 0.92, rx: 0.08, ry: -0.65, rz: 0.02 },
  about:   { x: 0.6,  y: 0.05,  s: 0.72, rx: 0.12, ry: -2.1,  rz: -0.05 },
  about2:  { x: 0.62, y: 0.12,  s: 0.72, rx: 0.02, ry: -3.3,  rz: 0.04 },
  away:    { x: 1.45, y: 0.55,  s: 0.55, rx: 0.3,  ry: -4.2,  rz: 0.2 },
  results: { x: 0.56, y: -0.05, s: 0.9,  rx: 0.04, ry: -7.85, rz: 0 },
  exit:    { x: 0.4,  y: -1.7,  s: 0.45, rx: 0.6,  ry: -9.2,  rz: 0.3 },
};

const MOBILE: Record<string, Pose> = {
  hero:    { x: 0.32, y: 0.56,  s: 0.5,  rx: 0.1,  ry: -0.7,  rz: 0 },
  about:   { x: 0.55, y: 0.62,  s: 0.45, rx: 0.1,  ry: -2.1,  rz: 0 },
  about2:  { x: 0.55, y: 0.62,  s: 0.45, rx: 0.1,  ry: -3.3,  rz: 0 },
  away:    { x: 1.5,  y: 0.8,   s: 0.4,  rx: 0.3,  ry: -4.2,  rz: 0 },
  results: { x: 0.45, y: 0.55,  s: 0.55, rx: 0.05, ry: -7.85, rz: 0 },
  exit:    { x: 0.4,  y: -1.8,  s: 0.35, rx: 0.6,  ry: -9.2,  rz: 0 },
};

const SEGMENTS: Array<{ from: string; to: string; trigger: string; start: string; end: string; endTrigger?: string }> = [
  { from: 'hero', to: 'about', trigger: '#about', start: 'top bottom', end: 'top top' },
  { from: 'about', to: 'about2', trigger: '#about [data-pin]', start: 'top top', end: '+=120%' },
  // The Lap's 3D track takes over the stage, so the helmet flies off as it arrives.
  { from: 'about2', to: 'away', trigger: '#timeline', start: 'top 85%', end: 'top 20%' },
  // Results and education: the base path turns toward the finale pose across the
  // section; on the way the helmet perches on the P3 step (see `perch` below).
  { from: 'away', to: 'results', trigger: '#results', start: 'top bottom', endTrigger: '#results [data-bignum]', end: 'center 60%' },
  { from: 'results', to: 'exit', trigger: '#results', start: 'bottom 85%', end: 'bottom top' },
];

/**
 * The driver on the podium: while `k` is above 0 the Stage pulls the helmet onto
 * `el` (the P3 step), reading its screen position every frame so it rides along
 * with the page. `k` is scrubbed: it lands as the step comes into view and lifts
 * off to the base path as the step scrolls away.
 */
export const perch = { k: 0, el: null as HTMLElement | null };

export function bindHelmetPath(pose: Pose) {
  const mm = gsap.matchMedia();
  // Tablets use the phone poses: their text runs the full width, so the side-by-side poses would cover it.
  mm.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)', short: SHORT_SCREEN }, ctx => {
    const P = ctx.conditions?.desktop ? DESKTOP : MOBILE;
    // Short screens don't pin About (see About.tsx): spin while the statement passes the top
    // instead, between the hero-to-About move and the next one so they never overlap.
    const segments = ctx.conditions?.short
      ? SEGMENTS.map(s => (s.to === 'about2' ? { ...s, trigger: '#about [data-statement]', start: 'top 20%', end: 'bottom 35%' } : s))
      : SEGMENTS;
    Object.assign(pose, P.hero);
    segments.forEach((seg, i) => {
      if (!document.querySelector(seg.trigger)) return;
      gsap.fromTo(pose, { ...P[seg.from] }, {
        ...P[seg.to], ease: 'power1.inOut', immediateRender: i === 0,
        scrollTrigger: { trigger: seg.trigger, endTrigger: seg.endTrigger, start: seg.start, end: seg.end, scrub: 1, markers: debug() },
      });
    });
    perch.el = document.querySelector<HTMLElement>('[data-p3step]');
    perch.k = 0;
    if (perch.el) {
      const st = { trigger: perch.el, scrub: 1.2, markers: debug() };
      // Land as the section arrives, so it is already seated when the row is on screen.
      gsap.fromTo(perch, { k: 0 }, { k: 1, ease: EASE.none, immediateRender: false, scrollTrigger: { ...st, trigger: '#results', start: 'top bottom', endTrigger: perch.el, end: 'top 75%' } });
      // Lift off slowly: glide from the step to the finale pose, landing as 450+ does.
      gsap.fromTo(perch, { k: 1 }, { k: 0, ease: EASE.none, immediateRender: false, scrollTrigger: { ...st, start: 'top 25%', endTrigger: '#results [data-bignum]', end: 'center 60%' } });
    }
    // These triggers were created after the sections' own pins: re-sort by page position.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
  return () => { mm.revert(); perch.k = 0; perch.el = null; };
}
