import { WORLD, WORLD_DOTS, WORLD_MARKERS } from '@/art/worldDots';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { drawPath } from '@/motion/reveals';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

// Markers: home first (Karachi), then the places worked with from there (Dubai for Careem,
// Milan for Xtel). Each arc lifts above the straight line, by at least a small hop.
const [home, ...away] = WORLD_MARKERS;
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
const arc = (m: { x: number; y: number }) => {
  const lift = Math.max(Math.abs(m.x - home.x) * 0.15, 3);
  return `M${home.x},${home.y} Q${(home.x + m.x) / 2},${Math.min(home.y, m.y) - lift} ${m.x},${m.y}`;
};

/**
 * The dotted world map, precomputed by scripts/world-dots.ts as one path. It grows out of
 * Karachi as it comes into view, then an arc draws to each place worked with and a dot runs
 * it once; home pulses each time the map comes back. The arcs sit in their own small SVG,
 * so drawing them never repaints the 1.8k dots. The markup is the final frame.
 */
export function WorldMap() {
  const markerColor = 'var(--ac)';
  const ref = useSectionMotion<HTMLDivElement>(({ root, qa }) => {
    const at = `${pct(home.x, WORLD.width)} ${pct(home.y, WORLD.height)}`;
    const arcs = qa<SVGPathElement>('[data-arc]'), runners = qa<SVGCircleElement>('[data-runner]');
    const pulse = gsap.timeline({ paused: true })
      .fromTo(qa('[data-ring]'), { scale: 1, autoAlpha: 0.9 }, { scale: 2.8, autoAlpha: 0, duration: 1.4, ease: 'power1.out', stagger: 0.7, repeat: 1, immediateRender: false });
    let shown = false, done = false;
    const intro = gsap.timeline({ paused: true, onComplete: () => { done = true; gsap.set(root, { clearProps: 'clipPath' }); } })
      .fromTo(root, { clipPath: `circle(0% at ${at})` }, { clipPath: `circle(100% at ${at})`, duration: DUR.show, ease: EASE.out });
    gsap.set(runners, { autoAlpha: 0 });
    arcs.forEach((a, i) => {
      const t = 0.6 + i * 0.25;
      drawPath(a, { timeline: intro, at: t, duration: DUR.reveal });
      intro.set(runners[i], { autoAlpha: 1 }, t + 0.3)
        .to(runners[i], { motionPath: { path: a, align: a, alignOrigin: [0.5, 0.5] }, duration: 1.1, ease: 'power1.inOut' }, t + 0.3)
        .to(runners[i], { autoAlpha: 0, duration: DUR.split }, '>-0.1');
    });
    intro.add(() => { pulse.restart(); }, 0.9);
    // The intro starts the pulse itself; later arrivals just pulse again.
    const show = () => { if (!shown) { shown = true; intro.play(); } else if (done) pulse.restart(); };
    const st = ScrollTrigger.create({ trigger: root, start: 'top 85%', end: 'bottom top', onEnter: show, onEnterBack: show });
    // This chunk loads late, so the map may already be on screen (a #contact jump) or
    // above it: never leave it clipped to nothing.
    if (st.isActive) show();
    else if (st.progress === 1) { shown = done = true; intro.progress(1); gsap.set(root, { clearProps: 'clipPath' }); }
  });

  const ring = 'pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-0';
  return (
    <div ref={ref} className="relative size-full">
      <svg aria-hidden="true" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} className="block size-full">
        <path d={WORLD_DOTS} fill="none" stroke="currentColor" strokeWidth={WORLD.dot} strokeLinecap="round" />
        {WORLD_MARKERS.map(m => <circle key={`${m.x}-${m.y}`} cx={m.x} cy={m.y} r={m.r} fill={markerColor} />)}
      </svg>
      <svg aria-hidden="true" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {away.map(m => <path key={`${m.x}-${m.y}`} data-arc d={arc(m)} fill="none" stroke={markerColor} strokeWidth={1.25} strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
        {/* Motion only: they sit at the map's corner until GSAP moves them onto an arc. */}
        {away.map(m => <circle key={`${m.x}-${m.y}`} data-runner r={0.9} fill={markerColor} className="invisible" />)}
      </svg>
      {[0, 1].map(i => (
        <span key={i} data-ring className={ring}
          style={{ left: pct(home.x, WORLD.width), top: pct(home.y, WORLD.height), width: pct(home.r * 2, WORLD.width), borderColor: markerColor }} />
      ))}
    </div>
  );
}
