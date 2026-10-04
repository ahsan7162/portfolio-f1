import { useLayoutEffect, type KeyboardEvent } from 'react';
import { archive, archiveBreakdown, type Breakdown, type Delta } from '@/content/data';
import type { Origin } from '@/components/dialog-context';
import { gsap } from '@/motion/gsap';
import { digitRoll, revealWithin } from '@/motion/patterns';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';
import { cn } from '@/lib/utils';

/** Keep Tab focus inside the open dialog. */
function trapTab(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab') return;
  const f = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')).filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// Circular wipe from the click point: the dialog itself is clipped to a circle
// that grows from the click (clip-path), then the content rises in. Its radius is
// the exact distance to the farthest screen corner, so the wipe has no dead time at
// either end. (It used to scale a solid circle as wide as the screen diagonal on its
// own layer: a ~46M-pixel texture at 2x, which the GPU had to raster and upload.)
const reach = (o: Origin) => Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
const clip = (o: Origin, r: number) => `circle(${r.toFixed(1)}px at ${o.x.toFixed(1)}px ${o.y.toFixed(1)}px)`;

/** The running open animation per dialog, so a close that starts mid-open can cancel it. */
const opening = new WeakMap<HTMLElement, { tl?: gsap.core.Timeline; cancelled?: boolean }>();

// A row lands: its stat rolls (numbers) or rises (words), and its before/after bars
// race at the same speed (ease none: the bar is a stopwatch), so the faster result
// stops almost at once while the old one keeps crawling. Returns digitRoll's restore.
function rowIn(row: Element, tl: gsap.core.Timeline) {
  tl.fromTo(row, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: EASE.out });
  row.querySelectorAll<HTMLElement>('[data-bar]').forEach(b => {
    const k = Number(b.dataset.k);
    tl.fromTo(b, { scaleX: 0 }, { scaleX: k, duration: 1.2 * k, ease: EASE.none }, 0.25);
  });
  const stat = row.querySelector<HTMLElement>('[data-dstat]');
  if (!stat) return;
  if (/^[~\d]/.test(stat.textContent ?? '')) return digitRoll(stat, { timeline: tl, at: 0.1 });
  tl.fromTo(stat, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: DUR.split, ease: EASE.out }, 0.1);
}

/**
 * Wipe in from the click point, then the rows land: the ones on screen right after
 * the wipe starts, the rest as they scroll into view inside the dialog.
 */
function useDialogIn(ref: React.RefObject<HTMLDivElement | null>, origin: Origin | undefined, focusId: string) {
  useLayoutEffect(() => {
    const el = ref.current!;
    document.getElementById(focusId)?.focus({ preventScroll: true });
    if (!motionEnabled()) return;
    const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
    // Shared title: the card's title flies into the dialog heading (FLIP with one
    // uniform scale, so the text never stretches), alongside the circle wipe.
    const head = origin?.title ? el.querySelector<HTMLElement>('h2[data-din]') : null;
    const items = [...el.querySelectorAll('[data-din], [data-dhead]')].filter(n => n !== head);
    let raf = 0, stop: (() => void) | undefined;
    const state: { tl?: gsap.core.Timeline; cancelled?: boolean } = {};
    const restores: (() => void)[] = [];
    opening.set(el, state);
    const ctx = gsap.context(() => {
      gsap.set(el, { clipPath: clip(o, 0) });
      // Each row's entrance, built paused up front: digitRoll rewrites the stats before the title is measured.
      const rows = new Map(items.map(it => {
        const tl = gsap.timeline({ paused: true });
        const restore = rowIn(it, tl);
        if (restore) restores.push(restore);
        return [it, tl] as const;
      }));
      if (import.meta.env.DEV) Object.assign(window, { __dialogRows: [...rows.values()] });
      if (head && origin?.title) {
        const to = head.getBoundingClientRect(), from = origin.title;
        gsap.set(head, { x: from.left - to.left, y: from.top - to.top, scale: from.height / to.height, transformOrigin: '0 0' });
      }
      const onScreen = items.filter(it => it.getBoundingClientRect().top < innerHeight * 0.92);
      const below = items.filter(it => !onScreen.includes(it));
      // Start a frame after mount, so the cost of rendering the dialog isn't eaten by the tween.
      // ctx.add: this runs after the context function returned, and must still be reverted with it.
      raf = requestAnimationFrame(() => ctx.add(() => {
        if (state.cancelled) return;
        state.tl = gsap.timeline({ onComplete: () => { gsap.set(el, { clearProps: 'clipPath' }); } })
          // Fast-start ease: the circle's area grows with its radius squared, so an ease-in would look stuck.
          .to(el, { clipPath: clip(o, reach(o)), duration: DUR.open, ease: EASE.out });
        if (head) state.tl.to(head, { x: 0, y: 0, scale: 1, duration: DUR.open, ease: EASE.out }, 0);
        onScreen.forEach((it, i) => gsap.delayedCall(0.15 + (0.15 * i) / Math.max(1, onScreen.length - 1), () => rows.get(it)!.play()));
        stop = revealWithin(el, below, batch => ctx.add(() => batch.forEach((it, i) => gsap.delayedCall(i * 0.06, () => rows.get(it)!.play()))));
      }));
    }, el);
    return () => { cancelAnimationFrame(raf); stop?.(); ctx.revert(); restores.forEach(r => r()); };
  }, [ref, origin, focusId]);
}

