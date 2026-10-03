import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { CV_FILE, jobs, profile } from '@/content/data';
import { originOf, useDialogs } from '@/components/dialog-context';
import { cvHref } from '@/components/Nav';
import { gsap } from '@/motion/gsap';
import { introTimeline } from '@/motion/intro';
import { drawPath, magnet, proximityChars, scrubParallax, splitReveal } from '@/motion/patterns';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

export function Hero() {
  const { openDetails } = useDialogs();
  const current = jobs.find(j => j.id === 'careem');
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, onRevert }) => {
    const tl = introTimeline();
    // Entrance: joins the loader's master timeline so it lands as the lights go out.
    qa('[data-hline]').forEach((line, i) =>
      splitReveal(line, { type: 'chars', timeline: tl, at: `reveal+=${0.1 + i * 0.12}`, stagger: STAGGER.char * 1.6, duration: DUR.show }));
    splitReveal(q('[data-hsub]'), { type: 'words', timeline: tl, at: 'reveal+=0.45' });
    tl.from(qa('[data-hfade]'), { autoAlpha: 0, y: 24, duration: DUR.reveal, ease: EASE.out, stagger: 0.08 }, 'reveal+=0.6');
    tl.from(q('[data-hnum]'), { yPercent: 40, autoAlpha: 0, duration: DUR.show, ease: EASE.out }, 'reveal+=0.2');
    drawPath(q('[data-hcircuit] path'), { timeline: tl, at: 'reveal+=0.3', duration: DUR.show });

    onRevert(magnet(q('[data-pill]'), q('[data-pillarrow]')));
    // Hover: the name's letters lean and warm to red around the cursor.
    onRevert(proximityChars(root, qa('[data-hline]')));

    // Leaving: the two name lines slide apart, the ghost number drifts up.
    const opts = { start: 'top top', end: 'bottom top' } as const;
    scrubParallax(q('[data-hline="0"]'), root, { to: { xPercent: -8 }, ...opts });
    scrubParallax(q('[data-hline="1"]'), root, { to: { xPercent: 10 }, ...opts });
    scrubParallax(q('[data-hnum]'), root, { to: { yPercent: -25 }, ...opts });
    scrubParallax(q('[data-hcircuit]'), root, { to: { yPercent: 18, scale: 1.08 }, ...opts });
    gsap.to(q('[data-hbody]'), { autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: root, start: 'center top', end: 'bottom top', scrub: true } });
  });

  return (
    <section ref={ref} id="top" tabIndex={-1} data-bg="#0b0b0c,#141417" className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 pt-24 md:px-8">
      <svg data-hcircuit aria-hidden="true" viewBox={CIRCUIT_VIEWBOX} fill="none"
        className="pointer-events-none absolute left-[-6%] top-[14%] -z-10 w-[92%] max-w-[1100px] opacity-50 md:left-[2%] md:w-[70%]">
        <path d={CIRCUIT_PATH} stroke="var(--ac)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div data-hnum aria-hidden="true"
        className="display pointer-events-none absolute -bottom-[0.12em] right-[-0.04em] -z-10 select-none text-[42vw] leading-none text-transparent md:text-[30vw]"
        style={{ WebkitTextStroke: '1px rgb(244 244 237 / 0.1)' }}>
        04
      </div>

      <div data-hbody className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center pb-10">
        {/* Status pill: the one live fact, clickable into the full Careem breakdown. The dot is static. */}
        <button data-hfade data-pill type="button" onClick={e => { if (current) openDetails(current, originOf(e)); }}
          aria-label={`${profile.now} Open the ${current?.company} breakdown`}
          className="group mb-8 inline-flex min-h-11 items-center gap-3 self-start rounded-full border border-line bg-graphite/80 py-1.5 pl-4 pr-1.5 text-sm font-medium text-fg transition-colors hover:border-ac">
          <span aria-hidden="true" className="size-2 rounded-full bg-ac" />
          <span>Currently at <span className="font-semibold">{current?.company}</span></span>
          <span data-pillarrow aria-hidden="true" className="inline-block"><span className="grid size-8 place-items-center rounded-full bg-ac text-carbon transition-transform duration-(--dur-hit) ease-out-expo group-hover:-rotate-45">→</span></span>
        </button>
        <h1>
          <span data-hline="0" data-speed className="display block text-[clamp(3rem,10.5vw,9.5rem)]">Muhammad</span>{' '}
          <span data-hline="1" data-speed className="display block text-[clamp(3rem,10.5vw,9.5rem)]">
            Ahsan<span aria-hidden="true" className="text-ac">.</span>
          </span>
          <span className="sr-only">, </span>
          <span data-hsub className="mt-5 block font-sans text-xl font-medium tracking-tight [font-stretch:112%] text-fg md:text-3xl">
            Senior <em className="display-em font-bold">Full-Stack</em> Developer
          </span>
        </h1>

        <p data-hfade className="mt-6 max-w-[42ch] text-base leading-relaxed text-mute md:text-lg">{profile.lede}</p>
        <div data-hfade className="mt-8 flex flex-wrap gap-3">
          <a href="#projects" className="btn btn-primary">View projects</a>
          <a href={cvHref()} download={CV_FILE} className="btn btn-ghost">Download CV</a>
        </div>
      </div>

      <div aria-hidden="true" className="mx-auto mb-6 flex w-full max-w-[1400px] justify-end">
        <div className="checker hidden w-40 md:block" />
      </div>
    </section>
  );
}
