import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { F1 } from '@/art/liveries';
import { Arrow } from '@/components/Arrow';
import { originOf, useDialogs } from '@/components/dialogs/context';
import { jobs, timeline } from '@/content/data';
import { use3dVersion } from '@/gl/gl3d';
import { useSmoothScroll } from '@/motion/SmoothScroll';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { buildLap } from './lapMotion';

/** The career timeline as one lap (lapMotion.ts). Without motion the stages are simply listed. */
export function Lap() {
  const { lenis } = useSmoothScroll();
  const { openDetails } = useDialogs();
  // Rebuilt when the 3D is switched: the flat circuit draws itself only while the 3D is off.
  const v3d = use3dVersion();
  const ref = useSectionMotion(ctx => buildLap(ctx, lenis), [v3d], { fit: true });

  return (
    <section ref={ref} id="timeline" tabIndex={-1} data-bg={`${F1.pit},${F1.carbon}`} data-lap className="relative">
      {/* Sector marks over the 3D track: the canvas's box, outside the pin, placed by the render loop. */}
      <div data-lapmarks aria-hidden="true" className="lap-marks pointer-events-none invisible fixed inset-0 hidden h-[100lvh] w-full opacity-0 md:block">
        {timeline.map(t => (
          // text-mute here, not on the name, so its sector colour (red, green, purple) wins.
          <div key={t.sector} className="absolute left-1/2 top-1/2 text-mute">
            <span className="absolute -left-[3px] -top-[3px] size-1.5 rounded-full bg-fg" />
            <span className="absolute bottom-[3px] left-0 h-7 w-px bg-fg/40" />
            <span data-marksector className="absolute bottom-[calc(1.75rem+6px)] left-0 -translate-x-1/2 font-mono text-xs transition-colors duration-(--dur-split)">{t.sector}</span>
          </div>
        ))}
      </div>
      <div data-lappin data-cursor="scroll" className="lap-pin relative px-4 py-24 md:px-8">
        <svg data-lapsvg aria-hidden="true" viewBox={CIRCUIT_VIEWBOX} fill="none"
          className="lap-flat pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(900px,92vw)] -translate-x-1/2 -translate-y-1/2 opacity-60">
          <path d={CIRCUIT_PATH} stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="lap-inner mx-auto flex w-full max-w-[1400px] flex-col">
          <div data-laphead className="lap-head">
            <h2 className="display text-display-lead"><span className="sr-only">Career timeline: </span>One lap, three teams.</h2>
          </div>

          <ol className="lap-stages mt-10 grid gap-10">
            {timeline.map(t => (
              <li key={t.company} data-stage className="lap-stage max-w-[560px] border border-line bg-carbon/90 p-5 md:p-8">
                <div className="flex items-center justify-between text-sm text-mute">
                  <span className="font-mono text-xs text-ac2">{t.sector}</span><span>{t.years}</span>
                </div>
                <h3 className="display mt-4 text-display-stat">{t.company}</h3>
                <p className="mt-2 text-mute">{t.role}</p>
                <div className="mt-5 flex items-end gap-4 overflow-hidden border-t border-line pt-5 md:mt-6 md:pt-6">
                  <span data-stat className="display inline-block whitespace-nowrap text-display-stat text-ac2">{t.stat}</span>
                  <span data-stat className="inline-block pb-1.5 text-sm text-mute">{t.statLabel}</span>
                </div>
                <p className="mt-4 leading-relaxed md:mt-5">{t.text}</p>
                <button type="button" data-cursor="open" aria-label={`${t.company} details`}
                  onClick={e => { const j = jobs.find(x => x.id === t.job); if (j) openDetails(j, originOf(e)); }}
                  className="btn btn-primary mt-5 md:mt-6">
                  <span data-letter-roll>Details</span> <Arrow />
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="lap-meta absolute inset-x-4 top-[calc(var(--navh)+1.5rem)] mx-auto hidden max-w-[1400px] items-end justify-end font-mono text-xs text-mute md:inset-x-8 md:top-auto md:bottom-8">
          <span className="flex items-baseline gap-4">
            <span data-lapflag className="font-semibold text-fg max-md:hidden">Lap 1</span>
            <span data-laptime className="lap-time text-fg">0:00.000</span>
            {timeline.map(t => <span key={t.sector} data-sector className="transition-colors duration-(--dur-split)">{t.sector}</span>)}
          </span>
        </div>
      </div>
    </section>
  );
}
