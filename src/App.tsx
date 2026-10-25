import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { DialogCtx, type Origin } from '@/components/dialogs/context';
import { Cursor } from '@/components/Cursor';
import { DetailsDialog } from '@/components/dialogs/DetailsDialog';
import { closeWithWipe } from '@/components/dialogs/wipe';
import { ArchiveGate } from '@/components/archive/ArchiveGate';
import { Intro } from '@/components/intro/Intro';
import { Nav } from '@/components/nav/Nav';
import { ScrollRail } from '@/components/ScrollRail';
import { TrackMap } from '@/components/TrackMap';
import { About } from '@/components/sections/About';
import { Contact } from '@/components/sections/contact/Contact';
import { Contributions } from '@/components/sections/contributions/Contributions';
import { Experience } from '@/components/sections/Experience';
import { Hero } from '@/components/sections/Hero';
import { Lap } from '@/components/sections/lap/Lap';
import { Projects } from '@/components/sections/Projects';
import { Results } from '@/components/sections/Results';
import { TechStack } from '@/components/sections/tech-stack/TechStack';
import type { Breakdown } from '@/content/data';
import { GLCanvas } from '@/gl/GLCanvas';
import { ensureGsap } from '@/motion/gsap';
import { SmoothScroll, useSmoothScroll } from '@/motion/SmoothScroll';
import { refreshSoon } from '@/motion/startup';
import { useAnchorNav } from '@/motion/useAnchorNav';
import { useLetterRoll } from '@/motion/useLetterRoll';
import { useSpeedSkew } from '@/motion/useSpeedSkew';

type Open = { sel: { b: Breakdown; o?: Origin } | null; arch: { o?: Origin } | null };

function Page() {
  const { lock, unlock } = useSmoothScroll();
  useAnchorNav();
  useSpeedSkew();
  useLetterRoll();
  const [open, setOpen] = useState<Open>({ sel: null, arch: null });
  const selRef = useRef<HTMLDivElement>(null), archRef = useRef<HTMLDivElement>(null);
  const returns = useRef<(HTMLElement | null)[]>([]);
  const anyOpen = !!(open.sel || open.arch);

  // Closing a dialog returns focus to what had it when the dialog opened.
  const push = useCallback(() => { returns.current.push(document.activeElement as HTMLElement | null); }, []);
  // Commit the close synchronously, so `inert` is gone before focus returns.
  const finishClose = useCallback((update: (s: Open) => Open) => {
    flushSync(() => setOpen(update));
    unlock();
    returns.current.pop()?.focus({ preventScroll: true });
  }, [unlock]);

  const openDetails = useCallback((b: Breakdown, o?: Origin) => { push(); lock(); setOpen(s => ({ ...s, sel: { b, o } })); }, [push, lock]);
  const openArchive = useCallback((o?: Origin) => { push(); lock(); setOpen(s => ({ ...s, arch: { o } })); }, [push, lock]);
  const closeSel = useCallback(() => closeWithWipe(selRef.current, open.sel?.o, () => finishClose(s => ({ ...s, sel: null }))), [open.sel, finishClose]);
  const closeArch = useCallback(() => closeWithWipe(archRef.current, open.arch?.o, () => finishClose(s => ({ ...s, arch: null }))), [open.arch, finishClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open.sel) closeSel(); else if (open.arch) closeArch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeSel, closeArch]);

  // Nav and track-map triggers are created before the sections' pins; once every
  // section is set up, re-sort all triggers by page position and re-measure.
  useEffect(() => {
    ensureGsap();
    refreshSoon();
  }, []);

  const api = useMemo(() => ({ openDetails, openArchive }), [openDetails, openArchive]);
  // The page never depends on which dialog is open: the same elements, so opening or
  // closing one doesn't re-render the whole site (a 40 to 50 ms frame each time).
  const page = useMemo(() => (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Lap />
        <Experience />
        <Projects />
        <TechStack />
        <Contributions />
        <Results />
      </main>
      <Contact />
      <TrackMap />
      <ScrollRail />
    </>
  ), []);
  const gl = useMemo(() => <GLCanvas />, []), intro = useMemo(() => <Intro />, []), cursor = useMemo(() => <Cursor />, []);

  return (
    <DialogCtx.Provider value={api}>
      <div aria-hidden="true" className="contour-fallback pointer-events-none fixed inset-0 -z-20" />
      {gl}
      <div inert={anyOpen || undefined}>{page}</div>
      {intro}
      {open.arch && <ArchiveGate dref={archRef} origin={open.arch.o} onClose={closeArch} />}
      {open.sel && <DetailsDialog dref={selRef} sel={open.sel.b} origin={open.sel.o} onClose={closeSel} />}
      {cursor}
    </DialogCtx.Provider>
  );
}

export default function App() {
  return (
    <SmoothScroll>
      <Page />
      {/* Cookieless page views and Core Web Vitals, sent only from the deployed site. */}
      <Analytics />
      <SpeedInsights />
    </SmoothScroll>
  );
}
