import { deltas } from '@/content/data';
import { gsap } from '@/motion/gsap';
import { batchReveal, splitReveal } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';

/** Measured speed-ups, styled like F1 race results. Bars scrub with scroll. */
export function Performance() {
  const ref = useSectionMotion<HTMLElement>(({ q, qa }) => {
    splitReveal(q('h2'), { type: 'chars' });
    const table = q('table')!;
    const tl = gsap.timeline({ scrollTrigger: { trigger: table, start: 'top 85%', end: 'bottom 60%', scrub: 0.5 } });
    qa('[data-bar]').forEach((bar, i) => tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, i * 0.12));
    batchReveal(qa('[data-factor]'), { y: 16 });
  });

  return (
    <section ref={ref} id="performance" tabIndex={-1} data-bg="#0d1013,#0b0b0c" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="display mb-14 max-w-[14ch] text-[clamp(2.4rem,7vw,6.5rem)]">Performance improvements</h2>
        <table className="timing w-full border-collapse text-left">
          <caption className="sr-only">Measured speed-ups: task, company, before, after and factor</caption>
          <thead>
            <tr className="label border-b border-line [&>th]:pb-3 [&>th]:font-normal">
              <th scope="col">Task</th>
              <th scope="col" className="w-[34%]"><span className="sr-only">Relative size</span></th>
              <th scope="col">Before to after</th>
              <th scope="col" className="text-right">Speed-up</th>
            </tr>
          </thead>
          <tbody>
            {deltas.map((d, i) => (
              <tr key={d.name} className="border-b border-line">
                <th scope="row" className="py-5 pr-6 font-normal">
                  <div className="text-lg">{d.name}</div>
                  <div className="font-mono text-xs uppercase tracking-[0.12em] text-mute">{d.org}</div>
                </th>
                <td className="py-5 pr-6" aria-hidden="true">
                  <div className="h-2 w-full">
                    <div data-bar className="h-full origin-left" style={{ width: `${d.pct}%`, background: i === 0 ? 'var(--fg)' : 'var(--ac)' }} />
                  </div>
                </td>
                <td className="py-5 pr-6 font-mono text-sm text-mute">
                  {d.before} <span className="text-ac">→</span> <span className="text-fg">{d.after}</span>
                </td>
                <td data-factor className="display py-5 text-right text-3xl md:text-4xl" style={{ color: i === 0 ? 'var(--fg)' : 'var(--ac)' }}>{d.factor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
