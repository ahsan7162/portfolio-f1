import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { lapState } from '@/gl/state';
import { glEnabled } from '@/motion/prefs';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { useSectionMotion } from '@/motion/useSectionMotion';

const SECTOR_NAMES = ['S1', 'S2', 'S3'];

/**
 * Decorative 3D lap: a pinned stretch where the WebGL camera flies along the
 * circuit. Without WebGL the same circuit draws itself in SVG instead.
 */
export function Lap() {
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, markers }) => {
    const sectorEls = qa('[data-sector]');
    const svgPath = q('[data-lapsvg] path');
    const flat = !glEnabled();
    if (flat) gsap.set(svgPath, { drawSVG: '0%' });
    ScrollTrigger.create({
      trigger: q('[data-lappin]'), start: 'top top', end: '+=160%', pin: true, scrub: true, markers,
      onToggle: self => { lapState.active = self.isActive; },
      onUpdate: self => {
        lapState.progress = self.progress;
        const s = Math.min(2, Math.floor(self.progress * 3));
        sectorEls.forEach((el, i) => el.classList.toggle('text-ac', i === s));
        if (flat) gsap.set(svgPath, { drawSVG: `${(self.progress * 100).toFixed(1)}%` });
      },
    });
    gsap.from(q('[data-lapmeta]'), { autoAlpha: 0, y: 20, scrollTrigger: { trigger: root, start: 'top 60%', once: true } });
  });

  return (
    <section ref={ref} aria-hidden="true" data-bg="#070708,#0b0b0c" data-lap className="relative">
      <div data-lappin className="relative flex h-[100dvh] items-center justify-center overflow-hidden px-4 md:px-8">
        <svg data-lapsvg viewBox={CIRCUIT_VIEWBOX} fill="none" className="lap-flat w-[min(900px,92vw)]">
          <path d={CIRCUIT_PATH} stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div data-lapmeta className="absolute inset-x-4 bottom-8 mx-auto flex max-w-[1400px] items-end justify-between font-mono text-xs uppercase tracking-[0.14em] text-mute md:inset-x-8">
          <span>Lap 01</span>
          <span className="flex gap-4">{SECTOR_NAMES.map(s => <span key={s} data-sector className="transition-colors duration-300">{s}</span>)}</span>
        </div>
      </div>
    </section>
  );
}
