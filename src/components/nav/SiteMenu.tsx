import { useEffect, useRef, useState, type RefObject } from 'react';
import { Arrow } from '@/components/Arrow';
import { CvLink } from '@/components/CvLink';
import { originOf, useDialogs } from '@/components/dialogs/context';
import { archive, EMAIL, jobs, projects, SOCIAL, type Section } from '@/content/data';
import { twoDigits } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Flip, gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

// Hover nudges the row right, unless the letter roll runs (useLetterRoll): then the
// letters roll instead. Keyboard focus always nudges.
const rowText = 'display block text-[clamp(1.6rem,3.9vw,3.3rem)] transition-[color,transform] duration-(--dur-hit) ease-out-expo [html:not(.has-roll)_.group:hover_&]:translate-x-3 group-hover:text-ac2 group-focus-visible:translate-x-3 group-focus-visible:text-ac2';

/**
 * The Work experience row's job list: the rows below it slide with Flip (transforms only,
 * no height tween), and the job rows rise in. Closing is quicker than opening.
 */
function useJobsFold(panel: RefObject<HTMLDivElement | null>, list: RefObject<HTMLUListElement | null>, open: boolean) {
  const ready = useRef(false);
  useEffect(() => {
    const ul = list.current!;
    if (!ready.current) { ready.current = true; return; }
    const set = () => gsap.set(ul, { height: open ? 'auto' : 0 });
    if (!motionEnabled()) { set(); return; }
    const items = ul.querySelectorAll('li');
    const flip = (duration: number) => {
      const state = Flip.getState(panel.current!.querySelectorAll('[data-mflip]'));
      set();
      Flip.from(state, { duration, ease: EASE.out });
    };
    if (open) {
      flip(DUR.split);
      gsap.fromTo(items, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: DUR.split, stagger: 0.03, ease: EASE.out, overwrite: true });
    } else {
      gsap.to(items, { autoAlpha: 0, duration: 0.1, ease: EASE.in, overwrite: true, onComplete: () => flip(0.2) });
    }
  }, [panel, list, open]);
}

/**
 * The full-screen site menu, behind the bar so the bar's button also closes it. Its links
 * stay in the HTML while closed, so crawlers still see them. `onLeave` closes it without
 * taking focus back, for a row that scrolls the page or opens a dialog.
 */
export function SiteMenu({ ref, menu, current, onLeave }: {
  ref: RefObject<HTMLDivElement | null>; menu: Array<Section & { menu: string }>; current: string | null; onLeave: () => void;
}) {
  const { openDetails, openArchive } = useDialogs();
  const [jobsOpen, setJobsOpen] = useState(false);
  const jobList = useRef<HTMLUListElement>(null);
  useJobsFold(ref, jobList, jobsOpen);

  return (
    <div ref={ref} id="site-menu" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Site menu"
      className="invisible fixed inset-0 overflow-y-auto bg-carbon opacity-0">
      <div aria-hidden="true" className="checker pointer-events-none absolute inset-x-0 top-16 h-2 opacity-60" />
      <div className="mx-auto grid min-h-full max-w-[1400px] gap-12 px-4 pb-12 pt-28 md:grid-cols-[1fr_320px] md:px-8 md:pt-32">
        <nav aria-label="Sections">
          <ol className="border-t border-line">
            {menu.map((m, i) => {
              const n = <span aria-hidden="true" className="w-8 shrink-0 pt-[0.6em] font-mono text-xs text-mute md:w-12">{twoDigits(i + 1)}</span>;
              const dot = current === m.id && <span aria-hidden="true" className="ml-3 inline-block size-2 shrink-0 self-center rounded-full bg-ac" />;
              return (
                <li key={m.id} data-mflip className="border-b border-line">
                  <div className="overflow-hidden">
                    <div data-mrow className="flex items-stretch">
                      {m.archive ? (
                        <button type="button" onClick={e => { const o = originOf(e); onLeave(); openArchive(o); }}
                          className="group flex flex-1 items-start py-3 text-left md:py-4">
                          {n}
                          <span data-letter-roll className={rowText}>{m.menu}</span>
                          <span className="ml-4 self-center rounded-full bg-ac px-2.5 py-0.5 font-mono text-xs text-carbon">{projects.length + archive.length}</span>
                          {dot}
                          <span aria-hidden="true" className="ml-auto self-center text-sm font-semibold text-mute transition-colors group-hover:text-ac2">See all <Arrow /></span>
                        </button>
                      ) : (
                        <a href={`#${m.id}`} onClick={onLeave} aria-current={current === m.id ? 'location' : undefined}
                          className="group flex flex-1 items-start py-3 md:py-4">
                          {n}
                          <span data-letter-roll className={rowText}>{m.menu}</span>
                          {dot}
                        </a>
                      )}
                      {m.jobs && (
                        <button type="button" onClick={() => setJobsOpen(v => !v)} aria-expanded={jobsOpen} aria-controls="menu-jobs"
                          aria-label={`${jobsOpen ? 'Hide' : 'Show'} each work experience`}
                          className="grid w-14 shrink-0 place-items-center border-l border-line text-2xl text-mute transition-colors hover:text-ac2 md:w-20">
                          <span aria-hidden="true" className={cn('transition-transform duration-(--dur-hit) ease-out-expo', jobsOpen && 'rotate-45 text-ac2')}>+</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {m.jobs && (
                    <ul ref={jobList} id="menu-jobs" aria-label="Work experience" className="h-0 overflow-hidden">
                      {jobs.map(j => (
                        <li key={j.id} className="border-t border-line/60">
                          <button type="button" tabIndex={jobsOpen ? 0 : -1}
                            onClick={e => { const o = originOf(e); onLeave(); openDetails(j, o); }}
                            className="group flex w-full items-baseline gap-4 py-3 pl-8 text-left md:pl-12">
                            <span className="text-xl font-semibold tracking-tight font-stretch-semi-expanded transition-colors group-hover:text-ac2 md:text-2xl">{j.company}</span>
                            <span className="text-sm text-mute">{j.role}</span>
                            <span className="ml-auto text-sm text-mute">{j.years}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <aside data-mflip className="flex flex-col gap-8 md:pt-2">
          <div data-mside>
            <div className="label mb-3">Get in touch</div>
            <a href={`mailto:${EMAIL}`} className="inline-flex min-h-11 items-center text-lg transition-colors hover:text-ac2">{EMAIL}</a>
          </div>
          <div data-mside className="flex gap-6 text-sm font-semibold">
            {SOCIAL.map(s => <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center transition-colors hover:text-ac2">{s.label}</a>)}
          </div>
          <CvLink data-mside className="btn btn-primary self-start" />
        </aside>
      </div>
    </div>
  );
}
