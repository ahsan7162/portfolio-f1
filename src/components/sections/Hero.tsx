import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { F1 } from '@/art/liveries';
import { jobs, profile } from '@/content/data';
import { Arrow } from '@/components/Arrow';
import { CvLink } from '@/components/CvLink';
import { originOf, useDialogs } from '@/components/dialogs/context';
import { gsap } from '@/motion/gsap';
import { introTimeline } from '@/motion/intro';
import { magnet, proximityChars } from '@/motion/pointer';
import { drawPath, scrubParallax } from '@/motion/reveals';
import { barReveal, splitReveal } from '@/motion/split';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

export function Hero() {
  const { openDetails } = useDialogs();
  const current = jobs.find(j => j.id === 'careem');
  const ref = useSectionMotion(({ root, q, qa, onRevert }) => {
    const tl = introTimeline();
    // Entrance, on the loader's master timeline, so it lands as the lights go out. The fades
    // and the circuit draw start hidden, so they join only while the loader runs: otherwise
    // the prerendered first paint is final, and a rebuild after the intro (a resize across a
    // breakpoint) can't leave them hidden. The split text always joins: the name's hover
    // works on its letters.
    const intro = document.documentElement.classList.contains('intro');
    qa('[data-hline]').forEach((line, i) =>
      splitReveal(line, { type: 'chars', timeline: tl, at: `reveal+=${0.1 + i * 0.12}`, stagger: STAGGER.char * 1.6, duration: DUR.show }));
    splitReveal(q('[data-hsub]'), { type: 'words', timeline: tl, at: 'reveal+=0.45' });
    if (intro) tl.from(qa('[data-hfade]'), { autoAlpha: 0, y: 24, duration: DUR.reveal, ease: EASE.out, stagger: 0.16 }, 'reveal+=0.6');
    barReveal(q('[data-hlede]'), { timeline: tl, at: 'reveal+=0.68' });
    if (intro) {
      tl.from(q('[data-hnum]'), { yPercent: 40, autoAlpha: 0, duration: DUR.show, ease: EASE.out }, 'reveal+=0.2');
      drawPath(q('[data-hcircuit] path'), { timeline: tl, at: 'reveal+=0.3', duration: DUR.show });
    }

    onRevert(magnet(q('[data-pill]'), q('[data-pillarrow]')));
    // The name's letters lean toward the cursor until the hero starts to leave (they would fight the launch).
    onRevert(proximityChars(root, qa('[data-hline]'), { active: () => scrollY < root.offsetHeight * 0.05 }));

    // Leaving: the two name lines slide apart and stretch, and a red line draws across the bottom.
    const opts = { start: 'top top', end: 'bottom top' } as const;
    gsap.set(qa('[data-hline]'), { transformOrigin: '0% 50%' });
    scrubParallax(q('[data-hline="0"]'), root, { to: { xPercent: -8, scaleX: 1.12 }, ...opts });
    scrubParallax(q('[data-hline="1"]'), root, { to: { xPercent: 10, scaleX: 1.12 }, ...opts });
    gsap.fromTo(q('[data-hstreak]'), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, ease: EASE.none, scrollTrigger: { trigger: root, start: 'center top', end: 'bottom top', scrub: true } });
    scrubParallax(q('[data-hnum]'), root, { to: { yPercent: -25 }, ...opts });
    scrubParallax(q('[data-hcircuit]'), root, { to: { yPercent: 18, scale: 1.08 }, ...opts });
    gsap.to(q('[data-hbody]'), { autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: root, start: 'center top', end: 'bottom top', scrub: true } });
  }, [], { eager: true });

  return (
    <section ref={ref} id="top" tabIndex={-1} data-bg={`${F1.carbon},${F1.panel}`} className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 pt-24 md:px-8">
      <svg data-hcircuit aria-hidden="true" viewBox={CIRCUIT_VIEWBOX} fill="none"
        className="pointer-events-none absolute left-[-6%] top-[14%] -z-10 w-[92%] max-w-[1100px] opacity-50 md:left-[2%] md:w-[70%]">
        <path d={CIRCUIT_PATH} stroke="var(--ac)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div data-hnum aria-hidden="true"
        className="display pointer-events-none absolute -bottom-[0.12em] right-[-0.04em] -z-10 select-none text-[42vw] leading-none text-transparent md:text-[30vw]"
        style={{ WebkitTextStroke: '1px color-mix(in srgb, var(--letter) 10%, transparent)' }}>
        04
      </div>

      {/* Where the 3D helmet sits (gl/flight): placed by layout only, no transforms. */}
      <div data-helmet-anchor="hero" aria-hidden="true"
        className="hero-helmet pointer-events-none invisible absolute max-lg:right-4 max-lg:top-[calc(var(--navh)+1rem)] max-lg:size-[min(40vw,20svh)]" />

      <div data-hbody className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center pb-10">
        {/* The one live fact, opening the full Careem breakdown. */}
        <button data-hfade data-pill data-cursor="magnet" data-cursor-pull="0.35" type="button" onClick={e => { if (current) openDetails(current, originOf(e)); }}
          aria-label={`${profile.now} Open the ${current?.company} breakdown`}
          className="group mb-8 inline-flex min-h-11 items-center gap-3 self-start rounded-full border border-line bg-graphite/80 py-1.5 pl-4 pr-1.5 text-sm font-medium text-fg transition-colors hover:border-ac2">
          <span aria-hidden="true" className="size-2 rounded-full bg-ac" />
          <span>Currently at <span className="font-semibold">{current?.company}</span></span>
          <span data-pillarrow aria-hidden="true" className="inline-block"><span data-cursor-target className="grid size-8 place-items-center rounded-full bg-ac text-carbon transition-transform duration-(--dur-hit) ease-out-expo group-hover:-rotate-45"><Arrow className="size-4" /></span></span>
        </button>
        <h1 data-cursor="heat">
          {/* What screen readers hear: the visible lines are split into letters and hidden from them (splitAria). */}
          <span className="sr-only">{profile.name}, {profile.title}</span>
          <span data-hline="0" data-speed aria-hidden="true" className="display block text-display-hero font-black text-(--letter)">Muhammad</span>{' '}
          <span data-hline="1" data-speed aria-hidden="true" className="display block text-display-hero font-black text-(--letter)">
            Ahsan<span className="text-ac">.</span>
          </span>
          <span data-hsub aria-hidden="true" className="mt-5 block font-sans text-xl font-medium tracking-tight font-stretch-semi-expanded text-fg md:text-3xl">
            Full Stack / AI Developer
          </span>
        </h1>

        <p data-hlede className="mt-6 max-w-[42ch] text-base leading-relaxed text-mute md:text-lg">{profile.lede}</p>
        <div data-hfade className="mt-8 flex flex-wrap gap-3">
          <a href="#projects" className="btn btn-primary"><span data-letter-roll>View projects</span></a>
          <CvLink className="btn btn-ghost" />
        </div>
      </div>

      {/* Motion only: the streak along the bottom edge. */}
      <div data-hstreak aria-hidden="true" className="invisible absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ac" />
      <div aria-hidden="true" className="mx-auto mb-6 flex w-full max-w-[1400px] justify-end">
        <div className="checker hidden w-40 md:block" />
      </div>
    </section>
  );
}
