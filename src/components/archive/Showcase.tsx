import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { archive, type ArchiveItem } from '@/content/data';
import { Arrow } from '@/components/Arrow';
import { Bars, DialogFrame, type DialogProps } from '@/components/Dialogs';
import { twoDigits } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ensureGsap, Flip, gsap } from '@/motion/gsap';
import { curtainReveal, revealWithin } from '@/motion/patterns';
import { finePointer, motionEnabled } from '@/motion/prefs';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import type { SceneApi } from './scene';
import { SCENES } from './scenes';

// The All projects screen, a contact sheet: every project is a card with its own scene,
// in rows of two and three. It loads with its own code chunk, behind ArchiveGate.
//
// On scroll, each card rises into place (a row lands left to right), its scene opens
// through the red oval curtain the featured cards use, and plays once the curtain has
// lifted; on desktop the scenes drift a little inside their frames as the dialog scrolls.
// A card opens into the full project view with GSAP Flip: the scene grows from the card
// into the view, and shrinks back into the card when the view closes.

const N = archive.length;
// Rows of two and three on a six-column grid: [3,3] [2,2,2] [3,3] [2,2,2].
const SPAN = ['lg:col-span-3', 'lg:col-span-3', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2',
  'lg:col-span-3', 'lg:col-span-3', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2'];
/** Opening and closing a project: one shape between card and view. */
const MORPH = { duration: 0.55, ease: EASE.out };

/** origin: the card the view opened from (hidden while it is open); sel: the project shown. */
type View = { origin: number; sel: number };

export default function ArchiveShowcase(frame: DialogProps) {
  const [view, setView] = useState<View | null>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]), boxes = useRef<(HTMLDivElement | null)[]>([]);
  const apis = useRef<(SceneApi | null)[]>([]);
  const handles = useMemo(() => archive.map((_, i) => (api: SceneApi | null) => { apis.current[i] = api; }), [apis]);
  const pane = useRef<HTMLDivElement>(null), bg = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLDivElement>(null), info = useRef<HTMLDivElement>(null), back = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  /** Cards that have landed; one the view closes into early is landed on the spot. */
  const landed = useRef(new Set<number>());

  // Cards on scroll: rise, curtain, then the scene plays. Desktop: scenes drift as it scrolls.
  useLayoutEffect(() => {
    const root = frame.dref.current;
    if (!root || !motionEnabled()) return;
    ensureGsap();
    const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
    const panels: (() => void)[] = [];
    let stop: (() => void) | undefined, first = true;
    const ctx = gsap.context(() => {
      // Opacity, not autoAlpha: a card waiting to land stays focusable.
      gsap.set(cards, { opacity: 0, y: 48 });
      stop = revealWithin(root, cards, batch => ctx.add(() => {
        // The first cards wait for the dialog's wipe to be well under way.
        const base = first ? 0.3 : 0;
        first = false;
        batch.filter(el => !landed.current.has(Number((el as HTMLElement).dataset.card))).forEach((el, k) => {
          const card = el as HTMLElement, i = Number(card.dataset.card);
          landed.current.add(i);
          const tl = gsap.timeline({ delay: base + k * STAGGER.card });
          tl.to(card, { opacity: 1, y: 0, duration: DUR.reveal, ease: EASE.out, clearProps: 'transform' }, 0)
            .from(card.querySelectorAll('[data-cardtxt]'), { opacity: 0, y: 14, duration: DUR.wipe, ease: EASE.out, stagger: 0.06, clearProps: 'transform' }, 0.3)
            .call(() => apis.current[i]?.prime(), undefined, 0.05);
          const rm = curtainReveal(boxes.current[i], { timeline: tl, at: 0.05 });
          if (rm) panels.push(rm);
          tl.call(() => apis.current[i]?.play(), undefined, 0.05 + DUR.reveal);
        });
      }));
      if (finePointer() && matchMedia('(min-width: 768px)').matches) {
        cards.forEach(card => gsap.fromTo(card.querySelector('[data-drift]'), { yPercent: -4, scale: 1.08 }, {
          yPercent: 4, scale: 1.08, ease: EASE.none,
          scrollTrigger: { trigger: card, scroller: root, start: 'top bottom', end: 'bottom top', scrub: true },
        }));
      }
    }, root);
    return () => { stop?.(); panels.forEach(p => p()); ctx.revert(); };
  }, [frame.dref, apis, boxes, landed]);

  const open = (i: number) => {
    if (busy.current || view) return;
    const state = motionEnabled() ? Flip.getState(boxes.current[i]) : null;
    flushSync(() => setView({ origin: i, sel: i }));
    back.current?.focus({ preventScroll: true });
    if (!state) return;
    busy.current = true;
    gsap.timeline({ onComplete: () => { busy.current = false; } })
      .add(Flip.from(state, { targets: big.current, scale: true, ...MORPH }), 0)
      .fromTo(bg.current, { opacity: 0 }, { opacity: 1, duration: DUR.split, ease: EASE.out }, 0)
      .fromTo([bar.current, info.current], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: DUR.wipe, ease: EASE.out, stagger: 0.06, clearProps: 'transform' }, 0.15);
  };

  const close = () => {
    const v = view;
    if (!v || busy.current) return;
    const done = () => {
      flushSync(() => setView(null));
      busy.current = false;
      tiles.current[v.sel]?.focus({ preventScroll: true });
    };
    const root = frame.dref.current, tile = boxes.current[v.sel];
    if (!motionEnabled() || !root || !tile || !big.current) { done(); return; }
    busy.current = true;
    // Behind the view, bring the card it closes into on screen, so the shape has a place to land.
    const r = tile.getBoundingClientRect();
    if (r.bottom < 64 || r.top > innerHeight) root.scrollBy({ top: r.top - (innerHeight - r.height) / 2 });
    // A card not yet revealed (reached with the arrow keys) lands at once, so the shape has it to land in.
    if (!landed.current.has(v.sel)) {
      landed.current.add(v.sel);
      gsap.set(tile.closest('[data-card]'), { opacity: 1, clearProps: 'transform' });
    }
    const state = Flip.getState(big.current);
    gsap.set(big.current, { opacity: 0 });
    // The card's scene, lifted above the view while it shrinks back into place.
    gsap.set(tile, { visibility: 'visible', zIndex: 30 });
    gsap.timeline({ onComplete: () => { gsap.set(tile, { clearProps: 'visibility,zIndex' }); done(); } })
      .to([bar.current, info.current, bg.current], { opacity: 0, duration: 0.25, ease: EASE.in }, 0)
      .add(Flip.from(state, { targets: tile, scale: true, ...MORPH }), 0);
  };

  /** The next or previous project inside the view: out on ease-in, in on expo-out. */
  const step = (d: 1 | -1) => {
    const v = view;
    if (!v || busy.current) return;
    const next = { ...v, sel: (v.sel + d + N) % N };
    if (!motionEnabled()) { setView(next); return; }
    busy.current = true;
    gsap.to([big.current, info.current], { x: -40 * d, opacity: 0, duration: 0.2, ease: EASE.in, onComplete: () => {
      flushSync(() => setView(next));
      if (pane.current) pane.current.scrollTop = 0;
      gsap.fromTo([big.current, info.current], { x: 60 * d, opacity: 0 }, {
        x: 0, opacity: 1, duration: DUR.split, ease: EASE.out, stagger: 0.05, clearProps: 'transform',
        onComplete: () => { busy.current = false; },
      });
    } });
  };

  // Keys while a project is open. Capture phase: Escape closes the view before the dialog.
  useKeys(e => {
    if (!view) return false;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else return false;
    return true;
  });
  // While a project is open, the dialog header behind it leaves the Tab order.
  useEffect(() => {
    const head = frame.dref.current?.querySelector<HTMLElement>('[data-dhead]');
    if (head) head.inert = !!view;
  }, [view, frame.dref]);

  const Big = view ? SCENES[archive[view.sel].name] : null;

  return (
    <DialogFrame {...frame} label="All projects" titleId="archTitle" tone="graphite" width="max-w-[1400px]">
      <h2 id="archTitle" data-din className="display text-display-section">All projects</h2>
      <p data-din className="mt-3 text-mute">Everything else I have shipped, 2021 to now. Open one to see what it did.</p>
      <ul inert={!!view || undefined} className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
        {archive.map((a, i) => {
          const S = SCENES[a.name];
          return (
            <li key={a.name} data-card={i} className={SPAN[i]}>
              <button type="button" data-tile ref={el => { tiles.current[i] = el; }} onClick={() => open(i)} data-cursor="view"
                className="group relative block h-full w-full border border-line bg-graphite text-left transition-colors duration-(--dur-hit) hover:border-ac2/60">
                <div ref={el => { boxes.current[i] = el; }} data-flip-id={`arch-${i}`}
                  className={cn('relative aspect-[16/10] overflow-hidden border-b border-line bg-carbon', view?.origin === i && 'invisible')}>
                  <div data-drift className="h-full w-full"><S handle={handles[i]} /></div>
                </div>
                <TileText a={a} />
              </button>
            </li>
          );
        })}
      </ul>

      {view && Big && (
        <div ref={pane} role="group" aria-label={archive[view.sel].name} data-lenis-prevent className="fixed inset-0 z-20 overflow-y-auto overscroll-contain">
          <div ref={bg} aria-hidden="true" className="pointer-events-none fixed inset-0 bg-graphite" />
          <div ref={bar} className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-graphite/95 px-4 py-3 md:px-8">
            <button ref={back} type="button" onClick={close} className="btn btn-ghost"><span aria-hidden="true" className="inline-block rotate-180"><Arrow /></span> All projects</button>
            <div className="flex items-center gap-3">
              <span className="label hidden sm:inline">{twoDigits(view.sel + 1)} / {twoDigits(N)}</span>
              <RoundBtn dir={-1} onClick={() => step(-1)} label="Previous project" />
              <RoundBtn dir={1} onClick={() => step(1)} label="Next project" />
            </div>
          </div>
          <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
            <div className="relative aspect-[16/10] lg:sticky lg:top-24 lg:self-start">
              <div ref={big} key={view.sel} data-flip-id={`arch-${view.sel}`} className="absolute inset-0 overflow-hidden border border-line bg-carbon">
                <Big autoplay={view.sel === view.origin ? MORPH.duration : DUR.split} />
              </div>
            </div>
            <div ref={info} key={`info-${view.sel}`}><Info a={archive[view.sel]} i={view.sel} /></div>
          </div>
        </div>
      )}
    </DialogFrame>
  );
}

