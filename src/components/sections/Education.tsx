import { education } from '@/content/data';
import { gsap } from '@/motion/gsap';
import { batchReveal, digitRoll, scrubParallax, splitReveal } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

// Podium step heights: 2nd, 1st, 3rd (left to right), highlighting 3rd place.
const STEPS = [{ p: 2, h: 'h-24' }, { p: 1, h: 'h-36' }, { p: 3, h: 'h-16' }];

export function Education() {
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, onRevert }) => {
    splitReveal(q('h2'), { type: 'chars' });
    scrubParallax(q('[data-p3]'), root, { from: { yPercent: 20 }, to: { yPercent: -20 } });
    gsap.from(qa('[data-step]'), { scaleY: 0, transformOrigin: '50% 100%', stagger: 0.12, duration: DUR.reveal, ease: EASE.settle,
      scrollTrigger: { trigger: q('[data-podium]')!, start: 'top 85%', once: true } });
    batchReveal(qa('[data-edu]'));
    onRevert(digitRoll(q('[data-roll]')));
  });

  return (
    <section ref={ref} id="education" tabIndex={-1} data-bg="#12100d,#0b0b0c" className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32">
      <div data-p3 aria-hidden="true" className="display pointer-events-none absolute -right-[0.05em] top-10 -z-10 select-none text-[40vw] leading-none text-transparent md:text-[28vw]"
        style={{ WebkitTextStroke: '1px rgb(244 244 237 / 0.08)' }}>P3</div>
      <div className="mx-auto max-w-[1400px]">
        <h2 className="display mb-16 max-w-[12ch] text-[clamp(2.4rem,7vw,6.5rem)]">Education and awards</h2>
        <div className="grid gap-16 md:grid-cols-2">
          <div data-edu className="border-t border-line pt-6">
            <h3 className="text-2xl font-semibold [font-stretch:110%]">{education.degree}, {education.school}</h3>
            <p className="mt-3 text-mute">{education.years}. {education.gpa}.</p>
            <p className="mt-1 text-mute">{education.deansList}.</p>
          </div>
          <div data-edu className="border-t border-line pt-6">
            <h3 className="text-2xl font-semibold [font-stretch:110%]">3rd place, {education.award.name}</h3>
            <p className="mt-3 text-mute">
              Out of <span data-roll className="font-mono text-fg">{education.award.of.toLocaleString('en-US')}</span> teams worldwide. {education.award.text}
            </p>
            <div data-podium aria-hidden="true" className="mt-10 flex items-end gap-2">
              {STEPS.map(s => (
                <div key={s.p} data-step className={`flex w-20 items-start justify-center pt-2 ${s.h} ${s.p === 3 ? 'bg-ac text-carbon' : 'bg-fg/10 text-mute'}`}>
                  <span className="display text-xl">{s.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
