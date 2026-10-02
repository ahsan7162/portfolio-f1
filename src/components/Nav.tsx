import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Scramble } from '@/components/Scramble';
import { originOf, useDialogs } from '@/components/dialog-context';
import { archive, CV_FILE, EMAIL, GITHUB, jobs, LINKEDIN, projects } from '@/content/data';
import { Flip, gsap, ScrollTrigger } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { useSmoothScroll } from '@/motion/SmoothScroll';
import { DUR, EASE } from '@/motion/tokens';
import { useNavHeight } from '@/motion/useNavHeight';
import { cn } from '@/lib/utils';

export const cvHref = () => `${import.meta.env.BASE_URL}${CV_FILE}`;

/** Every section, in page order. Projects opens the full list instead of scrolling. */
const MENU = [
  { id: 'about', label: 'About' },
  { id: 'timeline', label: 'Career timeline' },
  { id: 'experience', label: 'Work experience', children: true },
  { id: 'projects', label: 'Projects', archive: true },
  { id: 'skills', label: 'Tech stack' },
  { id: 'results', label: 'Results and education' },
  { id: 'contact', label: 'Contact' },
] as const;

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * Always-visible top bar with a full-screen menu (Lando's overlay nav).
 * The menu links stay in the HTML while closed, so crawlers still see them.
 */
export function Nav() {
  const { openDetails, openArchive } = useDialogs();
  const { lock, unlock } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLUListElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  useNavHeight(ref);

  // Which section is on screen, marked in the menu. Measured after the pins (priority -1).
  useEffect(() => {
    const triggers = MENU.flatMap(m => {
      const el = document.getElementById(m.id);
      return el ? [ScrollTrigger.create({
        trigger: el, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1,
        onToggle: s => setCurrent(c => (s.isActive ? m.id : c === m.id ? null : c)),
      })] : [];
    });
    return () => triggers.forEach(t => t.kill());
  }, []);

  // Open: the panel wipes down from the top, then the rows rise in (under 0.5 s).
  // Close is its own quicker move: rows and side drop out, then the wipe closes.
  useEffect(() => {
    const p = panel.current!;
    if (!motionEnabled()) { gsap.set(p, { autoAlpha: open ? 1 : 0 }); return; }
    if (!open && !tl.current) return; // first render: the menu starts closed
    const rows = p.querySelectorAll('[data-mrow]'), side = p.querySelectorAll('[data-mside]');
    tl.current?.kill();
    tl.current = open
      ? gsap.timeline()
        .set(p, { autoAlpha: 1 })
        .fromTo(p, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.wipe, ease: EASE.wipe })
        .fromTo(rows, { yPercent: 110 }, { yPercent: 0, duration: DUR.split, stagger: 0.015, ease: EASE.out }, 0.08)
        .fromTo(side, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.split, stagger: 0.02, ease: EASE.out }, 0.12)
      : gsap.timeline()
        .to(rows, { yPercent: 110, duration: DUR.hit, ease: EASE.in })
        .to(side, { autoAlpha: 0, duration: DUR.hit, ease: EASE.in }, 0)
        .to(p, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.2, ease: EASE.in }, 0.08)
        .set(p, { autoAlpha: 0 });
  }, [open]);
  useEffect(() => () => { tl.current?.kill(); }, []);

  // Work experience children: the rows below slide with Flip (transforms only, no
  // height tween), and the job rows rise in. Closing is quicker than opening.
  const subReady = useRef(false);
  useEffect(() => {
    const ul = subRef.current!;
    if (!subReady.current) { subReady.current = true; return; }
    const set = () => gsap.set(ul, { height: expOpen ? 'auto' : 0 });
    if (!motionEnabled()) { set(); return; }
    const items = ul.querySelectorAll('li');
    const flip = (duration: number) => {
      const state = Flip.getState(panel.current!.querySelectorAll('[data-mflip]'));
      set();
      Flip.from(state, { duration, ease: EASE.out });
    };
    if (expOpen) {
      flip(DUR.split);
      gsap.fromTo(items, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: DUR.split, stagger: 0.03, ease: EASE.out, overwrite: true });
    } else {
      gsap.to(items, { autoAlpha: 0, duration: 0.1, ease: EASE.in, overwrite: true, onComplete: () => flip(0.2) });
    }
  }, [expOpen]);

  const show = () => { lock(); setOpen(true); requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })); };
  const hide = (refocus = true) => {
    if (!open) return;
    unlock();
    setOpen(false);
    if (refocus) btn.current?.focus({ preventScroll: true });
  };

  // Keyboard: Esc closes, Tab stays inside the bar and the open menu.
  const onKey = (e: ReactKeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') { e.stopPropagation(); hide(); return; }
    if (e.key !== 'Tab') return;
    const els = [...ref.current!.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  // Section links: unlock first so the page-wide anchor handler can scroll.
  const go = () => hide(false);

  const rowText = 'display block text-[clamp(1.9rem,4.6vw,3.9rem)] transition-[color,transform] duration-(--dur-hit) ease-out-expo group-hover:translate-x-3 group-hover:text-ac group-focus-visible:translate-x-3 group-focus-visible:text-ac';

  return (
    <header ref={ref} onKeyDown={onKey} className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-(--dur-hit)', open ? 'bg-carbon' : 'bg-carbon/85')}>
      {/* Full-screen menu. Behind the bar, so the bar's button also closes it. */}
      <div ref={panel} id="site-menu" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Site menu"
        className="invisible fixed inset-0 overflow-y-auto bg-carbon opacity-0">
        <div aria-hidden="true" className="checker pointer-events-none absolute inset-x-0 top-16 h-2 opacity-60" />
        <div className="mx-auto grid min-h-full max-w-[1400px] gap-12 px-4 pb-12 pt-28 md:grid-cols-[1fr_320px] md:px-8 md:pt-32">
          <nav aria-label="Sections">
            <ol className="border-t border-line">
              {MENU.map((m, i) => {
                const n = <span aria-hidden="true" className="w-8 shrink-0 pt-[0.6em] font-mono text-xs text-mute md:w-12">{String(i + 1).padStart(2, '0')}</span>;
                const dot = current === m.id && <span aria-hidden="true" className="ml-3 inline-block size-2 shrink-0 self-center rounded-full bg-ac" />;
                return (
                  <li key={m.id} data-mflip className="border-b border-line">
                    <div className="overflow-hidden">
                      <div data-mrow className="flex items-stretch">
                        {'archive' in m ? (
                          <button type="button" onClick={e => { const o = originOf(e); hide(false); openArchive(o); }}
                            className="group flex flex-1 items-start py-3 text-left md:py-4">
                            {n}
                            <span className={rowText}>{m.label}</span>
                            <span className="ml-4 self-center rounded-full bg-ac px-2.5 py-0.5 font-mono text-xs text-carbon">{projects.length + archive.length}</span>
                            {dot}
                            <span aria-hidden="true" className="ml-auto self-center font-mono text-sm text-mute transition-colors group-hover:text-ac">See all →</span>
                          </button>
                        ) : (
                          <a href={`#${m.id}`} onClick={go} aria-current={current === m.id ? 'location' : undefined}
                            className="group flex flex-1 items-start py-3 md:py-4">
                            {n}
                            <span className={rowText}>{m.label}</span>
                            {dot}
                          </a>
                        )}
                        {'children' in m && (
                          <button type="button" onClick={() => setExpOpen(v => !v)} aria-expanded={expOpen} aria-controls="menu-jobs"
                            aria-label={`${expOpen ? 'Hide' : 'Show'} each work experience`}
                            className="grid w-14 shrink-0 place-items-center border-l border-line text-2xl text-mute transition-colors hover:text-ac md:w-20">
                            <span aria-hidden="true" className={cn('transition-transform duration-(--dur-hit) ease-out-expo', expOpen && 'rotate-45 text-ac')}>+</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {'children' in m && (
                      <ul ref={subRef} id="menu-jobs" aria-label="Work experience" className="h-0 overflow-hidden">
                        {jobs.map(j => (
                          <li key={j.id} className="border-t border-line/60">
                            <button type="button" tabIndex={expOpen ? 0 : -1}
                              onClick={e => { const o = originOf(e); hide(false); openDetails(j, o); }}
                              className="group flex w-full items-baseline gap-4 py-3 pl-8 text-left md:pl-12">
                              <span className="text-xl font-semibold tracking-tight [font-stretch:115%] transition-colors group-hover:text-ac md:text-2xl">{j.company}</span>
                              <span className="text-sm text-mute">{j.role}</span>
                              <span className="ml-auto font-mono text-xs uppercase tracking-[0.12em] text-mute">{j.years}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <aside data-mflip className="flex flex-col gap-8 md:pt-2">
            <div data-mside>
              <div className="label mb-3">Get in touch</div>
              <a href={`mailto:${EMAIL}`} className="inline-flex min-h-11 items-center text-lg transition-colors hover:text-ac">{EMAIL}</a>
            </div>
            <div data-mside className="flex gap-6 font-mono text-xs uppercase tracking-[0.14em]">
              <a href={GITHUB} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center transition-colors hover:text-ac">GitHub</a>
              <a href={LINKEDIN} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center transition-colors hover:text-ac">LinkedIn</a>
            </div>
            <a data-mside href={cvHref()} download={CV_FILE} className="btn btn-primary self-start">Download CV</a>
          </aside>
        </div>
      </div>

      <nav aria-label="Primary" className="relative mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <a href="#top" onClick={go} className="inline-flex min-h-11 items-center font-sans text-sm font-extrabold uppercase tracking-tight [font-stretch:125%]" aria-label="Muhammad Ahsan, back to top">
          <Scramble text="AHSAN" on="hover" />
          <span className="sr-only">Muhammad Ahsan</span>
        </a>
        <div className="flex items-center gap-3">
          <a href={cvHref()} download={CV_FILE} className={cn('btn btn-primary !px-4 !py-2 max-sm:hidden transition-opacity', open && 'pointer-events-none opacity-0')} tabIndex={open ? -1 : 0}>Download CV</a>
          <button ref={btn} type="button" onClick={() => (open ? hide() : show())}
            aria-expanded={open} aria-controls="site-menu"
            className="btn btn-ghost group min-h-11 !gap-3 !px-4 !py-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em]">{open ? 'Close' : 'Menu'}</span>
            <span aria-hidden="true" className="relative block h-2.5 w-5">
              <span className={cn('absolute left-0 top-0 h-[2px] w-full bg-current transition-transform duration-(--dur-hit) ease-out-expo', open && 'translate-y-[4px] rotate-45 bg-ac')} />
              <span className={cn('absolute bottom-0 left-0 h-[2px] w-full bg-current transition-transform duration-(--dur-hit) ease-out-expo', open && '-translate-y-[4px] -rotate-45 bg-ac')} />
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
