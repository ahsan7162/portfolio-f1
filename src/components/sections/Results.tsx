import { education, stats } from '@/content/data';
import { gsap, SplitText } from '@/motion/gsap';
import { digitRoll, gridSlot, inView, scrubParallax, splitReveal } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

// Podium steps left to right: 2nd, 1st, 3rd, in the order they rise.
const STEPS = [{ p: 2, h: 'h-20' }, { p: 1, h: 'h-28' }, { p: 3, h: 'h-14' }];
const award = education.award;
const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The finale: every result in one row, in order (education, the award, then
 * the career numbers), then the 450+ headline. The row lands left to right
 * once; the podium builds and its P3 step fills red. The static markup is the
 * finished state.
 */
export function Results() {
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, onRevert }) => {
    gridSlot(q('h2'));
    const row = q('[data-row]')!;
    // Several one-off reveals share the row: preventOverlaps finishes the earlier ones first.
    const once = inView(row, { start: 'top 80%', preventOverlaps: 'row' });

    // 1. Education: its lines rise.
    splitReveal(q('[data-edutxt]'), { type: 'lines', scrollTrigger: once });

    // 2. The award: the podium builds 2nd, 1st, 3rd, the P3 step fills red and its 3 rises in.
    gsap.timeline({ delay: 0.15, scrollTrigger: once })
      .fromTo(qa('[data-step]'), { scaleY: 0.05 }, { scaleY: 1, transformOrigin: '50% 100%', duration: DUR.split, ease: EASE.settle, stagger: 0.08 })
      .fromTo(q('[data-p3fill]'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.split, ease: EASE.wipe }, '-=0.1')
      .fromTo(q('[data-p3num]'), { yPercent: 120 }, { yPercent: 0, duration: DUR.split, ease: EASE.out }, '-=0.15')
      .fromTo(q('[data-awtxt]'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out }, '-=0.2');

    // 3. The numbers: sector-timer digits, after the award.
    qa('[data-roll]').forEach((el, i) => onRevert(digitRoll(el, { delay: 0.45 + i * 0.12, scrollTrigger: once })));

    // The ghost P3 drifts behind the row.
    scrubParallax(q('[data-p3ghost]'), root, { from: { yPercent: 20 }, to: { yPercent: -20 } });

    // Finale: the headline number rises with the scroll as the helmet turns to face you.
    // Its digits are tracked tight enough to fuse into one shape. A dim ghost of it sits
    // behind, and the bright number wipes over the ghost left to right, led by a red edge.
    // No per-letter masks (they would cut the overlapping digits): the number's own
    // clip-path masks the rise (open above and at the sides, closed at the bottom).
    const big = q('[data-bignum]')!, edge = q('[data-bigedge]')!;
    const split = SplitText.create(big, { type: 'chars', aria: 'auto' });
    // Split the ghost the same way (letters lose kerning when split), so they line up.
    SplitText.create(q('[data-bigghost]'), { type: 'chars', aria: 'none' });
    gsap.timeline({ scrollTrigger: { trigger: big, start: 'top 95%', end: 'top 35%', scrub: true, invalidateOnRefresh: true } })
      .fromTo(split.chars, { yPercent: 105 }, { yPercent: 0, stagger: 0.08, ease: EASE.none, duration: 0.5 }, 0)
      .fromTo(big, { clipPath: 'inset(-30% 100% -2% -10%)' }, { clipPath: 'inset(-30% -10% -2% -10%)', ease: EASE.none, duration: 0.75 }, 0.05)
      .fromTo(edge, { x: 0, autoAlpha: 1 }, { x: () => big.offsetWidth, ease: EASE.none, duration: 0.75 }, 0.05)
      .to(edge, { autoAlpha: 0, ease: EASE.none, duration: 0.1 }, 0.8);
    gsap.fromTo(q('[data-bigwrap]'), { xPercent: -3 }, { xPercent: 4, ease: EASE.none, scrollTrigger: { trigger: big, start: 'top bottom', end: 'bottom top', scrub: true } });
    splitReveal(q('[data-biglabel]'), { type: 'words' });
  });

  return (
    <section ref={ref} id="results" tabIndex={-1} data-bg="#0b0b0c,#101114" className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32">
      <div data-p3ghost aria-hidden="true" className="display pointer-events-none absolute -right-[0.05em] top-24 -z-10 select-none text-[40vw] leading-none text-transparent md:text-[28vw]"
        style={{ WebkitTextStroke: '1px rgb(244 244 237 / 0.07)' }}>P3</div>

      <div className="mx-auto max-w-[1400px]">
        <h2 data-speed className="display mb-14 max-w-[14ch] text-[clamp(2.4rem,7vw,6.5rem)]">Results and education</h2>

        {/* One row: education, the award, then the numbers. The helmet perches on the P3 step. */}
        <div data-row className="grid gap-x-10 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          <div id="education" tabIndex={-1} className="border-t border-line pt-5">
            <p className="label mb-3">{education.years}</p>
            <h3 className="text-xl font-semibold [font-stretch:110%]">{education.degree}</h3>
            <p data-edutxt className="mt-3 text-sm leading-relaxed text-mute">
              {education.school}. {education.gpa}. {education.deansList}.
            </p>
          </div>

          <div className="border-t border-line pt-5">
            <p className="label mb-3">{award.year}</p>
            <h3 className="text-xl font-semibold [font-stretch:110%]">3rd place, {award.name}</h3>
            <div aria-hidden="true" className="mt-10 flex items-end gap-1.5">
              {STEPS.map(s => (
                <div key={s.p} data-step className={`relative flex w-12 items-start justify-center overflow-hidden pt-1 ${s.h} bg-fg/10 text-mute`}>
                  {s.p === 3 && <span data-p3fill data-p3step className="absolute inset-0 bg-ac" />}
                  <span data-p3num={s.p === 3 || undefined} className={`display relative text-lg ${s.p === 3 ? 'text-carbon' : ''}`}>{s.p}</span>
                </div>
              ))}
            </div>
            <p data-awtxt className="mt-4 text-sm leading-relaxed text-mute">
              Out of {fmt(award.of)} teams worldwide, with a weather-forecasting solution on Alibaba Cloud.
            </p>
          </div>

          {stats.grid.map(s => (
            <dl key={s.label} className="border-t border-line pt-5">
              <dt className="label mb-3">{s.label}</dt>
              <dd className="display whitespace-nowrap text-[clamp(2.75rem,4.6vw,4rem)]">
                {s.prefix}<span data-roll className="tracking-tight">{s.value}</span>{s.suffix}
              </dd>
            </dl>
          ))}
        </div>

        <div className="mt-32 md:mt-72">
          <div data-bigwrap data-speed className="relative w-max">
            {/* The dim ghost the number fills (hidden under it when static). */}
            <div data-bigghost aria-hidden="true" className="display pointer-events-none absolute inset-0 whitespace-nowrap text-[clamp(7rem,30vw,26rem)] !leading-[0.8] tracking-[-0.06em] text-fg/[0.07]">
              {stats.headline.value}{stats.headline.suffix}
            </div>
            {/* Motion only: the red edge that leads the fill. */}
            <div data-bigedge aria-hidden="true" className="pointer-events-none invisible absolute -top-[6%] bottom-0 left-0 z-10 w-1.5 bg-ac" />
            <div data-bignum aria-label={`${stats.headline.value}${stats.headline.suffix}`}
              className="display relative whitespace-nowrap text-[clamp(7rem,30vw,26rem)] !leading-[0.8] tracking-[-0.06em]">
              {stats.headline.value}{stats.headline.suffix}
            </div>
          </div>
          <p data-biglabel className="display mt-4 max-w-[18ch] text-[clamp(1.6rem,4vw,3.5rem)] text-mute">
            {stats.headline.label}
          </p>
        </div>
      </div>
    </section>
  );
}
