import { jobs, promotions, timeline, type Job } from '@/content/data';
import { CrawlableDetails } from '@/components/CrawlableDetails';
import { originOf, useDialogs } from '@/components/dialog-context';
import { gsap } from '@/motion/gsap';
import { digitRoll } from '@/motion/patterns';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

// Bento layout by position, on a 6-column grid, so a new job only needs data.
// Phones stack every tile; the newest job leads (full width on tablets), the next
// sits beside it on desktop, the rest fill in pairs, and the promotions tile is last.
const layout = (i: number): { col: string; lead?: boolean } =>
  i === 0 ? { col: 'md:col-span-6 lg:col-span-4', lead: true }
    : i === 1 ? { col: 'md:col-span-3 lg:col-span-2' }
      : { col: 'md:col-span-3' };

const span = (j: Job) => `${j.years} / ${j.place}`;
const sector = (j: Job) => timeline.find(t => t.job === j.id)?.sector;

/** Work history as a bento grid: one block per company (sectors from the lap), plus the promotions tile. */
export function Experience() {
  const { openDetails } = useDialogs();
  const grid = useBentoPointer<HTMLDivElement>();
  const ref = useSectionMotion<HTMLElement>(({ q, qa, onRevert }) => {
    // Heading and tiles wipe in left to right as one block; the clip is cleared
    // after so hover shadows aren't cut off.
    gsap.fromTo([q('h2'), ...qa('[data-tile]')], { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: EASE.wipe, stagger: STAGGER.line, clearProps: 'clipPath',
      scrollTrigger: { trigger: q('h2')!, start: 'top 85%', once: true },
    });
    onRevert(digitRoll(q('[data-promo]'), { scrollTrigger: { trigger: q('[data-promo]')!, start: 'top 85%', once: true } }));
  });

  return (
    <section ref={ref} id="experience" tabIndex={-1} data-bg="#0b0b0c,#0d1013" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="display mb-14 text-[clamp(2.6rem,8vw,7.5rem)]">Work experience</h2>
        <div ref={grid} className="bento">
          {jobs.map((j, i) => {
            const { col, lead } = layout(i);
            return (
              <article key={j.id} data-tile data-tilt
                className={cn('tile flex cursor-pointer flex-col justify-between gap-12 p-6 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ac md:p-9',
                  lead ? 'tile-lead md:min-h-[340px] lg:p-11' : 'md:min-h-[300px]', col)}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="label">{span(j)}</span>
                  <span className="font-mono text-xs font-semibold text-ac">{sector(j)}</span>
                </div>
                <div>
                  <h3 className={cn('display', lead ? 'text-[clamp(2.75rem,6.4vw,6.5rem)]' : 'text-[clamp(2.25rem,4vw,4.25rem)]')}>{j.company}</h3>
                  <p className={cn('mt-5 leading-relaxed text-mute', lead ? 'max-w-[52ch] md:text-lg' : 'max-w-[40ch]')}>{j.summary}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <span className="font-mono text-sm font-semibold text-ac">{j.result}</span>
                    {/* The button's ::after covers the block, so the whole tile opens the breakdown. */}
                    <button type="button" onClick={e => openDetails(j, originOf(e))} aria-label={`${j.company} breakdown`}
                      className="btn btn-ghost outline-none after:absolute after:inset-0 after:content-[''] [.tile:hover_&]:border-ac [.tile:hover_&]:text-ac">
                      Breakdown <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <div data-tile data-tilt className="tile flex flex-col justify-center gap-6 overflow-hidden !bg-ac p-6 text-carbon before:!bg-carbon md:col-span-6 md:min-h-[300px] lg:col-span-3 md:p-9">
            <div data-promo className="display text-[clamp(4.5rem,8vw,8.5rem)] !leading-[0.82]">{promotions.value}</div>
            <p className="max-w-[34ch] font-medium leading-relaxed md:text-lg">{promotions.text}</p>
            <div aria-hidden="true" className="checker absolute inset-x-0 bottom-0 opacity-40" />
          </div>
        </div>
        <CrawlableDetails items={jobs} />
      </div>
    </section>
  );
}
