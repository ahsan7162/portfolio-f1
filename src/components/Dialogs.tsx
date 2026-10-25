import { useLayoutEffect, type ReactNode, type RefObject } from 'react';
import type { Breakdown, Delta } from '@/content/data';
import type { Origin } from '@/components/dialog-context';
import { trapTab } from '@/lib/focus';
import { cn } from '@/lib/utils';
import { gsap } from '@/motion/gsap';
import { digitRoll, revealWithin } from '@/motion/patterns';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

// Circular wipe from the click point: the dialog itself is clipped to a circle
// that grows from the click (clip-path), then the content rises in. Its radius is
// the exact distance to the farthest screen corner, so the wipe has no dead time at
// either end. (It used to scale a solid circle as wide as the screen diagonal on its
// own layer: a ~46M-pixel texture at 2x, which the GPU had to raster and upload.)
const reach = (o: Origin) => Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
const clip = (o: Origin, r: number) => `circle(${r.toFixed(1)}px at ${o.x.toFixed(1)}px ${o.y.toFixed(1)}px)`;
/** Dialogs opened without a click point (find-in-page) wipe from the middle of the screen. */
const centre = (): Origin => ({ x: innerWidth / 2, y: innerHeight / 2 });

/** The running open animation per dialog, so a close that starts mid-open can cancel it. */
const opening = new WeakMap<HTMLElement, { tl?: gsap.core.Timeline; cancelled?: boolean }>();

// A row lands: its stat rolls (numbers) or rises (words), and its before/after bars
// race at the same speed (ease none: the bar is a stopwatch), so the faster result
// stops almost at once while the old one keeps crawling. Returns digitRoll's restore.
// Opacity, not autoAlpha: a row waiting to land must stay focusable, or the Close button
// (in the header row) loses focus as the dialog opens and Tab skips rows below the fold.
function rowIn(row: Element, tl: gsap.core.Timeline) {
  tl.fromTo(row, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: EASE.out });
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
 * the wipe starts, the rest as they scroll into view inside the dialog. Without the
 * wipe (`wipe` false: a loader already covers the screen) only the rows land.
 */
function useDialogIn(ref: RefObject<HTMLDivElement | null>, origin: Origin | undefined, wipe = true) {
  useLayoutEffect(() => {
    const el = ref.current!;
    el.querySelector<HTMLElement>('[data-dclose]')?.focus({ preventScroll: true });
    if (!motionEnabled()) return;
    const o = origin ?? centre();
    // Shared title: the card's title flies into the dialog heading (FLIP with one
    // uniform scale, so the text never stretches), alongside the circle wipe.
    const head = origin?.title ? el.querySelector<HTMLElement>('h2[data-din]') : null;
    const items = [...el.querySelectorAll('[data-din], [data-dhead]')].filter(n => n !== head);
    let raf = 0, stop: (() => void) | undefined;
    const state: { tl?: gsap.core.Timeline; cancelled?: boolean } = {};
    const restores: (() => void)[] = [];
    opening.set(el, state);
    const ctx = gsap.context(() => {
      if (wipe) gsap.set(el, { clipPath: clip(o, 0) });
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
        state.tl = gsap.timeline({ onComplete: () => { gsap.set(el, { clearProps: 'clipPath' }); } });
        // Fast-start ease: the circle's area grows with its radius squared, so an ease-in would look stuck.
        if (wipe) state.tl.to(el, { clipPath: clip(o, reach(o)), duration: DUR.open, ease: EASE.out });
        if (head) state.tl.to(head, { x: 0, y: 0, scale: 1, duration: DUR.open, ease: EASE.out }, 0);
        onScreen.forEach((it, i) => gsap.delayedCall(0.15 + (0.15 * i) / Math.max(1, onScreen.length - 1), () => rows.get(it)!.play()));
        stop = revealWithin(el, below, batch => ctx.add(() => batch.forEach((it, i) => gsap.delayedCall(i * 0.06, () => rows.get(it)!.play()))));
      }));
    }, el);
    return () => { cancelAnimationFrame(raf); stop?.(); ctx.revert(); restores.forEach(r => r()); };
  }, [ref, origin, wipe]);
}

