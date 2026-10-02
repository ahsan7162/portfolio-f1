import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { jobs, timeline } from '@/content/data';
import { originOf, useDialogs } from '@/components/dialog-context';
import { lapState } from '@/gl/state';
import { glEnabled } from '@/motion/prefs';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { DUR, EASE } from '@/motion/tokens';
import { useSmoothScroll } from '@/motion/SmoothScroll';
import { useSectionMotion } from '@/motion/useSectionMotion';

/**
 * Career timeline as one lap. The section pins while the WebGL camera drives
 * the circuit; each sector brings in one career stage. Without motion the
 * stages are simply listed, so the content always reads (and is prerendered).
 */
export function Lap() {
  const { lenis } = useSmoothScroll();
  const { openDetails } = useDialogs();
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, markers, onRevert }) => {
    const pin = q('[data-lappin]')!;
    const stages = qa('[data-stage]');
    const sectorEls = qa('[data-sector]');
    const svgPath = q('[data-lapsvg] path');
    const flat = !glEnabled();
    const n = stages.length;

    // Live mode: stages stack on top of each other over the track. If the tallest
    // stage doesn't fit under the heading (short screens), keep the static list.
    root.classList.add('lap-live');
    const room = q('.lap-stages')!.clientHeight;
    if (Math.max(...stages.map(s => s.offsetHeight)) > room) { root.classList.remove('lap-live'); return; }
    onRevert(() => root.classList.remove('lap-live'));
    if (flat) gsap.set(svgPath, { drawSVG: '0%' });
    gsap.set(stages, { autoAlpha: 0, y: 60 });
    gsap.set(q('[data-laphead]'), { autoAlpha: 0, y: 30 });

    // The track is scroll: the camera and the car are scrubbed to the pin (1:1 with a
    // short catch-up), so the lap stops when you stop. The stage cards are the
    // discrete events: each switch lands once, quickly (DUR.split in, DUR.hit out).
    let cur = -1;
    const show = (i: number) => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      const prev = stages[cur];
      if (prev) gsap.to(prev, { autoAlpha: 0, y: -40 * dir, duration: DUR.hit, ease: EASE.in, overwrite: true });
      const next = stages[i];
      gsap.fromTo(next, { autoAlpha: 0, y: 50 * dir }, { autoAlpha: 1, y: 0, duration: DUR.split, delay: prev ? 0.1 : 0, ease: EASE.out, overwrite: true });
      gsap.fromTo(next.querySelectorAll('[data-stat]'), { yPercent: 100 }, { yPercent: 0, duration: DUR.split, delay: prev ? 0.15 : 0.05, ease: EASE.out, overwrite: true });
      sectorEls.forEach((el, k) => el.classList.toggle('text-ac', k === i));
      cur = i;
    };

    const at = (p: number) => Math.min(n - 1, Math.floor(p * n));
    const st = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: `+=${n * 35}%`, pin: true, markers,
      onUpdate: self => show(at(self.progress)),
      onEnterBack: self => show(at(self.progress)),
    });
    const lap = { trigger: pin, start: 'top top', end: () => st.end, scrub: 0.5 };
    gsap.fromTo(lapState, { progress: 0 }, { progress: 1, ease: EASE.none, scrollTrigger: lap });
    if (flat) gsap.fromTo(svgPath, { drawSVG: '0%' }, { drawSVG: '100%', ease: EASE.none, scrollTrigger: lap });

    // Arrival and exit. The 3D scene takes over the canvas before the pin, behind a
    // veil in its own background colour that clears as the section scrolls up, and the
    // veil closes over the last quarter screen of the pin, so it never cuts in or out.
    // The heading and the first stage arrive with it, not after the pin starts.
    ScrollTrigger.create({
      trigger: pin, start: 'top 35%', end: () => st.end,
      onToggle: self => { lapState.active = self.isActive; },
      onEnter: () => { gsap.to(q('[data-laphead]'), { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out, overwrite: true }); show(at(st.progress)); },
    });
    gsap.fromTo(lapState, { veil: 1 }, { veil: 0, ease: EASE.none, scrollTrigger: { trigger: pin, start: 'top 35%', end: 'top top', scrub: true } });
    gsap.fromTo(lapState, { veil: 0 }, { veil: 1, ease: EASE.none, immediateRender: false,
      scrollTrigger: { trigger: pin, start: () => st.end - innerHeight * 0.25, end: () => st.end, scrub: true } });
    onRevert(() => { lapState.active = false; lapState.veil = 1; lapState.progress = 0; });

    // Snap: when scrolling settles inside the pin, glide to the middle of the
    // nearest stage (or either end). Done through Lenis, since ScrollTrigger's
    // own snap scrolls the window directly and Lenis would fight it.
    const points = [0, ...stages.map((_, k) => (k + 0.5) / n), 1];
    const settle = () => {
      const l = lenis();
      if (!l || l.isScrolling || !st.isActive) return; // never interrupt a scroll in progress (menu jumps included)
      const p = st.progress;
      const to = points.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
      if (Math.abs(to - p) * (st.end - st.start) < 2) return;
      l.scrollTo(st.start + to * (st.end - st.start), { duration: DUR.wipe, easing: gsap.parseEase(EASE.wipe) });
    };
    ScrollTrigger.addEventListener('scrollEnd', settle);
    onRevert(() => ScrollTrigger.removeEventListener('scrollEnd', settle));
  }, [], { fit: true });

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
              <li key={t.company} data-stage className="lap-stage max-w-[560px] border border-line bg-carbon/90 p-5 md:p-8">
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-mute">
                  <span className="text-ac">{t.sector}</span><span>{t.years}</span>
                </div>
                <h3 className="display mt-4 text-4xl md:text-7xl">{t.company}</h3>
                <p className="mt-2 text-mute">{t.role}</p>
                <div className="mt-5 flex items-end gap-4 overflow-hidden border-t border-line pt-5 md:mt-6 md:pt-6">
                  <span data-stat className="display inline-block whitespace-nowrap text-4xl text-ac md:text-6xl">{t.stat}</span>
                  <span data-stat className="inline-block pb-2 font-mono text-xs uppercase tracking-[0.12em] text-mute">{t.statLabel}</span>
                </div>
                <p className="mt-4 leading-relaxed md:mt-5">{t.text}</p>
                <button type="button" aria-label={`${t.company} details`}
                  onClick={e => { const j = jobs.find(x => x.id === t.job); if (j) openDetails(j, originOf(e)); }}
                  className="btn btn-primary mt-5 md:mt-6">
                  Details <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="lap-meta absolute inset-x-4 top-[calc(var(--navh)+1.5rem)] mx-auto hidden max-w-[1400px] items-end justify-end font-mono text-xs uppercase tracking-[0.14em] text-mute md:inset-x-8 md:top-auto md:bottom-8">
          <span className="flex gap-4">{timeline.map(t => <span key={t.sector} data-sector className="transition-colors duration-(--dur-split)">{t.sector}</span>)}</span>
        </div>
      </div>
    </section>
  );
}
