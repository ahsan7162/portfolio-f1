import { useLayoutEffect, type KeyboardEvent } from 'react';
import { archive, archiveBreakdown, type Breakdown } from '@/content/data';
import type { Origin } from '@/components/dialog-context';
import { gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

/** Keep Tab focus inside the open dialog. */
function trapTab(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab') return;
  const f = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')).filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// Circular wipe from the click point. A solid circle in the dialog's own colour
// scales up behind the content (transform only, so the compositor animates it
// without repainting the page), then the content rises in. Its radius is the
// exact distance to the farthest screen corner, so the wipe has no dead time at
// either end. While it runs the dialog's own background is cleared; afterwards
// the background is restored and the circle hidden, so resizes can't uncover it.
const reach = (o: Origin) => Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));

/** The running open animation per dialog, so a close that starts mid-open can cancel it. */
const opening = new WeakMap<HTMLElement, { tl?: gsap.core.Timeline; cancelled?: boolean }>();

function placeWipe(el: HTMLElement, o: Origin) {
  const c = el.querySelector<HTMLElement>('[data-dwipe]')!, r = reach(o);
  Object.assign(c.style, { width: `${2 * r}px`, height: `${2 * r}px`, left: `${o.x - r}px`, top: `${o.y - r}px`, visibility: 'visible' });
  el.style.background = 'transparent';
  return c;
}

/** Wipe in from the click point, then content rises in. */
function useDialogIn(ref: React.RefObject<HTMLDivElement | null>, origin: Origin | undefined, focusId: string) {
  useLayoutEffect(() => {
    const el = ref.current!;
    document.getElementById(focusId)?.focus({ preventScroll: true });
    if (!motionEnabled()) return;
    const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
    const circle = placeWipe(el, o);
    // Shared title: the card's title flies into the dialog heading (FLIP with one
    // uniform scale, so the text never stretches), alongside the circle wipe.
    const head = origin?.title ? el.querySelector<HTMLElement>('h2[data-din]') : null;
    const items = [...el.querySelectorAll('[data-din], [data-dhead]')].filter(n => n !== head);
    let raf = 0;
    const state: { tl?: gsap.core.Timeline; cancelled?: boolean } = {};
    opening.set(el, state);
    const ctx = gsap.context(() => {
      gsap.set(circle, { scale: 0, willChange: 'transform' });
      gsap.set(items, { autoAlpha: 0, y: 30 });
      if (head && origin?.title) {
        const to = head.getBoundingClientRect(), from = origin.title;
        gsap.set(head, { x: from.left - to.left, y: from.top - to.top, scale: from.height / to.height, transformOrigin: '0 0' });
      }
      // Start a frame after mount, so the cost of rendering the dialog isn't eaten by the tween.
      raf = requestAnimationFrame(() => {
        if (state.cancelled) return;
        state.tl = gsap.timeline({ onComplete: () => { el.style.background = ''; gsap.set(circle, { visibility: 'hidden', willChange: 'auto' }); } })
          // Fast-start ease: the circle's area grows with scale squared, so an ease-in would look stuck.
          .to(circle, { scale: 1, duration: DUR.wipe, ease: EASE.out })
          .to(items, { autoAlpha: 1, y: 0, stagger: { amount: 0.08 }, duration: DUR.split, ease: EASE.out }, 0.12);
        if (head) state.tl.to(head, { x: 0, y: 0, scale: 1, duration: DUR.wipe, ease: EASE.out }, 0);
      });
    }, el);
    return () => { cancelAnimationFrame(raf); ctx.revert(); };
  }, [ref, origin, focusId]);
}

/** Content drops out, the circle shrinks back to the click point, then really close. */
export function closeWithWipe(el: HTMLElement | null, origin: Origin | undefined, done: () => void) {
  if (!el || !motionEnabled()) { done(); return; }
  const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
  // Closing mid-open: stop the open wipe and shrink from wherever it got to.
  const open = opening.get(el);
  const from = open?.tl?.isActive() || (open && !open.tl) ? gsap.getProperty(el.querySelector('[data-dwipe]')!, 'scale') as number : 1;
  if (open) { open.cancelled = true; open.tl?.kill(); }
  const circle = placeWipe(el, o);
  gsap.set(circle, { scale: from, willChange: 'transform' });
  gsap.timeline({ onComplete: done })
    .to(el.querySelectorAll('[data-din], [data-dhead]'), { autoAlpha: 0, y: -16, duration: DUR.hit, ease: EASE.in, overwrite: true })
    .to(circle, { scale: 0, duration: DUR.split, ease: EASE.wipe }, 0.05);
}

/** The wipe circle: sits behind the dialog content, coloured like the dialog. */
const Wipe = ({ className }: { className: string }) => (
  <div data-dwipe aria-hidden="true" className={`pointer-events-none invisible fixed -z-10 rounded-full ${className}`} />
);

const shell = 'fixed inset-0 z-[70] isolate overflow-y-auto overscroll-contain bg-graphite text-fg';

export function ArchiveDialog({ origin, onClose, onOpenItem, dref }: {
  origin?: Origin; onClose: () => void; onOpenItem: (b: Breakdown, o: Origin) => void; dref: React.RefObject<HTMLDivElement | null>;
}) {
  useDialogIn(dref, origin, 'archClose');
  return (
    <div ref={dref} role="dialog" aria-modal="true" aria-labelledby="archTitle" onKeyDown={trapTab} data-lenis-prevent className={shell}>
      <Wipe className="bg-graphite" />
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
                className="group grid w-full grid-cols-[4rem_1fr] gap-4 py-5 text-left transition-colors hover:bg-fg/[0.03] md:grid-cols-[5rem_1.3fr_1fr_auto] md:items-center">
                <span className="font-mono text-sm text-mute group-hover:text-ac">{a.year}</span>
                <span>
                  <span className="block text-lg font-semibold [font-stretch:110%]">{a.name}</span>
                  <span className="block font-mono text-xs text-mute">{a.stack}</span>
                </span>
                <span className="col-start-2 text-mute md:col-start-auto">{a.note}</span>
                <span className="col-start-2 font-mono text-xs uppercase tracking-[0.12em] text-ac md:col-start-auto">Details →</span>
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
      <Wipe className="bg-carbon" />
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
              <div className="display text-4xl text-ac md:text-5xl">{h.stat}</div>
              <div>
                <h3 className="text-xl font-semibold [font-stretch:110%]">{h.title}</h3>
                <p className="mt-2 max-w-[65ch] leading-relaxed text-mute">{h.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
