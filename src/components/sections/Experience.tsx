import { jobs, languages, timeline, type Job } from '@/content/data';
import { Arrow } from '@/components/Arrow';
import { CrawlableDetails } from '@/components/CrawlableDetails';
import { originOf, useDialogs } from '@/components/dialog-context';
import { gsap } from '@/motion/gsap';
import { digitRoll, gridSlot, inView } from '@/motion/patterns';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

// Bento layout by position, on a 6-column grid, so a new job only needs data.
// Phones stack every tile; the newest job leads (full width on tablets), the next
// sits beside it on desktop, the rest fill in pairs, and the languages tile is last.
const layout = (i: number): { col: string; lead?: boolean } =>
  i === 0 ? { col: 'md:col-span-6 lg:col-span-4', lead: true }
    : i === 1 ? { col: 'md:col-span-3 lg:col-span-2' }
      : { col: 'md:col-span-3' };

const span = (j: Job) => `${j.years} / ${j.place}`;
const sector = (j: Job) => timeline.find(t => t.job === j.id)?.sector;

/** Work history as a bento grid: one block per company (sectors from the lap), plus the languages tile. */
export function Experience() {
  const { openDetails } = useDialogs();
  const grid = useBentoPointer<HTMLDivElement>();
  const ref = useSectionMotion(({ q, qa, desktop, onRevert }) => {
    gridSlot(q('h2'));
    // Grid formation: the tiles line up like cars on a starting grid, scrubbed. They
    // start staggered in a two-column zig-zag, each one further back, and pull into
    // their bento slots as the grid scrolls in, the lead (newest job) first. Only
    // x, y, rotation and opacity: the hover tilt owns rotationX/Y and scale.
    const tiles = qa('[data-tile]');
    if (desktop) {
      gsap.fromTo(tiles, {
        x: i => (i % 2 ? 12 : -12) * innerWidth / 100, y: i => 80 * (i + 1), rotation: i => (i % 2 ? 2 : -2), autoAlpha: 0.2,
      }, {
        x: 0, y: 0, rotation: 0, autoAlpha: 1, ease: 'power2.out', stagger: 0.15,
        scrollTrigger: { trigger: q('.bento')!, start: 'top 90%', end: 'top 35%', scrub: 0.8, invalidateOnRefresh: true },
      });
    } else {
      // Phones (one column): each tile rises into place on its own.
      tiles.forEach(t => gsap.fromTo(t, { y: 60, rotation: 1.5, autoAlpha: 0.2 }, {
        y: 0, rotation: 0, autoAlpha: 1, ease: 'power2.out',
        scrollTrigger: { trigger: t, start: 'top 98%', end: 'top 70%', scrub: 0.6 },
      }));
    }
    onRevert(digitRoll(q('[data-langs]'), { scrollTrigger: inView(q('[data-langs]')!) }));
  });

  return (
    <section ref={ref} id="experience" tabIndex={-1} data-bg="#0b0b0c,#0d1013" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 data-speed className="display mb-14 text-display-section">Work experience</h2>
        <div ref={grid} className="bento">
          {jobs.map((j, i) => {
            const { col, lead } = layout(i);
            return (
              <article key={j.id} data-tile data-tilt data-cursor="open"
                className={cn('tile flex cursor-pointer flex-col justify-between gap-12 p-6 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ac md:p-9',
                  lead ? 'tile-lead md:min-h-[340px] lg:p-11' : 'md:min-h-[300px]', col)}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="label">{span(j)}</span>
                  <span className="font-mono text-xs font-semibold text-ac">{sector(j)}</span>
                </div>
                <div>
                  <h3 className={cn('display', lead ? 'text-display-lead' : 'text-display-stat')}>{j.company}</h3>
                  <p className={cn('mt-5 leading-relaxed text-mute', lead ? 'max-w-[52ch] md:text-lg' : 'max-w-[40ch]')}>{j.summary}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <span className="font-mono text-[0.9375rem] font-semibold text-ac">{j.result}</span>
                    {/* The button's ::after covers the block, so the whole tile opens the breakdown. */}
                    <button type="button" data-cursor="open" onClick={e => openDetails(j, originOf(e))} aria-label={`${j.company} breakdown`}
                      className="btn btn-ghost outline-none after:absolute after:inset-0 after:content-[''] [.tile:hover_&]:border-ac [.tile:hover_&]:text-ac">
                      <span data-letter-roll>Breakdown</span> <Arrow />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <div data-tile data-tilt className="tile flex flex-col justify-center gap-6 overflow-hidden !bg-ac p-6 text-carbon before:!bg-carbon md:col-span-6 md:min-h-[300px] lg:col-span-3 md:p-9">
            <div data-langs className="display text-display-lead !leading-[0.82]">{languages.value}</div>
            <p className="max-w-[34ch] font-medium leading-relaxed md:text-lg">{languages.text}</p>
            <div aria-hidden="true" className="checker absolute inset-x-0 bottom-0 opacity-40" />
          </div>
        </div>
        <CrawlableDetails items={jobs} />
      </div>
    </section>
  );
}
