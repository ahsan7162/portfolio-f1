import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { CV_FILE, profile } from '@/content/data';
import { cvHref } from '@/components/Nav';
import { gsap } from '@/motion/gsap';
import { introTimeline } from '@/motion/intro';
import { drawPath, scrubParallax, splitReveal } from '@/motion/patterns';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

export function Hero() {
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa }) => {
    const tl = introTimeline();
    // Entrance: joins the loader's master timeline so it lands as the lights go out.
    qa('[data-hline]').forEach((line, i) =>
      splitReveal(line, { type: 'chars', timeline: tl, at: `reveal+=${0.1 + i * 0.12}`, stagger: STAGGER.char * 1.6, duration: DUR.xl }));
    splitReveal(q('[data-hsub]'), { type: 'words', timeline: tl, at: 'reveal+=0.45' });
    tl.from(qa('[data-hfade]'), { autoAlpha: 0, y: 24, duration: DUR.m, ease: EASE.soft, stagger: 0.08 }, 'reveal+=0.6');
    tl.from(q('[data-hnum]'), { yPercent: 40, autoAlpha: 0, duration: DUR.xl, ease: EASE.out }, 'reveal+=0.2');
    drawPath(q('[data-hcircuit] path'), { timeline: tl, at: 'reveal+=0.3', duration: 2 });

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
        <h1>
          <span data-hline="0" className="display block text-[clamp(3rem,10.5vw,9.5rem)]">Muhammad</span>{' '}
          <span data-hline="1" className="display block text-[clamp(3rem,10.5vw,9.5rem)]">
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

      <div data-hfade className="mx-auto mb-6 flex w-full max-w-[1400px] items-end justify-between gap-6">
        <div className="max-w-[300px] border border-line bg-carbon/60 p-4">
          <div className="label mb-2 text-ac">Now</div>
          <p className="text-sm leading-snug text-fg">{profile.now}</p>
        </div>
        <div aria-hidden="true" className="checker hidden w-40 md:block" />
      </div>
    </section>
  );
}
