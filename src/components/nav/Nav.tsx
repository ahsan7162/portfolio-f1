import { useRef, useState, type KeyboardEvent } from 'react';
import { CvLink } from '@/components/CvLink';
import { LiveryToggle } from '@/components/livery/LiveryToggle';
import { Scramble } from '@/components/Scramble';
import { SECTIONS, type Section } from '@/content/data';
import { FOCUSABLE, trapTab } from '@/lib/focus';
import { cn } from '@/lib/utils';
import { useSmoothScroll } from '@/motion/SmoothScroll';
import { useNavHeight } from '@/motion/useNavHeight';
import { GlToggle } from './GlToggle';
import { useMenuWipe, useNavEntrance } from './motion';
import { SiteMenu } from './SiteMenu';
import { useSectionState } from './useSectionState';

/** Every section with a menu row, in page order. */
const MENU = SECTIONS.filter((s): s is Section & { menu: string } => !!s.menu);

/** The always-visible top bar and its full-screen menu. */
export function Nav() {
  const { lock, unlock } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useNavHeight(ref);
  useNavEntrance(ref);
  const { current, finish, start } = useSectionState(MENU);
  useMenuWipe(panel, open);

  const show = () => { lock(); setOpen(true); requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })); };
  const hide = (refocus = true) => {
    if (!open) return;
    unlock();
    setOpen(false);
    if (refocus) btn.current?.focus({ preventScroll: true });
  };
  // Section links unlock first, so the page-wide anchor handler can scroll.
  const leave = () => hide(false);

  // Keyboard: Esc closes, Tab stays inside the bar and the open menu.
  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') { e.stopPropagation(); hide(); return; }
    trapTab(e, ref.current!);
  };

  // At the finish the footer has the CV and every link, so the bar goes clear and steps back:
  // the 3D toggle (phones), the Livery button and the CV button slide away, and Menu folds to
  // its icon (its label comes back when open). On the hero, which has its own CV button, the
  // bar's CV stays away too.
  const away = 'pointer-events-none translate-x-3 opacity-0';
  const slide = 'transition-[opacity,translate] duration-(--dur-split) ease-out-expo';
  const folded = finish && !open;
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Esc and the Tab trap for the bar and the open menu
    <header ref={ref} onKeyDown={onKey} className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-(--dur-hit)', open ? 'bg-carbon' : finish ? 'bg-transparent' : 'bg-carbon/85')}>
      <SiteMenu ref={panel} menu={MENU} current={current} onLeave={leave} />

      <nav aria-label="Primary" className="relative mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <a href="#top" onClick={leave} className="display inline-flex min-h-11 items-center text-sm" aria-label="Muhammad Ahsan, back to top">
          <Scramble text="AHSAN" on="hover" />
          <span className="sr-only">Muhammad Ahsan</span>
        </a>
        <div className="flex items-center gap-3">
          <GlToggle inert={open || finish || undefined} className={cn(slide, (open || finish) && away)} />
          <LiveryToggle inert={folded || undefined} className={cn(slide, folded && away)} />
          <CvLink inert={open || finish || start || undefined} tabIndex={open || finish || start ? -1 : 0}
            className={cn('btn btn-primary !px-4 !py-2 max-sm:hidden transition-[opacity,translate,background-color] duration-(--dur-split) ease-out-expo', (open || finish || start) && away)} />
          <button ref={btn} type="button" onClick={() => (open ? hide() : show())}
            aria-expanded={open} aria-controls="site-menu"
            className={cn('btn btn-ghost group min-h-11 !gap-0 !py-2 transition-[padding,border-color,transform] duration-(--dur-split) ease-out-expo', folded ? '!px-[11px]' : '!px-4')}>
            {/* The label folds to nothing (0fr) and back; it stays the button's accessible name. */}
            <span className={cn('grid transition-[grid-template-columns,opacity] duration-(--dur-split) ease-out-expo', folded ? 'grid-cols-[0fr] opacity-0' : 'grid-cols-[1fr]')}>
              <span className="overflow-hidden">
                <span key={open ? 'close' : 'menu'} data-letter-roll className="block pr-3">{open ? 'Close' : 'Menu'}</span>
              </span>
            </span>
            <span aria-hidden="true" className="relative block h-2.5 w-5">
              <span className={cn('absolute left-0 top-0 h-[2px] w-full transition-transform duration-(--dur-hit) ease-out-expo', open ? 'translate-y-[4px] rotate-45 bg-ac' : 'bg-current')} />
              <span className={cn('absolute bottom-0 left-0 h-[2px] w-full transition-transform duration-(--dur-hit) ease-out-expo', open ? '-translate-y-[4px] -rotate-45 bg-ac' : 'bg-current')} />
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
