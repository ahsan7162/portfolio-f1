import { education, stats } from '@/content/data';
import { thousands } from '@/lib/format';
import { gsap, SplitText } from '@/motion/gsap';
import { barReveal, clipReveal, digitRoll, gridSlot, inView, scrubParallax, splitReveal } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

// Podium steps left to right: 2nd, 1st, 3rd, in the order they rise.
const STEPS = [{ p: 2, h: 'h-20' }, { p: 1, h: 'h-28' }, { p: 3, h: 'h-14' }];
const award = education.award;

/**
 * The finale: every result in one row, in order (education, the award, then
 * the career numbers), then the 450+ headline. The row lands left to right
 * once; the podium builds and its P3 step fills red. The static markup is the
 * finished state.
 */
export function Results() {
  const ref = useSectionMotion(({ root, q, qa, desktop, onRevert }) => {
    gridSlot(q('h2'));
    const row = q('[data-row]')!;
    // Several one-off reveals share the row's one trigger, timed by their delays.
    const once = inView(row, { start: 'top 80%' });

    // 1. Education: its lines rise.
    splitReveal(q('[data-edutxt]'), { type: 'lines', scrollTrigger: once });

    // 2. The award: the podium builds 2nd, 1st, 3rd, the P3 step fills red and its 3 rises in.
    gsap.timeline({ delay: 0.15, scrollTrigger: once })
      .fromTo(qa('[data-step]'), { scaleY: 0.05 }, { scaleY: 1, transformOrigin: '50% 100%', duration: DUR.split, ease: EASE.settle, stagger: 0.08 })
      .add(clipReveal(q('[data-p3fill]'), { duration: DUR.split }), '-=0.1')
      .fromTo(q('[data-p3num]'), { yPercent: 120 }, { yPercent: 0, duration: DUR.split, ease: EASE.out }, '-=0.15')
      .fromTo(q('[data-awtxt]'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out }, '-=0.2');

    // 3. The numbers: sector-timer digits, after the award.
    qa('[data-roll]').forEach((el, i) => onRevert(digitRoll(el, { delay: 0.45 + i * 0.12, scrollTrigger: once })));

    // Each column's label wipes in under the red bar as its column starts. On phones the
    // columns stack, so each label waits for its own column to scroll in instead.
    const starts = [0, 0.15, 0.45, 0.57];
    qa('[data-eyebrow]').forEach((el, i) => barReveal(el, desktop ? { delay: starts[i] ?? 0, scrollTrigger: once } : {}));

    // The ghost P3 drifts behind the row.
    scrubParallax(q('[data-p3ghost]'), root, { from: { yPercent: 20 }, to: { yPercent: -20 } });

    // Finale: the headline number rises with the scroll as the helmet turns to face you.
    // Its digits are tracked tight enough to fuse into one shape. A dim ghost of it sits
    // behind, and the bright number wipes over the ghost left to right, led by a red edge.
    // No per-letter masks (they would cut the overlapping digits): the number's own
    // clip-path masks the rise (open above and at the sides, closed at the bottom).
    const big = q('[data-bignum]')!, edge = q('[data-bigedge]')!;
    // Hidden from screen readers in the markup (they read the copy above it), so no aria-label.
    const split = SplitText.create(big, { type: 'chars', aria: 'none' });
    // Split the ghost the same way (letters lose kerning when split), so they line up.
    SplitText.create(q('[data-bigghost]'), { type: 'chars', aria: 'none' });
    gsap.timeline({ scrollTrigger: { trigger: big, start: 'top 95%', end: 'top 35%', scrub: true, invalidateOnRefresh: true } })
      .fromTo(split.chars, { yPercent: 105 }, { yPercent: 0, stagger: 0.08, ease: EASE.none, duration: 0.5 }, 0)
      .fromTo(big, { clipPath: 'inset(-30% 100% -2% -10%)' }, { clipPath: 'inset(-30% -10% -2% -10%)', ease: EASE.none, duration: 0.75 }, 0.05)
      .fromTo(edge, { x: 0, autoAlpha: 1 }, { x: () => big.offsetWidth, ease: EASE.none, duration: 0.75 }, 0.05)
      .to(edge, { autoAlpha: 0, ease: EASE.none, duration: 0.1 }, 0.8);
    scrubParallax(q('[data-bigwrap]'), big, { from: { xPercent: -3 }, to: { xPercent: 4 } });
    splitReveal(q('[data-biglabel]'), { type: 'words' });
  });

  return (
    <section ref={ref} id="results" tabIndex={-1} data-bg="#0b0b0c,#101114" className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32">
      <div data-p3ghost aria-hidden="true" className="display pointer-events-none absolute -right-[0.05em] top-24 -z-10 select-none text-[40vw] leading-none text-transparent md:text-[28vw]"
        style={{ WebkitTextStroke: '1px color-mix(in srgb, var(--fg) 7%, transparent)' }}>P3</div>

      <div className="mx-auto max-w-[1400px]">
        <h2 data-speed className="display mb-14 max-w-[14ch] text-display-section">Results and education</h2>

        {/* One row: education, the award, then the numbers. The helmet perches on the P3 step. */}
        <div data-row className="grid gap-x-10 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          <div id="education" tabIndex={-1} className="border-t border-line pt-5">
            <p data-eyebrow className="label mb-3">{education.years}</p>
            <h3 className="text-balance text-xl font-semibold font-stretch-semi-expanded">{education.degree}</h3>
            <p data-edutxt className="mt-3 text-sm leading-relaxed text-mute">
              {education.school}. {education.gpa}. {education.deansList}.
            </p>
          </div>

          <div className="border-t border-line pt-5">
            <p data-eyebrow className="label mb-3">{award.year}</p>
            <h3 className="text-balance text-xl font-semibold font-stretch-semi-expanded">3rd place, {award.name}</h3>
            <div aria-hidden="true" className="mt-10 flex items-end gap-1.5">
              {STEPS.map(s => (
                <div key={s.p} data-step className={`relative flex w-12 items-start justify-center overflow-hidden pt-1 ${s.h} bg-fg/10 text-mute`}>
                  {s.p === 3 && <span data-p3fill data-p3step data-helmet-anchor="podium" className="absolute inset-0 bg-ac" />}
                  <span data-p3num={s.p === 3 || undefined} className={`display relative text-lg font-bold ${s.p === 3 ? 'text-carbon' : ''}`}>{s.p}</span>
                </div>
              ))}
            </div>
            <p data-awtxt className="mt-4 text-sm leading-relaxed text-mute">
              Out of {thousands(award.of)} teams worldwide, with a weather-forecasting solution on Alibaba Cloud.
            </p>
          </div>

          {stats.grid.map(s => (
            <dl key={s.label} className="border-t border-line pt-5">
              <dt data-eyebrow className="label mb-3">{s.label}</dt>
              <dd className="display whitespace-nowrap text-display-stat">
                {s.prefix}<span data-roll className="tracking-tight">{s.value}</span>{s.suffix}
              </dd>
            </dl>
          ))}
        </div>

        <div className="relative mt-32 md:mt-72">
          {/* Where the helmet waits beside 450+ before it leaves (gl/flight). */}
          <div data-helmet-anchor="finale" aria-hidden="true"
            className="pointer-events-none invisible absolute right-[4%] top-[-4%] size-[min(38vh,26vw)] max-md:-top-[38vw] max-md:right-0 max-md:size-[34vw]" />
          {/* What screen readers hear: the number is split into letters and its label into words. */}
          <p className="sr-only">{stats.headline.value}{stats.headline.suffix} {stats.headline.label}</p>
          <div data-bigwrap data-speed aria-hidden="true" className="relative w-max">
            {/* The dim ghost the number fills (hidden under it when static). */}
            <div data-bigghost className="display pointer-events-none absolute inset-0 whitespace-nowrap text-[clamp(6rem,25.5vw,22rem)] font-black !leading-[0.8] tracking-[-0.06em] text-fg/[0.07]">
              {stats.headline.value}{stats.headline.suffix}
            </div>
            {/* Motion only: the red edge that leads the fill. */}
            <div data-bigedge className="pointer-events-none invisible absolute -top-[6%] bottom-0 left-0 z-10 w-1.5 bg-ac" />
            <div data-bignum
              className="display relative whitespace-nowrap text-[clamp(6rem,25.5vw,22rem)] font-black !leading-[0.8] tracking-[-0.06em]">
              {stats.headline.value}{stats.headline.suffix}
            </div>
          </div>
          <p data-biglabel aria-hidden="true" className="mt-5 max-w-[26ch] text-balance text-xl font-medium tracking-tight font-stretch-semi-expanded text-mute md:text-3xl">
            {stats.headline.label}
          </p>
        </div>
      </div>
    </section>
  );
}
