import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { jobs, timeline } from '@/content/data';
import { originOf, useDialogs } from '@/components/dialog-context';
import { lapState } from '@/gl/state';
import { lapTime } from '@/lib/format';
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
  const ref = useSectionMotion(({ root, q, qa, markers, onRevert }) => {
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
    const show = (i: number, velocity = 0) => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      const prev = stages[cur];
      // Crossfade with no gap: the old card drops out quietly while the new one rises in.
      // On a fast scroll it leaves like a car passing: leaning, with a longer streak.
      const fast = gsap.utils.clamp(0, 1, (Math.abs(velocity) - 800) / 2400);
      if (prev) gsap.fromTo(prev, { skewX: 0, x: 0 }, { autoAlpha: 0, y: -12 * dir, skewX: -10 * fast * dir, x: -120 * fast * dir, duration: DUR.hit, ease: EASE.in, overwrite: true });
      const next = stages[i];
      gsap.fromTo(next, { autoAlpha: 0, y: 24 * dir, skewX: 0, x: 0 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out, overwrite: true });
      gsap.fromTo(next.querySelectorAll('[data-stat]'), { yPercent: 100 }, { yPercent: 0, duration: DUR.split, delay: 0.05, ease: EASE.out, overwrite: true });
      // Timing-screen colours: the sector being driven is red, completed ones go green.
      sectorEls.forEach((el, k) => { el.classList.toggle('text-ac', k === i); el.classList.toggle('sector-done', k < i); });
      cur = i;
      lapState.stage = i;
    };

    // Lap timer: counts with the lap (so it runs backwards when you scroll up), one
    // text write per change inside a contained box. At the line it freezes, the
    // final sector turns purple (the fastest, the current job) and LAP 1 flashes.
    const clock = q('[data-laptime]')!, flag = q('[data-lapflag]')!;
    const LAP = 83.456;
    let shown = '', done = false;
    const tickClock = () => {
      const p = lapState.progress;
      const txt = lapTime(Math.min(1, p / 0.92) * LAP);
      if (txt !== shown) { clock.textContent = txt; shown = txt; }
      const end = p >= 0.92;
      if (end === done) return;
      done = end;
      sectorEls[n - 1]?.classList.toggle('sector-best', end);
      gsap.to(flag, { autoAlpha: end ? 1 : 0, x: end ? 0 : 8, duration: end ? DUR.split : DUR.hit, ease: end ? EASE.out : EASE.in, overwrite: true });
    };
    gsap.set(flag, { autoAlpha: 0, x: 8 });
    onRevert(() => { clock.textContent = lapTime(0); sectorEls.forEach(el => el.classList.remove('sector-done', 'sector-best', 'text-ac')); });

    const at = (p: number) => Math.min(n - 1, Math.floor(p * n));
    // Switch on intent: a short scroll away from the current stage's middle (18% of
    // its band), in the direction you are scrolling, moves to the next stage at once
    // instead of waiting for the halfway line. Fast scrolls still skip straight through.
    const mid = (i: number) => (i + 0.5) / n, nudge = 0.18 / n;
    const pick = (p: number, dir: number) => {
      if (cur < 0) return at(p);
      let i = cur;
      if (dir > 0) while (i < n - 1 && p > mid(i) + nudge) i++;
      else if (dir < 0) while (i > 0 && p < mid(i) - nudge) i--;
      return i;
    };
    const st = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: `+=${n * 35}%`, pin: true, markers,
      onUpdate: self => show(pick(self.progress, self.direction), self.getVelocity()),
      onEnterBack: self => show(pick(self.progress, self.direction)),
    });
    const lap = { trigger: pin, start: 'top top', end: () => st.end, scrub: 0.5 };
    gsap.fromTo(lapState, { progress: 0 }, { progress: 1, ease: EASE.none, scrollTrigger: lap, onUpdate: tickClock });
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
    onRevert(() => { lapState.active = false; lapState.veil = 1; lapState.progress = 0; lapState.stage = -1; });

    // Snap: when scrolling settles inside the pin, glide to the middle of the stage
    // the card shows (so the snap never contradicts the card), or let the first and
    // last stage settle on the pin's ends. Done through Lenis, since ScrollTrigger's
    // own snap scrolls the window directly and Lenis would fight it.
    const settle = () => {
      const l = lenis();
      if (!l || l.isScrolling || !st.isActive || cur < 0) return; // never interrupt a scroll in progress (menu jumps included)
      const p = st.progress;
      const points = cur === 0 ? [0, mid(0)] : cur === n - 1 ? [mid(n - 1), 1] : [mid(cur)];
      const to = points.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
      if (Math.abs(to - p) * (st.end - st.start) < 2) return;
      l.scrollTo(st.start + to * (st.end - st.start), { duration: DUR.wipe, easing: gsap.parseEase(EASE.wipe) });
    };
    ScrollTrigger.addEventListener('scrollEnd', settle);
    onRevert(() => ScrollTrigger.removeEventListener('scrollEnd', settle));
  }, [], { fit: true });

  return (
    <section ref={ref} id="timeline" tabIndex={-1} data-bg="#070708,#0b0b0c" data-lap className="relative">
      <div data-lappin data-cursor="scroll" className="lap-pin relative px-4 py-24 md:px-8">
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
                <button type="button" data-cursor="open" aria-label={`${t.company} details`}
                  onClick={e => { const j = jobs.find(x => x.id === t.job); if (j) openDetails(j, originOf(e)); }}
                  className="btn btn-primary mt-5 md:mt-6">
                  Details <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="lap-meta absolute inset-x-4 top-[calc(var(--navh)+1.5rem)] mx-auto hidden max-w-[1400px] items-end justify-end font-mono text-xs uppercase tracking-[0.14em] text-mute md:inset-x-8 md:top-auto md:bottom-8">
          <span className="flex items-baseline gap-4">
            <span data-lapflag className="font-semibold text-fg">Lap 1</span>
            <span data-laptime className="lap-time text-fg">0:00.000</span>
            {timeline.map(t => <span key={t.sector} data-sector className="transition-colors duration-(--dur-split)">{t.sector}</span>)}
          </span>
        </div>
      </div>
    </section>
  );
}
