import { archive, archiveBreakdown, education, stats } from '@/content/data';
import { originOf, useDialogs } from '@/components/dialog-context';
import { gsap, SplitText } from '@/motion/gsap';
import { digitRoll, scrubParallax, splitReveal } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

// Podium steps left to right: 2nd, 1st, 3rd. Their heights, and the order they rise in.
const STEPS = [{ p: 2, h: 'h-24 md:h-28' }, { p: 1, h: 'h-32 md:h-40' }, { p: 3, h: 'h-16 md:h-20' }];
const award = education.award;
const awardItem = archive.find(a => a.name === 'Weather forecasting AI');
const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The finale: every result in one place, read top to bottom as university
 * years, then career numbers, then the headline. The Alibaba award gets its own
 * race: P2,520 rolls down to P3 as you scroll, then the podium builds once.
 * The static markup is the finished state (P3, podium built, step red).
 */
export function Results() {
  const { openDetails } = useDialogs();
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, onRevert }) => {
    const block = q('[data-award]')!;

    // a. The climb (scrubbed): the position races through the thousands and slows
    // for the last few places, while the field bar shrinks to the 3 teams ahead of it.
    const pos = q('[data-pos]')!, pod = { v: award.of };
    const write = () => { pos.textContent = `P${fmt(Math.round(pod.v))}`; };
    write();
    gsap.timeline({ scrollTrigger: { trigger: block, start: 'top 75%', end: 'center 55%', scrub: 0.5 } })
      .fromTo(pod, { v: award.of }, { v: award.place, ease: EASE.out, onUpdate: write }, 0)
      .fromTo(q('[data-field]'), { scaleX: 1 }, { scaleX: award.place / award.of, ease: EASE.out }, 0);
    onRevert(() => { pos.textContent = `P${award.place}`; });

    // b. The podium (once, as P3 is reached): steps rise 2nd, 1st, 3rd, the P3 step
    // fills red, its 3 rises in, then the explanation and the degree follow.
    const tl = gsap.timeline({ scrollTrigger: { trigger: block, start: 'center 55%', once: true } })
      .fromTo(qa('[data-step]'), { scaleY: 0.05 }, { scaleY: 1, transformOrigin: '50% 100%', duration: DUR.split, ease: EASE.settle, stagger: 0.08 })
      .fromTo(q('[data-p3fill]'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.split, ease: EASE.wipe }, '-=0.1')
      .fromTo(qa('[data-awtxt]'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out, stagger: 0.05 }, '-=0.15');
    tl.fromTo(q('[data-p3num]'), { yPercent: 120 }, { yPercent: 0, duration: DUR.split, ease: EASE.out }, 0.3);
    // The degree follows as the podium finishes, so the eye goes award, then degree.
    splitReveal(q('[data-edutxt]'), { type: 'lines', delay: 0.6, scrollTrigger: { trigger: block, start: 'center 55%' } });

    // c. Afterglow: the ghost P3 drifts behind the podium.
    scrubParallax(q('[data-p3ghost]'), root, { from: { yPercent: 20 }, to: { yPercent: -20 } });

    // Stat row: sector-timer digits, once.
    qa('[data-roll]').forEach((el, i) => onRevert(digitRoll(el, { delay: i * 0.12, scrollTrigger: { trigger: el, start: 'top 88%', once: true } })));

    // Finale: the headline number rises with the scroll as the helmet turns to face you.
    const big = q('[data-bignum]')!;
    const split = SplitText.create(big, { type: 'chars', mask: 'chars', aria: 'auto' });
    gsap.fromTo(split.chars, { yPercent: 105 }, {
      yPercent: 0, stagger: 0.08, ease: EASE.none,
      scrollTrigger: { trigger: big, start: 'top 95%', end: 'top 35%', scrub: true },
    });
    gsap.fromTo(big, { xPercent: -3 }, { xPercent: 4, ease: EASE.none, scrollTrigger: { trigger: big, start: 'top bottom', end: 'bottom top', scrub: true } });
    splitReveal(q('[data-biglabel]'), { type: 'words' });
  });

  return (
    <section ref={ref} id="results" tabIndex={-1} data-bg="#0b0b0c,#101114" className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32">
      <div data-p3ghost aria-hidden="true" className="display pointer-events-none absolute -right-[0.05em] top-24 -z-10 select-none text-[40vw] leading-none text-transparent md:text-[28vw]"
        style={{ WebkitTextStroke: '1px rgb(244 244 237 / 0.07)' }}>P3</div>

      <div className="mx-auto max-w-[1400px]">
        <h2 className="display mb-14 max-w-[14ch] text-[clamp(2.4rem,7vw,6.5rem)]">Results and education</h2>

        {/* Desktop: content in the left ~60%, the right column stays free for the helmet. */}
        <div className="grid gap-14 lg:w-[62%] md:grid-cols-[1.35fr_1fr] md:gap-10">
          <div data-award className="border-t border-line pt-6">
            <p className="label">{award.year}</p>
            <h3 className="mt-3 text-2xl font-semibold [font-stretch:110%]">3rd place, {award.name}</h3>
            <div className="mt-6 flex items-end justify-between gap-6">
              <div>
                <div data-pos aria-hidden="true" className="display whitespace-nowrap text-[clamp(3rem,9vw,5.5rem)] !leading-[0.85] text-ac">P{award.place}</div>
                <span className="sr-only">Third place out of {fmt(award.of)} teams.</span>
                {/* The field: 2,520 teams shrinking to the 3 ahead of the line. */}
                <div aria-hidden="true" className="mt-4 h-1 w-full min-w-[9rem] bg-fg/10">
                  <div data-field className="h-full origin-left bg-ac" style={{ transform: `scaleX(${award.place / award.of})` }} />
                </div>
              </div>
              <div aria-hidden="true" className="flex shrink-0 items-end gap-1.5">
                {STEPS.map(s => (
                  <div key={s.p} data-step className={`relative flex w-11 items-start justify-center overflow-hidden pt-1.5 md:w-14 ${s.h} bg-fg/10 text-mute`}>
                    {s.p === 3 && <span data-p3fill data-p3step className="absolute inset-0 bg-ac" />}
                    <span data-p3num={s.p === 3 || undefined} className={`display relative text-lg md:text-xl ${s.p === 3 ? 'text-carbon' : ''}`}>{s.p}</span>
                  </div>
                ))}
              </div>
            </div>
            <p data-awtxt className="mt-6 max-w-[44ch] leading-relaxed text-mute">
              Out of {fmt(award.of)} teams worldwide, with a weather-forecasting solution built on Alibaba Cloud and machine learning.
            </p>
            {awardItem && (
              <button data-awtxt type="button" onClick={e => openDetails(archiveBreakdown(awardItem), originOf(e))} className="btn btn-ghost mt-6"
                aria-label={`${awardItem.name} details`}>
                Details <span aria-hidden="true">→</span>
              </button>
            )}
          </div>

          <div id="education" tabIndex={-1} className="border-t border-line pt-6">
            <p className="label">{education.years}</p>
            <h3 className="mt-3 text-2xl font-semibold [font-stretch:110%]">Education</h3>
            <p data-edutxt className="mt-4 leading-relaxed text-mute">
              {education.degree}, {education.school}. {education.gpa}. {education.deansList}.
            </p>
          </div>
        </div>

        <dl className="mt-20 grid grid-cols-2 gap-x-6 gap-y-12 lg:w-[62%] md:mt-24">
          {stats.grid.map(s => (
            <div key={s.label} className="border-t border-line pt-5">
              <dt className="label mb-3">{s.label}</dt>
              <dd className="display whitespace-nowrap text-4xl sm:text-5xl md:text-[clamp(2.5rem,5.4vw,4.5rem)]">
                {s.prefix}<span data-roll className="tracking-tight">{s.value}</span>{s.suffix}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-24 md:mt-32">
          <div data-bignum aria-label={`${stats.headline.value}${stats.headline.suffix}`}
            className="display whitespace-nowrap text-[clamp(7rem,30vw,26rem)] !leading-[0.8]">
            {stats.headline.value}{stats.headline.suffix}
          </div>
          <p data-biglabel className="display mt-4 max-w-[18ch] text-[clamp(1.6rem,4vw,3.5rem)] text-mute">
            {stats.headline.label}
          </p>
        </div>
      </div>
    </section>
  );
}
