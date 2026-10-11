import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '@/motion/gsap';
import { EASE } from '@/motion/tokens';
import { loaderWanted, playIntro, skipIntro } from '@/motion/intro';
import { loadingNow, loadProgress } from '@/motion/loading';
import { useSmoothScroll } from '@/motion/SmoothScroll';

const LIGHTS = 5;
const MIN_FILL = 1.4; // seconds: the lights never fill faster than this, however quick the load
const MAX_WAIT = 7; // seconds of lights before the start goes ahead without whatever is still loading

/**
 * F1 start sequence, tied to the real load. The gantry lowers in over a
 * timing-screen grid, then each light comes on as another fifth of the page
 * has loaded (fonts, page assets, the 3D engine, the helmet: see loading.ts),
 * with the counter and caption showing what is in. Once everything is, the
 * lights hold for a random beat and go out; a red line draws across the middle
 * and the screen splits open on it while the hero reveal plays underneath.
 * The h1 is already rendered, so content is never held back; any click, key
 * or scroll stops waiting and fast-forwards to the start.
 */
export function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  const { lock, unlock } = useSmoothScroll();

  useLayoutEffect(() => {
    // An inline script in index.html adds `intro` to <html> before first paint
    // when the loader should run, so the overlay never shows without JS.
    if (!loaderWanted() || !document.documentElement.classList.contains('intro')) {
      document.documentElement.classList.remove('intro');
      // The overlay is prerendered, so the first render must keep it to match the HTML.
      // oxlint-disable-next-line react/set-state-in-effect
      setShow(false);
      skipIntro();
      return;
    }
    const root = ref.current!;
    const q = (s: string) => root.querySelectorAll<HTMLElement>(s);
    const count = root.querySelector<HTMLElement>('[data-icount]')!;
    const cap = root.querySelector<HTMLElement>('[data-icap]')!;
    const bar = root.querySelector<HTMLElement>('[data-ibar]')!;
    lock();

    const fontsOrTimeout = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 1200))]);
    const hold = 0.35 + Math.random() * 0.35; // the real start waits a random beat too

    // Gantry lowers in, frame labels rise.
    const enter = gsap.timeline({ paused: true })
      .from(q('[data-ibeam]'), { scaleX: 0, duration: 0.6, ease: EASE.wipe })
      .from(q('[data-ipod]'), { yPercent: -60, autoAlpha: 0, duration: 0.55, stagger: 0.05, ease: EASE.out }, 0.1)
      .from(q('[data-iframe]'), { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06, ease: EASE.out }, 0.15);

    // One small timeline per light, started when its fifth of the load is in.
    const lights = [...q('[data-ipod]')].map((pod, i) => gsap.timeline({ paused: true })
      .to(pod.querySelector('[data-light]'), { opacity: 1, duration: 0.06, ease: 'none' })
      .fromTo(pod.querySelector('[data-halo]'), { opacity: 0, scale: 0.6 }, { opacity: 0.75, scale: 1, duration: 0.35, ease: EASE.out }, 0)
      .to(q('[data-iglow]'), { opacity: (i + 1) / LIGHTS, duration: 0.3, ease: EASE.out }, 0));

    // Lights out, after the hold.
    const exit = gsap.timeline({ paused: true })
      .addLabel('out', hold)
      .to(q('[data-light], [data-halo]'), { opacity: 0, duration: 0.05, ease: 'none' }, 'out')
      .to(q('[data-iglow]'), { opacity: 0, duration: 0.25 }, 'out')
      .to(q('[data-istatus]'), { yPercent: -50, duration: 0.45, ease: EASE.out }, 'out')
      // Frame clears, a red line draws across the middle, the screen splits on it.
      .to(q('[data-icontent]'), { autoAlpha: 0, scale: 0.97, duration: 0.35, ease: EASE.out }, 'out+=0.45')
      .fromTo(q('[data-iline]'), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: EASE.wipe }, 'out+=0.5')
      .addLabel('split', 'out+=0.85')
      .add(() => playIntro(), 'split')
      .to(q('[data-ihalf="top"]'), { yPercent: -100, duration: 0.9, ease: EASE.wipe }, 'split')
      .to(q('[data-ihalf="bottom"]'), { yPercent: 100, duration: 0.9, ease: EASE.wipe }, 'split')
      .to(q('[data-iline]'), { autoAlpha: 0, scaleY: 6, duration: 0.5, ease: EASE.out }, 'split')
      .add(() => { stopSkip(); unlock(); document.documentElement.classList.remove('intro'); setShow(false); });

    // Any input stops waiting on the load and fast-forwards.
    let speed = 1;
    let skipped = false;
    const skip = () => { speed = 4; skipped = true; stopSkip(); };
    const evts = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const stopSkip = () => evts.forEach(e => window.removeEventListener(e, skip));
    evts.forEach(e => window.addEventListener(e, skip, { passive: true }));

    const advance = (t: gsap.core.Timeline, d: number) => t.time(Math.min(t.duration(), t.time() + d));
    let waited = 0; // seconds of lights so far
    let shown = 0; // the progress the lights and counter show, 0 to 1
    let on = 0; // lights lit
    let caption = '';

    // Stepped by hand with each frame's time capped: the site turns GSAP's lag smoothing off,
    // so a long first-load frame (shader compile) would otherwise skip lights.
    const step = (_t: number, dt: number) => {
      const d = (Math.min(dt, 50) / 1000) * speed;
      advance(enter, d);
      if (enter.time() < 0.35) return; // lights start once the gantry is down
      if (shown < 1) {
        lights.forEach(l => { if (l.time() > 0) advance(l, d); });
        waited += d;
        const target = skipped || waited > MAX_WAIT ? 1 : loadProgress();
        shown = Math.min(target, shown + d / MIN_FILL);
        for (; on < LIGHTS && shown >= (on + 1) / LIGHTS - 1e-6; on++) advance(lights[on], 0.001);
        count.textContent = String(Math.floor(shown * 100)).padStart(3, '0');
        bar.style.transform = `scaleX(${shown})`;
        const part = loadingNow();
        const now = shown >= 1 ? 'Ready' : part ? `Loading ${part}` : 'Systems check';
        if (now !== caption) cap.textContent = caption = now;
        // Settle the last light's bloom before lights out, so nothing fights the switch-off.
        if (shown >= 1) lights.forEach(l => l.progress(1));
        return;
      }
      advance(exit, d);
      if (exit.progress() === 1) gsap.ticker.remove(step);
    };
    // Cleanup reverts (not just kills) so the start states set by from() are undone, and
    // stops the pending start: React's dev double mount runs this effect twice.
    let live = true;
    void fontsOrTimeout.then(() => { if (live) gsap.ticker.add(step); });
    return () => {
      live = false;
      gsap.ticker.remove(step);
      [exit, ...lights.reverse(), enter].forEach(t => t.revert());
      stopSkip();
      unlock();
    };
  }, [lock, unlock]);

  if (!show) return null;

  const grid = 'absolute inset-x-0 h-[100dvh] bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:72px_72px] bg-center opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]';
  return (
    <div ref={ref} data-intro aria-hidden="true" className="fixed inset-0 z-[80] hidden overflow-hidden">
      {/* The two halves the screen splits into; each carries its part of one continuous grid. */}
      <div data-ihalf="top" className="absolute inset-x-0 top-0 h-[calc(50%+1px)] overflow-hidden bg-carbon">
        <div className={`${grid} top-0`} />
        <div className="checker absolute inset-x-0 top-0 opacity-30" />
      </div>
      <div data-ihalf="bottom" className="absolute inset-x-0 bottom-0 h-[calc(50%+1px)] overflow-hidden bg-carbon">
        <div className={`${grid} bottom-0`} />
        <div className="checker absolute inset-x-0 bottom-0 opacity-30" />
      </div>
      <div data-iline className="absolute inset-x-0 top-[calc(50%-1px)] h-[2px] bg-ac shadow-[0_0_24px_4px_rgb(255_36_56/0.6)]" style={{ transform: 'scaleX(0)' }} />

      <div data-icontent className="absolute inset-0 flex flex-col justify-between px-4 py-8 md:px-8 md:py-10">
        {/* The room warms red as the lights come on. */}
        <div data-iglow className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgb(255_36_56/0.16),transparent_70%)] opacity-0" />

        <div className="relative flex items-start justify-between gap-6">
          <span data-iframe className="display text-sm">Ahsan<span className="text-ac">.</span></span>
          <span data-iframe className="label text-right">Portfolio / v2<br /><span className="text-dim">Grid slot 04</span></span>
        </div>

        <div className="relative flex flex-col items-center gap-8 md:gap-10">
          <div className="relative flex gap-3 px-3 md:gap-5 md:px-5">
            <div data-ibeam className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 bg-[#141417] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] md:h-4" />
            {Array.from({ length: LIGHTS }, (_, i) => (
              <div key={i} data-ipod className="relative flex flex-col gap-2 bg-[#18181b] p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_20px_40px_-12px_rgb(0_0_0/0.8)] md:gap-3 md:p-3">
                <span className="block size-6 rounded-full bg-[#1f0a0d] md:size-10" />
                <span className="relative block size-6 md:size-10">
                  <span data-halo className="absolute -inset-3 rounded-full bg-ac opacity-0 blur-xl md:-inset-5" />
                  <span className="absolute inset-0 rounded-full bg-[#2a0a0e]" />
                  <span data-light className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,#ffd6da,#ff2438_45%,#a80f1d)] opacity-0" />
                </span>
                <span className="block size-6 rounded-full bg-[#1f0a0d] md:size-10" />
              </div>
            ))}
          </div>
          <div data-iframe className="h-4 overflow-hidden">
            <div data-istatus className="label flex flex-col items-center text-center leading-4">
              <span>Formation lap complete</span>
              <span className="text-ac">Lights out and away we go</span>
            </div>
          </div>
        </div>

        <div data-iframe className="relative">
          <div className="relative h-px bg-line">
            <div data-ibar className="absolute inset-0 origin-left bg-ac" style={{ transform: 'scaleX(0)' }} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-6">
            <span data-icap className="label">Loading fonts</span>
            <span className="display text-[clamp(2.125rem,5.1vw,3.8rem)] !leading-[0.8] tabular-nums">
              <span data-icount>000</span><span className="text-ac">%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
