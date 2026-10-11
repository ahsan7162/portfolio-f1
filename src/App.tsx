import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { DialogCtx, type Origin } from '@/components/dialog-context';
import { Cursor } from '@/components/Cursor';
import { ArchiveDialog, closeWithWipe, DetailsDialog } from '@/components/Dialogs';
import { Intro } from '@/components/Intro';
import { Nav } from '@/components/Nav';
import { ScrollRail } from '@/components/ScrollRail';
import { TrackMap } from '@/components/TrackMap';
import { About } from '@/components/sections/About';
import { Contact } from '@/components/sections/Contact';
import { Experience } from '@/components/sections/Experience';
import { Hero } from '@/components/sections/Hero';
import { Lap } from '@/components/sections/Lap';
import { Projects } from '@/components/sections/Projects';
import { Results } from '@/components/sections/Results';
import { TechStack } from '@/components/sections/TechStack';
import type { Breakdown } from '@/content/data';
import { GLCanvas } from '@/gl/GLCanvas';
import { ensureGsap, ScrollTrigger } from '@/motion/gsap';
import { SmoothScroll, useSmoothScroll } from '@/motion/SmoothScroll';
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

  // Remember what had focus when a dialog opens; closing returns it there.
  const push = useCallback(() => { returns.current.push(document.activeElement as HTMLElement | null); }, []);
  // Commit the close synchronously so `inert` is gone, then return focus.
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
  // section has mounted, re-sort all triggers by page position and re-measure.
  useEffect(() => {
    ensureGsap();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }, []);

  const api = useMemo(() => ({ openDetails, openArchive }), [openDetails, openArchive]);
  // The page itself never depends on which dialog is open: keep the same elements,
  // so opening or closing a dialog doesn't re-render the whole site (that cost a
  // 40 to 50 ms frame at the start of every open and the end of every close).
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
      {open.arch && <ArchiveDialog dref={archRef} origin={open.arch.o} onClose={closeArch} onOpenItem={openDetails} />}
      {open.sel && <DetailsDialog dref={selRef} sel={open.sel.b} origin={open.sel.o} onClose={closeSel} />}
      {cursor}
    </DialogCtx.Provider>
  );
}

export default function App() {
  return (
    <SmoothScroll>
      <Page />
    </SmoothScroll>
  );
}