/** Before and after on one scale (aria-hidden: the highlight's own text states both). */
export function Bars({ d }: { d: Delta }) {
  const max = Math.max(d.from, d.to);
  const rows = [['Before', d.fromLabel, d.from], ['After', d.toLabel, d.to]] as const;
  return (
    <div aria-hidden="true" className="mt-6 grid max-w-[65ch] gap-2 font-mono text-xs">
      {rows.map(([tag, label, v]) => {
        // At least a sliver, so 100 ms against 30 s still shows on a phone.
        const k = Math.max(v / max, 0.006);
        return (
          <div key={tag} className="grid grid-cols-[3.75rem_minmax(0,1fr)_6.5rem] items-center gap-3">
            <span className="text-mute">{tag}</span>
            <span className="h-1.5 bg-fg/[0.07]">
              <span data-bar data-k={k} className={cn('block h-full origin-left', tag === 'After' ? 'bg-ac' : 'bg-fg/40')} style={{ transform: `scaleX(${k})` }} />
            </span>
            <span className={tag === 'After' ? 'text-ac2' : 'text-mute'}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Content drops out, the circle shrinks back to the click point, then really close. */
export function closeWithWipe(el: HTMLElement | null, origin: Origin | undefined, done: () => void) {
  if (!el || !motionEnabled()) { done(); return; }
  const o = origin ?? centre();
  // Closing mid-open: stop the open wipe and shrink from wherever it got to.
  const open = opening.get(el);
  const mid = open?.tl?.isActive() || (open && !open.tl);
  const r = mid ? parseFloat(el.style.clipPath.replace('circle(', '')) || 0 : reach(o);
  if (open) { open.cancelled = true; open.tl?.kill(); }
  gsap.timeline({ onComplete: done })
    .to(el.querySelectorAll('[data-din], [data-dhead]'), { autoAlpha: 0, y: -16, duration: 0.18, ease: EASE.in, overwrite: true })
    .fromTo(el, { clipPath: clip(o, r) }, { clipPath: clip(o, 0), duration: DUR.close, ease: EASE.wipe }, 0.08);
}

// The archive sits on graphite; details open over it, one layer up, on carbon.
const TONE = {
  graphite: { box: 'z-[70] bg-graphite', head: 'bg-graphite/95' },
  carbon: { box: 'z-[75] bg-carbon', head: 'bg-carbon/95' },
};

export type DialogProps = {
  origin?: Origin; onClose: () => void; dref: RefObject<HTMLDivElement | null>;
  /** false: no circle wipe, because something else (a loader) already covers the screen. */
  wipe?: boolean;
};

/** The full-screen dialog shell: sticky header with its label and Close, Tab kept inside, the wipe in. */
export function DialogFrame({ origin, onClose, dref, wipe, label, titleId, tone, width, children }: DialogProps & {
  label: string; titleId: string; tone: keyof typeof TONE; width: string; children: ReactNode;
}) {
  useDialogIn(dref, origin, wipe);
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the dialog keeps Tab inside itself
    <div ref={dref} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={e => trapTab(e, e.currentTarget)} data-lenis-prevent
      className={cn('fixed inset-0 isolate overflow-y-auto overscroll-contain text-fg', TONE[tone].box)}>
      <div data-dhead className={cn('sticky top-0 z-10 flex items-center justify-between border-b border-line px-4 py-4 md:px-8', TONE[tone].head)}>
        <span className="label">{label}</span>
        <button type="button" data-dclose onClick={onClose} className="btn btn-ghost"><span data-letter-roll>Close</span></button>
      </div>
      <div className={cn('mx-auto px-4 py-12 md:px-8', width)}>{children}</div>
    </div>
  );
}

export function DetailsDialog({ sel, ...frame }: DialogProps & { sel: Breakdown }) {
  return (
    <DialogFrame {...frame} label="Details" titleId="selTitle" tone="carbon" width="max-w-[1100px]">
      <h2 id="selTitle" data-din className="display break-words text-display-lead md:text-display-section">{sel.company}</h2>
      <p data-din className="mt-4 text-mute">{sel.role}, {sel.loc}, {sel.dates}</p>
      {/* One grid for every row (each row is a subgrid), so the stat column fits the widest
          stat in this breakdown ("OPENAPI", "Jinja2") and the text still lines up row to row. */}
      <div className="mt-12 grid border-t border-line md:grid-cols-[minmax(12rem,max-content)_1fr] md:gap-x-4">
        {sel.highlights.map(h => (
          <div key={h.title} data-din className="grid gap-4 border-b border-line py-8 md:col-span-2 md:grid-cols-subgrid">
            <div className="display text-display-stat text-ac2"><span data-dstat className="inline-block">{h.stat}</span></div>
            <div>
              <h3 className="text-xl font-semibold font-stretch-semi-expanded">{h.title}</h3>
              <p className="mt-2 max-w-[65ch] leading-relaxed text-mute">{h.text}</p>
              {h.delta && <Bars d={h.delta} />}
            </div>
          </div>
        ))}
      </div>
    </DialogFrame>
  );
}
