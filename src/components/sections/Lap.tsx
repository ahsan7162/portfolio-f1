import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { jobs, timeline } from '@/content/data';
import { originOf, useDialogs } from '@/components/dialog-context';
import { lapState } from '@/gl/state';
import { glEnabled } from '@/motion/prefs';
import { gsap } from '@/motion/gsap';
import { EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

/**
 * Career timeline as one lap. The section pins while the WebGL camera drives
 * the circuit; each sector brings in one career stage. Without motion the
 * stages are simply listed, so the content always reads (and is prerendered).
 */
export function Lap() {
  const { openDetails } = useDialogs();
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, markers, onRevert }) => {
    const pin = q('[data-lappin]')!;
    const stages = qa('[data-stage]');
    const sectorEls = qa('[data-sector]');
    const svgPath = q('[data-lapsvg] path');
    const flat = !glEnabled();
    const n = stages.length;

    // Live mode: stages stack on top of each other over the track.
    root.classList.add('lap-live');
    onRevert(() => root.classList.remove('lap-live'));
    if (flat) gsap.set(svgPath, { drawSVG: '0%' });
    gsap.set(stages, { autoAlpha: 0, y: 60 });

    const tl = gsap.timeline({
      defaults: { ease: EASE.soft },
      scrollTrigger: {
        trigger: pin, start: 'top top', end: `+=${n * 55}%`, pin: true, scrub: 0.6, markers,
        onToggle: self => { lapState.active = self.isActive; },
        onUpdate: self => {
          lapState.progress = self.progress;
          const s = Math.min(n - 1, Math.floor(self.progress * n));
          sectorEls.forEach((el, i) => el.classList.toggle('text-ac', i === s));
          if (flat) gsap.set(svgPath, { drawSVG: `${(self.progress * 100).toFixed(1)}%` });
        },
      },
    });
    tl.from(q('[data-laphead]'), { autoAlpha: 0, y: 30, duration: 0.3 }, 0);
    // Each stage owns one sector (1 unit): rise in, hold, leave (the last one stays).
    stages.forEach((stage, i) => {
      tl.to(stage, { autoAlpha: 1, y: 0, duration: 0.15 }, i + 0.02);
      tl.from(stage.querySelectorAll('[data-stat]'), { yPercent: 100, duration: 0.2, ease: EASE.out }, i + 0.05);
      if (i < n - 1) tl.to(stage, { autoAlpha: 0, y: -60, duration: 0.12 }, i + 0.88);
    });
    tl.to({}, { duration: 0.05 }, n); // hold at the finish
  });

  return (
    <section ref={ref} id="timeline" tabIndex={-1} data-bg="#070708,#0b0b0c" data-lap className="relative">
      <div data-lappin className="lap-pin relative px-4 py-24 md:px-8">
        <svg data-lapsvg aria-hidden="true" viewBox={CIRCUIT_VIEWBOX} fill="none"
          className="lap-flat pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(900px,92vw)] -translate-x-1/2 -translate-y-1/2 opacity-60">
          <path d={CIRCUIT_PATH} stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="lap-inner mx-auto flex w-full max-w-[1400px] flex-col">
          <div data-laphead className="lap-head">
            <h2 className="label">Career timeline</h2>
            <p className="display mt-3 text-[clamp(1.8rem,4vw,3.4rem)]">One lap, three teams.</p>
          </div>

          <ol className="lap-stages mt-10 grid gap-10">
            {timeline.map(t => (
              <li key={t.company} data-stage className="lap-stage max-w-[560px] border border-line bg-carbon/75 p-6 backdrop-blur-sm md:p-8">
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-mute">
                  <span className="text-ac">{t.sector}</span><span>{t.years}</span>
                </div>
                <h3 className="display mt-4 text-5xl md:text-7xl">{t.company}</h3>
                <p className="mt-2 text-mute">{t.role}</p>
                <div className="mt-6 flex items-end gap-4 overflow-hidden border-t border-line pt-6">
                  <span data-stat className="display inline-block text-5xl text-ac md:text-6xl">{t.stat}</span>
                  <span data-stat className="inline-block pb-2 font-mono text-xs uppercase tracking-[0.12em] text-mute">{t.statLabel}</span>
                </div>
                <p className="mt-5 leading-relaxed">{t.text}</p>
                <button type="button" aria-label={`${t.company} details`}
                  onClick={e => { const j = jobs.find(x => x.id === t.job); if (j) openDetails(j, originOf(e)); }}
                  className="btn btn-primary mt-6">
                  Details <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="lap-meta absolute inset-x-4 bottom-8 mx-auto hidden max-w-[1400px] items-end justify-end font-mono text-xs uppercase tracking-[0.14em] text-mute md:inset-x-8">
          <span className="flex gap-4">{timeline.map(t => <span key={t.sector} data-sector className="transition-colors duration-300">{t.sector}</span>)}</span>
        </div>
      </div>
    </section>
  );
}
