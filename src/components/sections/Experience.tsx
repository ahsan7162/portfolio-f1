import { jobs } from '@/content/data';
import { CrawlableDetails } from '@/components/CrawlableDetails';
import { originOf, useDialogs } from '@/components/dialog-context';
import { clipReveal, splitReveal } from '@/motion/patterns';
import { STAGGER } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

/** Work history as an F1 timing sheet (a real <table>). */
export function Experience() {
  const { openDetails } = useDialogs();
  const ref = useSectionMotion<HTMLElement>(({ q, qa }) => {
    splitReveal(q('h2'), { type: 'chars' });
    qa('tbody tr').forEach((tr, i) => clipReveal(tr, {
      from: 'inset(0% 100% 0% 0%)', duration: 1,
      scrollTrigger: { trigger: q('table')!, start: 'top 80%', once: true },
    }).delay(i * STAGGER.line));
  });

  return (
    <section ref={ref} id="experience" tabIndex={-1} data-bg="#0b0b0c,#0d1013" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="display mb-14 text-[clamp(2.6rem,8vw,7.5rem)]">Work experience</h2>
        <table className="timing w-full border-collapse text-left">
          <caption className="sr-only">Companies, roles, dates and key results</caption>
          <thead>
            <tr className="label border-b border-line [&>th]:pb-3 [&>th]:font-normal">
              <th scope="col" className="w-14">Pos</th>
              <th scope="col">Company</th>
              <th scope="col">Role</th>
              <th scope="col">Dates</th>
              <th scope="col">Key result</th>
              <th scope="col"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j, i) => (
              <tr key={j.id} className="group border-b border-line transition-colors duration-300 hover:bg-fg/[0.03]">
                <td className="py-6 font-mono text-sm text-mute group-hover:text-ac">{String(i + 1).padStart(2, '0')}</td>
                <th scope="row" className="display py-6 pr-6 text-3xl font-extrabold md:text-5xl">{j.company}</th>
                <td className="py-6 pr-6 text-mute">{j.role}</td>
                <td className="py-6 pr-6 font-mono text-sm text-mute">{j.years}</td>
                <td className="py-6 pr-6">{j.result}</td>
                <td className="py-6 text-right">
                  <button type="button" onClick={e => openDetails(j, originOf(e))}
                    className="btn btn-ghost group-hover:border-ac group-hover:text-ac" aria-label={`${j.company} details`}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <CrawlableDetails items={jobs} />
      </div>
    </section>
  );
}
