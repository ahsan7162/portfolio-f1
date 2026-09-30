import { useLayoutEffect, type KeyboardEvent } from 'react';
import { archive, archiveBreakdown, type Breakdown } from '@/content/data';
import type { Origin } from '@/components/dialog-context';
import { gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';

/** Keep Tab focus inside the open dialog. */
function trapTab(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab') return;
  const f = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')).filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/** Circular wipe from the click point, then content rises in. */
function useDialogIn(ref: React.RefObject<HTMLDivElement | null>, origin: Origin | undefined, focusId: string) {
  useLayoutEffect(() => {
    const el = ref.current!;
    document.getElementById(focusId)?.focus({ preventScroll: true });
    if (!motionEnabled()) return;
    const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { clipPath: `circle(0% at ${o.x}px ${o.y}px)` }, { clipPath: `circle(150% at ${o.x}px ${o.y}px)`, duration: 0.8, ease: EASE.wipe });
      gsap.from(el.querySelectorAll('[data-din]'), { y: 30, autoAlpha: 0, stagger: 0.05, duration: 0.7, ease: EASE.soft, delay: 0.25 });
    }, el);
    return () => ctx.revert();
  }, [ref, origin, focusId]);
}

/** Play the wipe backwards, then really close. */
export function closeWithWipe(el: HTMLElement | null, origin: Origin | undefined, done: () => void) {
  if (!el || !motionEnabled()) { done(); return; }
  const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
  gsap.to(el, { clipPath: `circle(0% at ${o.x}px ${o.y}px)`, duration: 0.55, ease: EASE.inOut, onComplete: done });
}

const shell = 'fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-graphite text-fg';

export function ArchiveDialog({ origin, onClose, onOpenItem, dref }: {
  origin?: Origin; onClose: () => void; onOpenItem: (b: Breakdown, o: Origin) => void; dref: React.RefObject<HTMLDivElement | null>;
}) {
  useDialogIn(dref, origin, 'archClose');
  return (
    <div ref={dref} role="dialog" aria-modal="true" aria-labelledby="archTitle" onKeyDown={trapTab} data-lenis-prevent className={shell}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-graphite/95 px-4 py-4 md:px-8">
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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-carbon/95 px-4 py-4 md:px-8">
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
