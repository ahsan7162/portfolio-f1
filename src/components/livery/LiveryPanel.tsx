import { useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { presetSeeds } from '@/art/liveries';
import { liveryStore } from '@/art/palette';
import { cn } from '@/lib/utils';
import { gsap } from '@/motion/gsap';
import { isMobile, motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';
import { PaintTab, usePaintChoices } from './PaintTab';
import { PickTab } from './PickTab';

// The livery panel, from the nav's Livery button: pick a ready-made livery, or paint your
// own from one main colour. Every control reaches only readable colours, and the whole
// page, 3D included, follows as you go (palette.ts setLivery).

type Tab = 'pick' | 'paint';
const TABS: Array<[Tab, string]> = [['pick', 'Liveries'], ['paint', 'Paint your own']];

/** Open: a wipe down from the button (a sheet up from the bottom on phones), then the content rises in. */
function usePanelMotion(root: RefObject<HTMLDivElement | null>, open: boolean) {
  const shown = useRef(false);
  useLayoutEffect(() => {
    const p = root.current!, phone = isMobile();
    if (!motionEnabled() || (!open && !shown.current)) { gsap.set(p, { autoAlpha: open ? 1 : 0 }); shown.current = open; return; }
    shown.current = open;
    const hidden = phone ? { yPercent: 100 } : { clipPath: 'inset(0% 0% 100% 0%)' };
    const whole = phone ? { yPercent: 0 } : { clipPath: 'inset(0% 0% 0% 0%)' };
    // Visible at once (the wipe's start state hides it), and the rows fade by opacity, not
    // autoAlpha, so the selected tab can take focus right away.
    if (open) gsap.set(p, { autoAlpha: 1 });
    const tl = open
      ? gsap.timeline()
        .fromTo(p, hidden, { ...whole, duration: DUR.wipe, ease: phone ? EASE.out : EASE.wipe })
        .fromTo(p.querySelectorAll('[data-lv]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: DUR.split, stagger: 0.04, ease: EASE.out }, 0.12)
      : gsap.timeline().to(p, { ...hidden, duration: 0.25, ease: EASE.in }).set(p, { autoAlpha: 0 });
    if (open) p.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.focus({ preventScroll: true });
    return () => { tl.kill(); };
  }, [root, open]);
}

/** The hero in miniature, in the page's own variables: what each colour paints. */
function Preview() {
  return (
    <div data-lv aria-hidden="true" className="relative mt-4 overflow-hidden border border-line px-4 pb-3.5 pt-4" style={{ background: 'linear-gradient(180deg, var(--carbon), var(--panel))' }}>
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-0 size-full opacity-60">
        <path d="M-5 48 C 40 52, 70 10, 120 18 S 190 46, 210 30" fill="none" stroke="var(--ac)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <div className="display text-[1.75rem] font-black text-(--letter)">Ahsan<span className="text-ac">.</span></div>
          <div className="mt-1.5 text-[13px]"><em className="display-em font-bold">Full Stack / AI</em> <span className="text-fg">Developer</span></div>
        </div>
        <span className="display text-[2rem] leading-none text-transparent" style={{ WebkitTextStroke: '1px var(--letter)' }}>04</span>
      </div>
      <span className="btn btn-primary relative mt-3 !px-3.5 !py-1.5 !text-[10px]">View projects</span>
    </div>
  );
}

export function LiveryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { livery, seeds } = useSyncExternalStore(liveryStore.subscribe, liveryStore.get, liveryStore.server);
  const [tab, setTab] = useState<Tab>(livery === 'custom' ? 'paint' : 'pick');
  const choices = usePaintChoices();
  const root = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  usePanelMotion(root, open);

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    if (motionEnabled()) gsap.fromTo(content.current, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out });
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Esc closes the panel from anywhere inside it
    <div ref={root} id="livery-panel" role="dialog" aria-label="Livery" inert={!open} data-lenis-prevent
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      className={cn('invisible z-10 overflow-y-auto overscroll-contain border-line bg-carbon px-5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.85)]',
        'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[62dvh] max-md:border-t max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-md:pt-3',
        'md:absolute md:right-0 md:top-[calc(100%+12px)] md:max-h-[calc(100dvh-var(--navh)-24px)] md:w-[384px] md:border md:pb-5 md:pt-5')}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-ac" />
      <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/20 md:hidden" />

      <div data-lv className="flex items-start justify-between gap-4">
        <div>
          <h2 className="display text-[1.5rem]">Livery<span className="text-ac">.</span></h2>
          <p className="mt-2 text-[13px] leading-snug text-mute">Pick one, or paint your own. The whole site follows as you go.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close livery"
          className="-mr-2 grid size-10 shrink-0 place-items-center text-mute transition-colors hover:text-fg">
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3.5"><path d="m2 2 8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      <Preview />

      <div data-lv role="tablist" aria-label="Livery" className="mt-4 grid grid-cols-2 rounded-full border border-line p-[3px]">
        {TABS.map(([t, text]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} aria-controls={tab === t ? `livery-${t}` : undefined} id={`livery-tab-${t}`} onClick={() => switchTab(t)}
            className={cn('h-9 rounded-full font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-(--dur-hit) ease-out-expo',
              tab === t ? 'bg-fg text-carbon' : 'text-mute hover:text-fg')}>
            {text}
          </button>
        ))}
      </div>

      <div data-lv ref={content} className="mt-4">
        {tab === 'pick'
          ? <PickTab livery={livery} seeds={seeds} onPaint={() => switchTab('paint')} />
          // Painting a ready-made livery starts from its colours.
          : <PaintTab on={livery === 'custom' ? seeds : presetSeeds(livery)} choices={choices} />}
      </div>
    </div>
  );
}
