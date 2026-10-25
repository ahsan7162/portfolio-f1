import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '@/motion/gsap';
import { loaderWanted, playIntro, skipIntro } from '@/motion/intro';
import { useSmoothScroll } from '@/motion/SmoothScroll';
import { LIGHTS, lightsDriver, onFirstInput, startTimelines } from './startLights';

/**
 * The first-visit F1 start sequence, tied to the real load (startLights.ts). The h1 is
 * already rendered underneath, so content is never held back; any input fast-forwards.
 */
export function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  const { lock, unlock } = useSmoothScroll();

  useLayoutEffect(() => {
    // index.html adds `intro` to <html> before first paint when the loader should run, so
    // the overlay never shows without JS.
    if (!loaderWanted() || !document.documentElement.classList.contains('intro')) {
      document.documentElement.classList.remove('intro');
      // The overlay is prerendered, so the first render must keep it to match the HTML.
      // oxlint-disable-next-line react/set-state-in-effect
      setShow(false);
      skipIntro();
      return;
    }
    const root = ref.current!;
    const readout = {
      count: root.querySelector<HTMLElement>('[data-icount]')!,
      cap: root.querySelector<HTMLElement>('[data-icap]')!,
      bar: root.querySelector<HTMLElement>('[data-ibar]')!,
    };
    lock();

    const fontsOrTimeout = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 1200))]);
    const hold = 0.35 + Math.random() * 0.35; // the real start waits a random beat too
    let stopSkip = () => {};
    const tls = startTimelines(root, hold, () => playIntro(), () => { stopSkip(); unlock(); document.documentElement.classList.remove('intro'); setShow(false); });
    // Any input stops waiting on the load and fast-forwards.
    const pace = { speed: 1, skipped: false };
    stopSkip = onFirstInput(() => { pace.speed = 4; pace.skipped = true; });
    const step = lightsDriver(tls, readout, pace);

    // Cleanup reverts (not just kills) so the start states set by from() are undone, and
    // stops the pending start: React's dev double mount runs this effect twice.
    let live = true;
    void fontsOrTimeout.then(() => { if (live) gsap.ticker.add(step); });
    return () => {
      live = false;
      gsap.ticker.remove(step);
      [tls.exit, ...tls.lights.reverse(), tls.enter].forEach(t => t.revert());
      stopSkip();
      unlock();
    };
  }, [lock, unlock]);

  if (!show) return null;

  const grid = 'absolute inset-x-0 h-[100dvh] bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:72px_72px] bg-center opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]';
  return (
    <div ref={ref} data-intro aria-hidden="true" className="fixed inset-0 z-[80] hidden overflow-hidden">
      {/* The two halves the screen splits into, each with its part of one grid. */}
      <div data-ihalf="top" className="absolute inset-x-0 top-0 h-[calc(50%+1px)] overflow-hidden bg-carbon">
        <div className={`${grid} top-0`} />
        <div className="checker absolute inset-x-0 top-0 opacity-30" />
      </div>
      <div data-ihalf="bottom" className="absolute inset-x-0 bottom-0 h-[calc(50%+1px)] overflow-hidden bg-carbon">
        <div className={`${grid} bottom-0`} />
        <div className="checker absolute inset-x-0 bottom-0 opacity-30" />
      </div>
      <div data-iline className="absolute inset-x-0 top-[calc(50%-1px)] h-[2px] bg-ac shadow-[0_0_24px_4px_color-mix(in_srgb,var(--ac)_60%,transparent)]" style={{ transform: 'scaleX(0)' }} />

      <div data-icontent className="absolute inset-0 flex flex-col justify-between px-4 py-8 md:px-8 md:py-10">
        <div data-iglow className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,color-mix(in_srgb,var(--ac)_16%,transparent),transparent_70%)] opacity-0" />

        <div className="relative flex items-start justify-between gap-6">
          <span data-iframe className="display text-sm">Ahsan<span className="text-ac2">.</span></span>
          <span data-iframe className="label text-right">Portfolio / v2<br /><span className="text-dim">Grid slot 04</span></span>
        </div>

        <div className="relative flex flex-col items-center gap-8 md:gap-10">
          <div className="relative flex gap-3 px-3 md:gap-5 md:px-5">
            <div data-ibeam className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 bg-panel shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_5%,transparent)] md:h-4" />
            {Array.from({ length: LIGHTS }, (_, i) => (
              <div key={i} data-ipod className="relative flex flex-col gap-2 bg-lift p-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_6%,transparent),0_20px_40px_-12px_color-mix(in_srgb,var(--shade)_80%,transparent)] md:gap-3 md:p-3">
                <span className="block size-6 rounded-full bg-lamp-off md:size-10" />
                <span className="relative block size-6 md:size-10">
                  <span data-halo className="absolute -inset-3 rounded-full bg-ac opacity-0 blur-xl md:-inset-5" />
                  <span className="absolute inset-0 rounded-full bg-lamp-socket" />
                  <span data-light className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,var(--lamp-hot),var(--ac)_45%,var(--lamp-rim))] opacity-0" />
                </span>
                <span className="block size-6 rounded-full bg-lamp-off md:size-10" />
              </div>
            ))}
          </div>
          <div data-iframe className="h-4 overflow-hidden">
            <div data-istatus className="label flex flex-col items-center text-center leading-4">
              <span>Formation lap complete</span>
              <span className="text-ac2">Lights out and away we go</span>
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
              <span data-icount>000</span><span className="text-ac2">%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
