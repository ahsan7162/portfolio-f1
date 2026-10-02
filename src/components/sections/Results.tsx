import { stats } from '@/content/data';
import { gsap, SplitText } from '@/motion/gsap';
import { batchReveal, digitRoll, splitReveal } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';

/** Lando's giant "40 PODIUMS" numeral, then a stat grid. */
export function Results() {
  const ref = useSectionMotion<HTMLElement>(({ q, qa, onRevert }) => {
    const big = q('[data-bignum]')!;
    const split = SplitText.create(big, { type: 'chars', mask: 'chars', aria: 'auto' });
    gsap.fromTo(split.chars, { yPercent: 105 }, {
      yPercent: 0, stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: big, start: 'top 95%', end: 'top 35%', scrub: true },
    });
    gsap.fromTo(big, { xPercent: -3 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: big, start: 'top bottom', end: 'bottom top', scrub: true } });
    splitReveal(q('[data-biglabel]'), { type: 'words' });
    batchReveal(qa('[data-stat]'));
    qa('[data-roll]').forEach(el => onRevert(digitRoll(el)));
  });

  return (
    <section ref={ref} id="results" tabIndex={-1} data-bg="#0b0b0c,#101114" className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="label mb-6">Results in numbers</h2>
        <div data-bignum aria-label={`${stats.headline.value}${stats.headline.suffix}`}
          className="display whitespace-nowrap text-[clamp(7rem,30vw,26rem)] !leading-[0.8]">
          {stats.headline.value}{stats.headline.suffix}
        </div>
        <p data-biglabel className="display mt-4 max-w-[18ch] text-[clamp(1.6rem,4vw,3.5rem)] text-mute">
          {stats.headline.label}
        </p>

        <dl className="mt-20 grid max-w-[920px] grid-cols-2 gap-x-6 gap-y-12 md:mt-28">
          {stats.grid.map(s => (
            <div key={s.label} data-stat className="border-t border-line pt-5">
              <dt className="label mb-3">{s.label}</dt>
              <dd className="display whitespace-nowrap text-4xl sm:text-5xl md:text-[clamp(2.5rem,5.4vw,4.5rem)]">
                {s.prefix}<span data-roll className="tracking-tight">{s.value}</span>{s.suffix}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