/** Before and after on one scale (aria-hidden: the highlight's own text states both). */
function Bars({ d }: { d: Delta }) {
  const max = Math.max(d.from, d.to);
  const rows = [['Before', d.fromLabel, d.from], ['After', d.toLabel, d.to]] as const;
  return (
    <div aria-hidden="true" className="mt-6 grid max-w-[65ch] gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
      {rows.map(([tag, label, v]) => {
        // At least a sliver, so 100 ms against 30 s still shows on a phone.
        const k = Math.max(v / max, 0.006);
        return (
          <div key={tag} className="grid grid-cols-[3.75rem_minmax(0,1fr)_6.5rem] items-center gap-3">
            <span className="text-mute">{tag}</span>
            <span className="h-1.5 bg-fg/[0.07]">
              <span data-bar data-k={k} className={cn('block h-full origin-left', tag === 'After' ? 'bg-ac' : 'bg-fg/40')} style={{ transform: `scaleX(${k})` }} />
            </span>
            <span className={tag === 'After' ? 'text-ac' : 'text-mute'}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Content drops out, the circle shrinks back to the click point, then really close. */
export function closeWithWipe(el: HTMLElement | null, origin: Origin | undefined, done: () => void) {
  if (!el || !motionEnabled()) { done(); return; }
  const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
  // Closing mid-open: stop the open wipe and shrink from wherever it got to.
  const open = opening.get(el);
  const mid = open?.tl?.isActive() || (open && !open.tl);
  const r = mid ? parseFloat(String(el.style.clipPath).replace('circle(', '')) || 0 : reach(o);
  if (open) { open.cancelled = true; open.tl?.kill(); }
  gsap.timeline({ onComplete: done })
    .to(el.querySelectorAll('[data-din], [data-dhead]'), { autoAlpha: 0, y: -16, duration: 0.18, ease: EASE.in, overwrite: true })
    .fromTo(el, { clipPath: clip(o, r) }, { clipPath: clip(o, 0), duration: DUR.close, ease: EASE.wipe }, 0.08);
}

const shell = 'fixed inset-0 z-[70] isolate overflow-y-auto overscroll-contain bg-graphite text-fg';

export function ArchiveDialog({ origin, onClose, onOpenItem, dref }: {
  origin?: Origin; onClose: () => void; onOpenItem: (b: Breakdown, o: Origin) => void; dref: React.RefObject<HTMLDivElement | null>;
}) {
  useDialogIn(dref, origin, 'archClose');
  return (
    <div ref={dref} role="dialog" aria-modal="true" aria-labelledby="archTitle" onKeyDown={trapTab} data-lenis-prevent className={shell}>
      <div data-dhead className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-graphite/95 px-4 py-4 md:px-8">
        <span className="label">All projects</span>
        <button type="button" id="archClose" onClick={onClose} className="btn btn-ghost">Close</button>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
        <h2 id="archTitle" data-din className="display text-[clamp(2.6rem,8vw,7rem)]">All projects</h2>
        <p data-din className="mt-3 text-mute">Everything else I have shipped, 2021 to now.</p>
        <ul className="mt-12 border-t border-line">
          {archive.map(a => (
            <li key={a.name} data-din className="border-b border-line">
              <button type="button" onClick={e => onOpenItem(archiveBreakdown(a), { x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2 })}
                className="group relative grid w-full grid-cols-[4rem_1fr] gap-4 py-5 text-left transition-colors hover:bg-fg/[0.03] md:grid-cols-[5rem_1.3fr_1fr_auto] md:items-center">
                {/* Sector line: draws in from the left on hover, leaves to the right, quicker. */}
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px origin-right scale-x-0 bg-ac transition-transform duration-(--dur-split) ease-out-expo group-hover:origin-left group-hover:scale-x-100 group-hover:duration-(--dur-wipe) group-focus-visible:origin-left group-focus-visible:scale-x-100" />
                <span className="font-mono text-sm text-mute group-hover:text-ac">{a.year}</span>
                <span>
                  <span className="block text-lg font-semibold [font-stretch:110%]">{a.name}</span>
                  <span className="block font-mono text-xs text-mute">{a.stack}</span>
                </span>
                <span className="col-start-2 text-mute md:col-start-auto">{a.note}</span>
                <span className="col-start-2 font-mono text-xs uppercase tracking-[0.12em] text-ac md:col-start-auto">Details <span aria-hidden="true" className="inline-block transition-transform duration-(--dur-split) ease-out-expo group-hover:translate-x-1.5">→</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DetailsDialog({ sel, origin, onClose, dref }: { sel: Breakdown; origin?: Origin; onClose: () => void; dref: React.RefObject<HTMLDivElement | null> }) {
  useDialogIn(dref, origin, 'selClose');
  return (
    <div ref={dref} role="dialog" aria-modal="true" aria-labelledby="selTitle" onKeyDown={trapTab} data-lenis-prevent className={`${shell} z-[75] bg-carbon`}>
      <div data-dhead className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-carbon/95 px-4 py-4 md:px-8">
        <span className="label">Details</span>
        <button type="button" id="selClose" onClick={onClose} className="btn btn-ghost">Close</button>
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
        <p data-din className="font-mono text-xs uppercase tracking-[0.12em] text-mute">{sel.dates}, {sel.loc}, {sel.role}</p>
        <h2 id="selTitle" data-din className="display mt-4 text-[clamp(2.6rem,8vw,7rem)]">{sel.company}</h2>
        <div className="mt-12 border-t border-line">
          {sel.highlights.map(h => (
            <div key={h.title} data-din className="grid gap-4 border-b border-line py-8 md:grid-cols-[12rem_1fr]">
              <div className="display text-4xl text-ac md:text-5xl"><span data-dstat className="inline-block">{h.stat}</span></div>
              <div>
                <h3 className="text-xl font-semibold [font-stretch:110%]">{h.title}</h3>
                <p className="mt-2 max-w-[65ch] leading-relaxed text-mute">{h.text}</p>
                {h.delta && <Bars d={h.delta} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
