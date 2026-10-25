import { useMemo } from 'react';
import { derive, LIVERIES, type Livery, type Seeds } from '@/art/liveries';
import { setLivery } from '@/art/palette';
import { cn } from '@/lib/utils';

/** A livery as a strip of car paint: its ground, a band of the main colour, a pinstripe of the second, its number in the name colour. */
function Strip({ seeds }: { seeds: Seeds }) {
  const css = useMemo(() => derive(seeds).css, [seeds]);
  const [g, ac, ac2, letter] = [css['--carbon'], css['--ac'], css['--ac2'], css['--letter']];
  return (
    <span aria-hidden="true" className="relative block h-11 w-full overflow-hidden"
      style={{ background: `linear-gradient(112deg, ${g} 0 30%, ${ac} 30% 56%, ${g} 56% 60%, ${ac2} 60% 67%, ${g} 67%)` }}>
      <span className="display absolute bottom-1 right-1.5 text-[15px] leading-none" style={{ color: letter }}>04</span>
    </span>
  );
}

function LiveryCard({ seeds, label, active, dashed, onClick }: { seeds: Seeds; label: string; active: boolean; dashed?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('group flex flex-col gap-2 border p-1.5 text-left transition-colors duration-(--dur-hit) ease-out-expo',
        dashed && 'border-dashed', active ? 'border-fg' : 'border-line hover:border-fg/40')}>
      <Strip seeds={seeds} />
      <span className={cn('px-1 pb-0.5 font-mono text-[11px] uppercase leading-tight tracking-[0.1em]', active ? 'text-fg' : 'text-mute group-hover:text-fg')}>{label}</span>
    </button>
  );
}

/** The ready-made liveries, and the visitor's own (which opens the paint tab). */
export function PickTab({ livery, seeds, onPaint }: { livery: Livery; seeds: Seeds; onPaint: () => void }) {
  return (
    <div id="livery-pick" role="tabpanel" aria-labelledby="livery-tab-pick" className="grid grid-cols-3 gap-2">
      {LIVERIES.map(l => (
        <LiveryCard key={l.id} seeds={l.seeds} label={l.label} active={livery === l.id} onClick={() => setLivery(l.id, seeds, { fade: true })} />
      ))}
      <LiveryCard seeds={seeds} label="Yours" active={livery === 'custom'} dashed
        onClick={() => { setLivery('custom', seeds, { fade: true }); onPaint(); }} />
    </div>
  );
}
