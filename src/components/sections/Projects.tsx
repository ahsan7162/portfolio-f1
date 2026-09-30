import { MagicCard } from '@/components/ui/magic-card';
import { BorderBeam } from '@/components/ui/border-beam';
import { ProjectVisual } from '@/components/ProjectVisuals';
import { originOf, useDialogs } from '@/components/dialog-context';
import { projects } from '@/content/data';
import { gsap } from '@/motion/gsap';
import { clipReveal, splitReveal } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

// Staggered offsets, like Lando's helmet grid: each card sits at its own height
// and moves at its own scroll speed.
const LAYOUT = [
  { col: 'md:col-span-7', offset: 'md:mt-0', speed: -6 },
  { col: 'md:col-span-5', offset: 'md:mt-40', speed: 8 },
  { col: 'md:col-span-6 md:col-start-4', offset: 'md:-mt-10', speed: -3 },
];

/** The one light section: the page's single deliberate theme switch. */
export function Projects() {
  const { openDetails, openArchive } = useDialogs();
  const ref = useSectionMotion<HTMLElement>(({ q, qa, desktop }) => {
    splitReveal(q('h2'), { type: 'chars' });
    qa<HTMLElement>('[data-card]').forEach((card, i) => {
      clipReveal(card.querySelector('[data-cardvis]'), { trigger: card });
      gsap.from(card.querySelectorAll('[data-cardtxt]'), { autoAlpha: 0, y: 24, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 80%', once: true } });
      if (!desktop) return;
      gsap.fromTo(card, { yPercent: 0 }, { yPercent: LAYOUT[i].speed, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(card.querySelector('[data-cardin]'), { yPercent: -6, scale: 1.08 }, { yPercent: 6, scale: 1.08, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  return (
    <section ref={ref} id="projects" tabIndex={-1} data-bg="#ecebe6,#e2e1db" className="theme-paddock relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(3rem,10vw,9rem)]">Projects</h2>
          <button type="button" onClick={e => openArchive(originOf(e))} className="btn btn-ghost">All projects</button>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:gap-x-8">
          {projects.map((p, i) => (
            <article key={p.id} data-card className={cn(LAYOUT[i].col, LAYOUT[i].offset)}>
              <MagicCard gradientFrom="#ff2438" gradientTo="#141416" gradientColor="rgb(255 36 56 / 0.08)" className="p-0">
                <div data-cardvis className="relative aspect-[16/10] overflow-hidden bg-carbon">
                  <div data-cardin className="h-full w-full"><ProjectVisual project={p} /></div>
                  <span aria-hidden="true" className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a3a39c]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <BorderBeam size={120} duration={9} colorFrom="#ff2438" colorTo="#f4f4ed" className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <div className="p-6 md:p-8">
                  <h3 data-cardtxt className="display text-3xl md:text-4xl">{p.title}</h3>
                  <p data-cardtxt className="mt-4 max-w-[52ch] leading-relaxed text-mute">{p.summary}</p>
                  <ul data-cardtxt className="mt-5 flex flex-wrap gap-2" aria-label={`${p.title} stack`}>
                    {p.stack.map(s => <li key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs">{s}</li>)}
                  </ul>
                  <div data-cardtxt className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <span className="font-mono text-sm font-semibold text-ac">{p.headline}</span>
                    <button type="button" onClick={e => openDetails(p, originOf(e))} className="btn btn-ghost" aria-label={`${p.title} details`}>Details</button>
                  </div>
                </div>
              </MagicCard>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
