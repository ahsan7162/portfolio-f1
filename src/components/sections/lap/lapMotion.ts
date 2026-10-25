import type Lenis from 'lenis';
import { gl3d } from '@/gl/gl3d';
import { lapMarks, lapState } from '@/gl/state';
import { lapTime } from '@/lib/format';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { drawPath } from '@/motion/reveals';
import { DUR, EASE } from '@/motion/tokens';
import type { MotionCtx } from '@/motion/useSectionMotion';

const LAP = 83.456; // the lap time at the line, in seconds
const FADE = 0.35; // of a screen, before the pin and again after it

/**
 * The stage cards are the lap's discrete events: each switch lands once, quickly
 * (DUR.split in, DUR.hit out), and the timing bar's sectors follow: the one being driven
 * is red, completed ones go green.
 */
function stageCards(stages: HTMLElement[], sectorSets: HTMLElement[][]) {
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
    sectorSets.forEach(els => els.forEach((el, k) => { el.classList.toggle('text-ac2', k === i); el.classList.toggle('sector-done', k < i); }));
    cur = i;
    lapState.stage = i;
  };
  return { show, current: () => cur };
}

/**
 * The lap timer counts with the lap (so it runs backwards when you scroll up), one text
 * write per change inside a contained box. At the line it freezes, the final sector turns
 * purple (the fastest, the current job) and LAP 1 flashes. Returns the per-frame tick.
 */
function lapClock(clock: HTMLElement, flag: HTMLElement, sectorSets: HTMLElement[][], onRevert: MotionCtx['onRevert']) {
  const n = sectorSets[0].length;
  let shown = '', done = false;
  gsap.set(flag, { autoAlpha: 0, x: 8 });
  onRevert(() => { clock.textContent = lapTime(0); sectorSets.flat().forEach(el => el.classList.remove('sector-done', 'sector-best', 'text-ac2')); });
  return () => {
    const p = lapState.progress;
    const txt = lapTime(Math.min(1, p / 0.92) * LAP);
    if (txt !== shown) { clock.textContent = txt; shown = txt; }
    const end = p >= 0.92;
    if (end === done) return;
    done = end;
    sectorSets.forEach(els => els[n - 1]?.classList.toggle('sector-best', end));
    gsap.to(flag, { autoAlpha: end ? 1 : 0, x: end ? 0 : 8, duration: end ? DUR.split : DUR.hit, ease: end ? EASE.out : EASE.in, overwrite: true });
  };
}

/**
 * Sector marks over the 3D track: each sector's start, projected from the track by the
 * render loop, as a dot with a leader and its name. Written only on lap frames, by
 * transform, and faded with the veil so they come and go with the scene. Returns a hide.
 */
function sectorMarks(layer: HTMLElement, onRevert: MotionCtx['onRevert']) {
  const els = gsap.utils.toArray<HTMLElement>(layer.children);
  const marks = els.map(el => ({ el, x: gsap.quickSetter(el, 'x', 'px'), y: gsap.quickSetter(el, 'y', 'px'), lx: Infinity, ly: Infinity, on: -1 }));
  let alpha = -1;
  const fade = (a: number) => {
    if (a === alpha) return;
    alpha = a;
    layer.style.opacity = String(a);
    layer.style.visibility = a > 0 ? 'visible' : 'hidden';
  };
  lapMarks.sink = () => {
    const xy = lapMarks.xy;
    if (xy.length < marks.length * 3) return;
    marks.forEach((m, k) => {
      const x = xy[k * 3], y = xy[k * 3 + 1], on = xy[k * 3 + 2];
      if (Math.abs(x - m.lx) > 0.25 || Math.abs(y - m.ly) > 0.25) { m.x(x); m.y(y); m.lx = x; m.ly = y; }
      if (on !== m.on) { m.on = on; m.el.style.visibility = on ? '' : 'hidden'; }
    });
    fade(Math.round((1 - lapState.veil) * 100) / 100);
  };
  onRevert(() => { lapMarks.sink = null; layer.style.opacity = layer.style.visibility = ''; });
  return () => fade(0);
}

/**
 * The Lap's motion: the section pins while the 3D camera drives the circuit, and each
 * sector brings in one career stage. If the tallest stage doesn't fit under the heading
 * (short screens), the static list stays.
 */