/** A window keydown handler (capture phase) that always sees the latest render; true = handled. */
function useKeys(handler: (e: KeyboardEvent) => boolean) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (ref.current(e)) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}

const RoundBtn = ({ dir, onClick, label }: { dir: -1 | 1; onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className="grid size-12 place-items-center rounded-full border border-line text-fg transition-colors duration-(--dur-hit) hover:border-ac2 hover:text-ac2">
    <span aria-hidden="true" className={cn('inline-block', dir < 0 && 'rotate-180')}><Arrow /></span>
  </button>
);

const TileText = ({ a }: { a: ArchiveItem }) => (
  <span className="block p-5 md:p-6">
    <span data-cardtxt className="label block">{a.year}, {a.ctx}</span>
    <span data-cardtxt className="mt-3 block text-lg font-semibold font-stretch-semi-expanded">{a.name}</span>
    <span data-cardtxt className="mt-2 block text-sm leading-relaxed text-mute">{a.note}</span>
    <span data-cardtxt className="mt-4 flex items-center justify-between gap-4 text-sm">
      <span className="truncate font-mono text-xs text-mute">{a.stack}</span>
      <span className="shrink-0 font-semibold text-ac2">Open <span aria-hidden="true" className="inline-block transition-transform duration-(--dur-split) ease-out-expo group-hover:translate-x-1.5"><Arrow /></span></span>
    </span>
  </span>
);

/** The project's text: name, year and team, note, stack, and every highlight with its stat.
 *  Phones get the position here, since the bar's counter has no room there. */
function Info({ a, i }: { a: ArchiveItem; i: number }) {
  return (
    <div>
      <h3 className="display break-words text-display-card">{a.name}</h3>
      <p className="label mt-3 flex justify-between gap-4">
        <span>{a.year}, {a.ctx}</span>
        <span className="font-mono text-xs tabular-nums sm:hidden">{twoDigits(i + 1)} / {twoDigits(N)}</span>
      </p>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-mute">{a.note}</p>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${a.name} stack`}>
        {a.stack.split(', ').map(s => <li key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs">{s}</li>)}
      </ul>
      <div className="mt-8 border-t border-line">
        {a.highlights.map(h => (
          <div key={h.title} className="grid gap-x-6 gap-y-2 border-b border-line py-5 sm:grid-cols-[minmax(6rem,max-content)_1fr]">
            <div className="display text-display-small text-ac2">{h.stat}</div>
            <div>
              <p className="font-semibold font-stretch-semi-expanded">{h.title}</p>
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-mute">{h.text}</p>
              {h.delta && <Bars d={h.delta} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
