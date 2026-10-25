import type { Delta } from '@/content/data';
import { cn } from '@/lib/utils';

/** Before and after on one scale (aria-hidden: the highlight's text states both). */
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