export function buildLap({ root, q, qa, desktop, markers, onRevert }: MotionCtx, lenis: () => Lenis | null) {
  const pin = q('[data-lappin]')!;
  const stages = qa('[data-stage]');
  // The sector names, twice: in the timing bar and on the track marks (same order).
  const sectorSets = [qa('[data-sector]'), qa('[data-marksector]')];
  const svgPath = q('[data-lapsvg] path');
  const flat = !gl3d().on; // the flat circuit draws itself only while the 3D is off
  const n = stages.length;

  // Live mode: the stages stack on top of each other over the track.
  root.classList.add('lap-live');
  const room = q('.lap-stages')!.clientHeight;
  if (Math.max(...stages.map(s => s.offsetHeight)) > room) { root.classList.remove('lap-live'); return; }
  onRevert(() => root.classList.remove('lap-live'));
  if (flat) gsap.set(svgPath, { drawSVG: '0%' });
  gsap.set(stages, { autoAlpha: 0, y: 60 });
  gsap.set(q('[data-laphead]'), { autoAlpha: 0, y: 30 });

  const cards = stageCards(stages, sectorSets);
  const tickClock = lapClock(q('[data-laptime]')!, q('[data-lapflag]')!, sectorSets, onRevert);

  const at = (p: number) => Math.min(n - 1, Math.floor(p * n));
  // Switch on intent: a short scroll away from the current stage's middle (18% of its
  // band), in the direction you are scrolling, moves to the next stage at once instead of
  // waiting for the halfway line. Fast scrolls still skip straight through.
  const mid = (i: number) => (i + 0.5) / n, nudge = 0.18 / n;
  const pick = (p: number, dir: number) => {
    let i = cards.current();
    if (i < 0) return at(p);
    if (dir > 0) while (i < n - 1 && p > mid(i) + nudge) i++;
    else if (dir < 0) while (i > 0 && p < mid(i) - nudge) i--;
    return i;
  };
  // The track is scroll: the camera and the car are scrubbed to the pin (1:1 with a short
  // catch-up), so the lap stops when you stop.
  const st = ScrollTrigger.create({
    trigger: pin, start: 'top top', end: `+=${n * 35}%`, pin: true, markers,
    onUpdate: self => cards.show(pick(self.progress, self.direction), self.getVelocity()),
    onEnterBack: self => cards.show(pick(self.progress, self.direction)),
  });
  const lap = { trigger: pin, start: 'top top', end: () => st.end, scrub: 0.5 };
  gsap.fromTo(lapState, { progress: 0 }, { progress: 1, ease: EASE.none, scrollTrigger: lap, onUpdate: tickClock });
  if (flat) drawPath(svgPath, { scrollTrigger: lap });

  // Arrival and exit, mirrored. The 3D scene takes over the canvas before the pin, behind a
  // veil in its own background colour that clears as the section scrolls up; the veil closes
  // only after the pin, so it never dims the last sector. The heading and the first stage
  // arrive with it, not after the pin starts.
  const layer = q('[data-lapmarks]');
  const hideMarks = desktop && !flat && layer ? sectorMarks(layer, onRevert) : () => {};
  ScrollTrigger.create({
    trigger: pin, start: `top ${FADE * 100}%`, end: () => st.end + innerHeight * FADE,
    onToggle: self => { lapState.active = self.isActive; if (!self.isActive) hideMarks(); },
    onEnter: () => {
      gsap.to(q('[data-laphead]'), { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out, overwrite: true });
      cards.show(at(st.progress));
    },
  });
  gsap.fromTo(lapState, { veil: 1 }, { veil: 0, ease: EASE.none, scrollTrigger: { trigger: pin, start: `top ${FADE * 100}%`, end: 'top top', scrub: true } });
  gsap.fromTo(lapState, { veil: 0 }, { veil: 1, ease: EASE.none, immediateRender: false,
    scrollTrigger: { trigger: pin, start: () => st.end, end: () => st.end + innerHeight * FADE, scrub: true } });
  onRevert(() => { lapState.active = false; lapState.veil = 1; lapState.progress = 0; lapState.stage = -1; });

  // Snap: when scrolling settles inside the pin, glide to the middle of the stage the card
  // shows (so the snap never contradicts the card), or let the first and last stage settle
  // on the pin's ends. Through Lenis: ScrollTrigger's own snap scrolls the window directly,
  // and Lenis would fight it.
  const settle = () => {
    const l = lenis(), cur = cards.current();
    if (!l || l.isScrolling || !st.isActive || cur < 0) return; // never interrupt a scroll in progress (menu jumps included)
    const p = st.progress;
    const points = cur === 0 ? [0, mid(0)] : cur === n - 1 ? [mid(n - 1), 1] : [mid(cur)];
    const to = points.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
    if (Math.abs(to - p) * (st.end - st.start) < 2) return;
    l.scrollTo(st.start + to * (st.end - st.start), { duration: DUR.wipe, easing: gsap.parseEase(EASE.wipe) });
  };
  ScrollTrigger.addEventListener('scrollEnd', settle);
  onRevert(() => ScrollTrigger.removeEventListener('scrollEnd', settle));
}
