import { useState } from 'react';
import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { Scramble } from '@/components/Scramble';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { useSectionMotion } from '@/motion/useSectionMotion';

export const SECTIONS = [
  ['top', 'Start'], ['about', 'About'], ['timeline', 'Timeline'], ['experience', 'Experience'],
  ['projects', 'Projects'], ['skills', 'Tech stack'], ['results', 'Results'],
  ['contact', 'Finish'],
] as const;

/**
 * Decorative page-progress map: a dot laps the circuit as you scroll the page
 * (desktop), a thin bar on phones. Transform-only, scrubbed to scroll.
 */
export function TrackMap() {
  const [name, setName] = useState('Start');
  const ref = useSectionMotion<HTMLDivElement>(({ q, desktop }) => {
    const whole = { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true } as const;
    if (desktop) {
      const track = q<SVGPathElement>('[data-track]')!;
      // The dot crosses the start/finish line as Contact arrives, not at the very bottom.
      const contact = document.getElementById('contact');
      const lap = contact ? { ...whole, endTrigger: contact, end: 'top 60%' } : whole;
      gsap.to(q('[data-dot]'), { ease: 'none', scrollTrigger: lap, motionPath: { path: track, align: track, alignOrigin: [0.5, 0.5] } });
    }
    gsap.fromTo(q('[data-bar]'), { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: whole });
    // Hidden over the hero; slides in once the hero scrolls away.
    const hero = document.getElementById('top');
    if (hero) gsap.fromTo(q('[data-mapin]'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'bottom 85%', end: 'bottom 55%', scrub: true } });
    // Step aside at the finish so it never covers the footer.
    const contact = document.getElementById('contact');
    if (contact) gsap.to(q('[data-map]'), { autoAlpha: 0, y: 20, ease: 'none', scrollTrigger: { trigger: contact, start: 'top 60%', end: 'top 30%', scrub: true } });
    SECTIONS.forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (el) ScrollTrigger.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', refreshPriority: -1, onToggle: s => { if (s.isActive) setName(label); } });
    });
  });

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none">
      <div data-bar className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-ac lg:hidden" />
      <div data-map className="fixed bottom-5 left-5 z-40 hidden w-[132px] lg:block">
        {/* Starts hidden; motion reveals it. With reduced motion it stays out of the way. */}
        <div data-mapin className="invisible opacity-0">
        <svg viewBox={CIRCUIT_VIEWBOX} fill="none" className="w-full overflow-visible">
          <path data-track d={CIRCUIT_PATH} stroke="rgb(244 244 237 / 0.35)" strokeWidth="6" strokeLinejoin="round" />
          <circle data-dot r="10" fill="var(--ac)" />
        </svg>
        {/* Scrambles into the new name whenever the section changes. */}
        <Scramble text={name} className="mt-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-mute" />
        </div>
      </div>
    </div>
  );
}
