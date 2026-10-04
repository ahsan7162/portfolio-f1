import { useRef, type CSSProperties, type ReactNode } from 'react';
import { ProjectVisual } from '@/components/ProjectVisuals';
import { originOf, useDialogs } from '@/components/dialog-context';
import { CrawlableDetails } from '@/components/CrawlableDetails';
import { archive, archiveBreakdown, projects, type Breakdown } from '@/content/data';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { clipReveal, gridSlot, inView, magnet } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { navHeight } from '@/motion/useNavHeight';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

// Staggered offsets, like Lando's helmet grid: each card sits at its own height
// and moves at its own scroll speed. (Grid mode; motion turns it into a deck when it fits.)
const LAYOUT = [
  { col: 'lg:col-span-7', offset: 'lg:mt-0', speed: -6 },
  { col: 'lg:col-span-5', offset: 'lg:mt-24', speed: 8 },
  { col: 'md:col-span-2 lg:col-span-6 lg:col-start-4', offset: 'lg:-mt-10', speed: -3 },
];

// Featured projects and the archive, prerendered for search engines (see CrawlableDetails).
const CRAWL: Breakdown[] = [...projects, ...archive.map(archiveBreakdown)];

export function Projects() {
  const { openDetails, openArchive } = useDialogs();
  const grid = useBentoPointer<HTMLDivElement>();
  const ref = useSectionMotion(({ root, q, qa, desktop, wide, onRevert }) => {
    gridSlot(q('h2'));
    const more = q('[data-more]')!;
    onRevert(magnet(more, q('[data-morearrow]')));
    clipReveal(more, { trigger: more, from: 'inset(0% 100% 0% 0%)' });
    const cards = qa('[data-card]');
    cards.forEach(card => {
      clipReveal(card.querySelector('[data-cardvis]'), { trigger: card });
      gsap.from(card.querySelectorAll('[data-cardtxt]'), { autoAlpha: 0, y: 24, stagger: 0.06, ease: EASE.out, clearProps: 'transform', scrollTrigger: inView(card, { start: 'top 80%' }) });
    });

    // Stack mode (motion only): the cards stick under the nav one after another, each
    // stepped a little lower, so the next one slides up over the last like a deck.
    // On wide screens the heading becomes a sticky column with a live index, the
    // current title and a progress bar. Only when a card fits the screen; otherwise
    // the staggered grid below stays. Plain CSS sticky: no pin, no pin-spacer.
    root.classList.add('proj-stack');
    const navh = navHeight();
    const top = (i: number) => navh + (wide ? 24 : 16) + i * (wide ? 20 : 12); // matches the CSS
    const room = document.documentElement.clientHeight;
    if (cards.every((c, i) => top(i) + c.offsetHeight <= room - 8)) {
      onRevert(() => root.classList.remove('proj-stack'));
      stack();
      return;
    }
    root.classList.remove('proj-stack');
    if (!desktop) return;
    cards.forEach((card, i) => {
      gsap.fromTo(card, { yPercent: 0 }, { yPercent: LAYOUT[i].speed, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(card.querySelector('[data-cardin]'), { yPercent: -6, scale: 1.08 }, { yPercent: 6, scale: 1.08, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    function stack() {
      const n = cards.length;
      // The card underneath steps back and darkens (an overlay, not a filter) as the next one covers it.
      cards.slice(0, -1).forEach((card, i) => {
        gsap.timeline({ scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: `top ${top(i + 1)}px`, scrub: true } })
          .fromTo(card, { scale: 1 }, { scale: 0.92, transformOrigin: '50% 0%', ease: EASE.none }, 0)
          .fromTo(card.querySelector('[data-cardshade]'), { opacity: 0 }, { opacity: 0.55, ease: EASE.none }, 0);
      });
      if (!wide) return;
      // The sticky column follows the deck: index (scrambled like a timing board), title, progress.
      const idx = q('[data-pidx]')!, title = q('[data-ptitle]')!;
      let cur = 0, swap: gsap.core.Timeline | undefined;
      const set = (i: number) => {
        if (i === cur) return;
        const dir = i > cur ? 1 : -1;
        cur = i;
        gsap.to(idx, { scrambleText: { text: String(i + 1).padStart(2, '0'), chars: '0123456789' }, duration: DUR.split, ease: EASE.none, overwrite: true });
        swap?.kill();
        swap = gsap.timeline()
          .to(title, { yPercent: -110 * dir, duration: DUR.hit, ease: EASE.in })
          .call(() => { title.textContent = projects[i].title; })
          .fromTo(title, { yPercent: 110 * dir }, { yPercent: 0, duration: DUR.split, ease: EASE.out });
      };
      cards.slice(1).forEach((card, k) => ScrollTrigger.create({
        trigger: card, start: 'top 55%', onEnter: () => set(k + 1), onLeaveBack: () => set(k),
      }));
      gsap.fromTo(q('[data-pbar]'), { scaleX: 1 / n }, { scaleX: 1, ease: EASE.none,
        scrollTrigger: { trigger: cards[0], start: `top ${top(0)}px`, endTrigger: cards[n - 1], end: `top ${top(n - 1)}px`, scrub: true } });
      onRevert(() => { idx.textContent = '01'; title.textContent = projects[0].title; });
    }
  }, [], { fit: true });

  return (
    <section ref={ref} id="projects" tabIndex={-1} data-bg="#0d0d10,#111113" className="relative px-4 py-24 md:px-8 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="proj-layout">
        <div className="proj-head mb-16 flex flex-wrap items-end justify-between gap-6">
          <h2 data-speed className="display text-[clamp(3rem,10vw,9rem)]">Projects</h2>
          {/* Stack mode only (see the CSS): which card is on top of the deck. */}
          <div aria-hidden="true" className="proj-now">
            <span className="label"><span data-pidx className="text-fg">01</span> / {String(projects.length).padStart(2, '0')}</span>
            <span className="display mt-3 block overflow-hidden text-[clamp(1.4rem,2.2vw,2.2rem)]"><span data-ptitle className="block">{projects[0].title}</span></span>
            <span className="mt-5 block h-0.5 w-full max-w-[280px] bg-line"><span data-pbar className="block h-full origin-left bg-ac" /></span>
          </div>
          <button type="button" onClick={e => openArchive(originOf(e))} className="btn btn-primary">
            All projects <span className="rounded-full bg-carbon/20 px-2 py-0.5">{projects.length + archive.length}</span>
          </button>
        </div>

        <div ref={grid} className="proj-cards grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-x-8 lg:grid-cols-12">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} index={i} className={cn(LAYOUT[i].col, LAYOUT[i].offset)}>
                <div data-cardvis className="relative aspect-[16/10] overflow-hidden border-b border-line bg-carbon">
                  <div data-cardin className="h-full w-full"><ProjectVisual project={p} /></div>
                </div>
                <div className="p-6 md:p-8">
                  <h3 data-cardtxt className="display text-3xl md:text-4xl">{p.title}</h3>
                  <p data-cardtxt className="mt-4 max-w-[52ch] leading-relaxed text-mute">{p.summary}</p>
                  <ul data-cardtxt className="mt-5 flex flex-wrap gap-2" aria-label={`${p.title} stack`}>
                    {p.stack.map(s => <li key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs">{s}</li>)}
                  </ul>
                  <div data-cardtxt className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <span className="font-mono text-sm font-semibold text-ac">{p.headline}</span>
                    <button type="button" onClick={e => openDetails(p, { ...originOf(e), title: e.currentTarget.closest('[data-card]')?.querySelector('h3')?.getBoundingClientRect() })} data-details data-cursor="view" aria-label={`${p.title} details`}
                      className="btn btn-ghost [.card:hover_&]:border-ac [.card:hover_&]:text-ac">Details</button>
                  </div>
                </div>
            </ProjectCard>
          ))}
        </div>
        </div>

        {/* The archive, as a proper call to action (Lando's "see more helmets" row). */}
        <button type="button" data-more data-cursor="magnet" data-cursor-pull="0.25" onClick={e => openArchive(originOf(e))}
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
            <span data-morearrow aria-hidden="true" className="shrink-0">
              <span data-cursor-target className="grid size-20 place-items-center rounded-full bg-ac text-3xl text-carbon transition-[transform,background-color,color] duration-(--dur-hit) ease-out-expo group-hover:rotate-[-45deg] group-hover:bg-carbon group-hover:text-ac md:size-28 md:text-4xl">
                →
              </span>
            </span>
          </span>
        </button>
        <CrawlableDetails items={CRAWL} />
      </div>
    </section>
  );
}

/**
 * Project card. Desktop hover (or keyboard focus) draws one red sector line
 * around the card with DrawSVG, and it retracts, quicker, on leave. The tilt
 * and the local spotlight come from useBentoPointer on the grid.
 */
function ProjectCard({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), line = useRef<SVGRectElement>(null);
  const draw = (on: boolean) => {
    const el = box.current, r = line.current;
    if (!el || !r || !motionEnabled()) return;
    if (on) {
      r.setAttribute('width', String(el.offsetWidth - 1));
      r.setAttribute('height', String(el.offsetHeight - 1));
      gsap.fromTo(r, { drawSVG: '0%' }, { drawSVG: '100%', duration: DUR.wipe, ease: EASE.out, overwrite: true });
    } else {
      gsap.to(r, { drawSVG: '100% 100%', duration: DUR.split, ease: EASE.in, overwrite: true });
    }
  };
  return (
    // The whole card opens its details: a click anywhere that isn't another control
    // is passed to the Details button (which keeps keyboard access and the dialog origin).
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- mouse shortcut to the Details button
    <article data-card data-cursor="view" className={className} style={{ '--i': index } as CSSProperties}
      onClick={e => { if (!(e.target as Element).closest('button, a')) e.currentTarget.querySelector<HTMLButtonElement>('[data-details]')?.click(); }}
      onPointerEnter={() => { if (!isTouch()) draw(true); }} onPointerLeave={() => { if (!isTouch()) draw(false); }}
      onFocus={() => draw(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) draw(false); }}>
      <div ref={box} data-tilt className="card relative isolate cursor-pointer overflow-hidden border border-line bg-graphite has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ac">
        <span aria-hidden="true" className="card-spot" />
        {children}
        <span data-cardshade aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-carbon opacity-0" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible">
          <rect ref={line} x="0.5" y="0.5" width="0" height="0" fill="none" stroke="var(--ac)" strokeWidth="2" style={{ strokeDasharray: '0 1' }} />
        </svg>
      </div>
    </article>
  );
}
