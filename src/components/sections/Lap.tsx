import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { jobs, timeline } from '@/content/data';
import { originOf, useDialogs } from '@/components/dialog-context';
import { lapState } from '@/gl/state';
import { glEnabled } from '@/motion/prefs';
import { gsap, ScrollTrigger } from '@/motion/gsap';
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
    gsap.set(q('[data-laphead]'), { autoAlpha: 0, y: 30 });

    // Stages switch as whole steps, not scrubbed: a short scroll past a threshold
    // plays the full change on its own clock, so one flick moves one season.
    // The camera target moves with the stage too, so the track glides at a fixed
    // pace no matter how fast you scroll.
    let cur = -1;
    const show = (i: number) => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      const prev = stages[cur];
      if (prev) gsap.to(prev, { autoAlpha: 0, y: -40 * dir, duration: 0.35, ease: EASE.soft, overwrite: true });
      const next = stages[i];
      gsap.fromTo(next, { autoAlpha: 0, y: 50 * dir }, { autoAlpha: 1, y: 0, duration: 0.7, delay: prev ? 0.15 : 0, ease: EASE.out, overwrite: true });
      gsap.fromTo(next.querySelectorAll('[data-stat]'), { yPercent: 100 }, { yPercent: 0, duration: 0.7, delay: prev ? 0.25 : 0.1, ease: EASE.out, overwrite: true });
      sectorEls.forEach((el, k) => el.classList.toggle('text-ac', k === i));
      lapState.progress = n > 1 ? i / (n - 1) : 0;
      if (flat) gsap.to(svgPath, { drawSVG: `${((i + 1) / n) * 100}%`, duration: 1.2, ease: EASE.inOut, overwrite: true });
      cur = i;
    };

    ScrollTrigger.create({
      trigger: pin, start: 'top top', end: `+=${n * 35}%`, pin: true, markers,
      onToggle: self => { lapState.active = self.isActive; },
      onEnter: () => { gsap.to(q('[data-laphead]'), { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE.out }); show(0); },
      onEnterBack: () => show(n - 1),
      onUpdate: self => show(Math.min(n - 1, Math.floor(self.progress * n))),
    });
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
