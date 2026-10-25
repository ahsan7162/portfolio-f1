import { useEffect, useRef, useState, type ComponentType } from 'react';
import { cn } from '@/lib/utils';

type Panel = ComponentType<{ open: boolean; onClose: () => void }>;
let loading: Promise<Panel> | null = null;
const load = () => (loading ??= import('@/components/LiveryPanel').then(m => m.LiveryPanel));

/**
 * The nav's Livery button: its swatch is the page's own two colours, and it opens the
 * livery panel (LiveryPanel, loaded once the pointer or focus reaches the button, so it is
 * there on the first press). The panel is not modal: the page stays live behind it.
 */
export function LiveryToggle({ className, inert }: { className?: string; inert?: boolean }) {
  const [open, setOpen] = useState(false);
  const [Panel, setPanel] = useState<Panel | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const preload = () => { void load().then(P => setPanel(() => P)).catch(() => { loading = null; }); };

  // The bar steps back at the finish: close with it.
  if (inert && open) setOpen(false);
  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  const close = () => { setOpen(false); btn.current?.focus({ preventScroll: true }); };

  return (
    <div ref={wrap} inert={inert} className={cn('relative', className)}>
      <button ref={btn} type="button" aria-expanded={open} aria-controls="livery-panel" aria-haspopup="dialog"
        onPointerEnter={preload} onFocus={preload} onClick={() => { preload(); setOpen(o => !o); }}
        className="btn btn-ghost group min-h-11 !gap-2.5 !px-4 !py-2 max-md:!px-3.5">
        <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full ring-1 ring-fg/30 transition-transform duration-(--dur-hit) ease-out-expo group-hover:scale-125"
          style={{ background: 'linear-gradient(135deg, var(--ac) 50%, var(--ac2) 50%)' }} />
        {/* Phones share the bar with the 3D toggle: there the button is its swatch. */}
        <span className="overflow-hidden max-md:sr-only"><span data-letter-roll className="block font-mono uppercase tracking-[0.14em]">Livery</span></span>
      </button>
      {Panel && <Panel open={open} onClose={close} />}
    </div>
  );
}
