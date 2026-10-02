import { createContext, useContext, useState, type ReactNode } from 'react';
import { MagicCard } from '@/components/ui/magic-card';
import { BorderBeam } from '@/components/ui/border-beam';
import { ProjectVisual } from '@/components/ProjectVisuals';
import { originOf, useDialogs } from '@/components/dialog-context';
import { CrawlableDetails } from '@/components/CrawlableDetails';
import { archive, archiveBreakdown, projects, type Breakdown } from '@/content/data';
import { gsap } from '@/motion/gsap';
import { clipReveal } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

// Staggered offsets, like Lando's helmet grid: each card sits at its own height
// and moves at its own scroll speed.
const LAYOUT = [
  { col: 'lg:col-span-7', offset: 'lg:mt-0', speed: -6 },
  { col: 'lg:col-span-5', offset: 'lg:mt-40', speed: 8 },
  { col: 'md:col-span-2 lg:col-span-6 lg:col-start-4', offset: 'lg:-mt-10', speed: -3 },
];

// Featured projects and the archive, prerendered for search engines (see CrawlableDetails).
const CRAWL: Breakdown[] = [...projects, ...archive.map(archiveBreakdown)];

export function Projects() {
  const { openDetails, openArchive } = useDialogs();
  const ref = useSectionMotion<HTMLElement>(({ q, qa, desktop }) => {
    // The heading wipes up like the card visuals below it.
    // Cleared after, so the tight display leading doesn't clip the glyphs.
    gsap.fromTo(q('h2'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: EASE.wipe, clearProps: 'clipPath',
      scrollTrigger: { trigger: q('h2')!, start: 'top 85%', once: true } });
    const more = q('[data-more]')!;
    clipReveal(more, { trigger: more, from: 'inset(0% 100% 0% 0%)' });
    qa<HTMLElement>('[data-card]').forEach((card, i) => {
      clipReveal(card.querySelector('[data-cardvis]'), { trigger: card });
      gsap.from(card.querySelectorAll('[data-cardtxt]'), { autoAlpha: 0, y: 24, stagger: 0.06, ease: EASE.out, scrollTrigger: { trigger: card, start: 'top 80%', once: true } });
      if (!desktop) return;
      gsap.fromTo(card, { yPercent: 0 }, { yPercent: LAYOUT[i].speed, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(card.querySelector('[data-cardin]'), { yPercent: -6, scale: 1.08 }, { yPercent: 6, scale: 1.08, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  return (
    <section ref={ref} id="projects" tabIndex={-1} data-bg="#0d0d10,#111113" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(3rem,10vw,9rem)]">Projects</h2>
          <button type="button" onClick={e => openArchive(originOf(e))} className="btn btn-primary">
            All projects <span className="rounded-full bg-carbon/20 px-2 py-0.5">{projects.length + archive.length}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-x-8 lg:grid-cols-12">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} className={cn(LAYOUT[i].col, LAYOUT[i].offset)}>
              <MagicCard gradientFrom="#ff2438" gradientTo="#141416" gradientColor="rgb(255 36 56 / 0.08)" className="p-0">
                <div data-cardvis className="relative aspect-[16/10] overflow-hidden bg-carbon">
                  <div data-cardin className="h-full w-full"><ProjectVisual project={p} /></div>
                  <span aria-hidden="true" className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a3a39c]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <HoverBeam />
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
            </ProjectCard>
          ))}
        </div>

        {/* The archive, as a proper call to action (Lando's "see more helmets" row). */}
        <button type="button" data-more onClick={e => openArchive(originOf(e))}
          className="group relative mt-24 block w-full overflow-hidden border border-line bg-graphite/70 p-6 text-left transition-colors duration-(--dur-hit) hover:border-ac md:mt-32 md:p-10">
          <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-ac transition-transform duration-(--dur-wipe) ease-out-expo group-hover:scale-x-100" />
          <span className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <span>
              <span className="label block transition-colors duration-(--dur-hit) group-hover:text-carbon">{archive.length} more projects, 2021 to now</span>
              <span className="display mt-4 block text-[clamp(2.6rem,7vw,6.5rem)] transition-colors duration-(--dur-hit) group-hover:text-carbon">
                See all projects
              </span>
              <span className="mt-6 flex flex-wrap gap-2">
                {archive.slice(0, 5).map(a => (
                  <span key={a.name} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-mute transition-colors duration-(--dur-hit) group-hover:border-carbon/30 group-hover:text-carbon">{a.name}</span>
                ))}
                <span className="rounded-full px-3 py-1 font-mono text-xs text-mute transition-colors duration-(--dur-hit) group-hover:text-carbon">+{archive.length - 5} more</span>
              </span>
            </span>
            <span aria-hidden="true"
              className="grid size-20 shrink-0 place-items-center rounded-full bg-ac text-3xl text-carbon transition-[transform,background-color,color] duration-(--dur-hit) ease-out-expo group-hover:rotate-[-45deg] group-hover:bg-carbon group-hover:text-ac md:size-28 md:text-4xl">
              →
            </span>
          </span>
        </button>
        <CrawlableDetails items={CRAWL} />
      </div>
    </section>
  );
}

// The border beam loops forever, so it only exists while the card is hovered or focused.
const BeamOn = createContext(false);

function ProjectCard({ className, children }: { className: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <article data-card className={className}
      onPointerEnter={() => setOn(true)} onPointerLeave={() => setOn(false)}
      onFocus={() => setOn(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOn(false); }}>
      <BeamOn.Provider value={on}>{children}</BeamOn.Provider>
    </article>
  );
}

function HoverBeam() {
  if (!useContext(BeamOn)) return null;
  return <BorderBeam size={120} duration={9} colorFrom="#ff2438" colorTo="#f4f4ed" className="animate-[fade-in_0.5s_ease-out]" />;
}
