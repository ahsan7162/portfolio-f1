import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { gsap } from '@/motion/gsap';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

/** A slider over a painted track, its thumb in the colour it sets. */
export function Tone({ label, value, text, background, thumb, onChange }: {
  label: string; value: number; text: string; background: string; thumb: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        {label}<span className="tabular-nums text-fg/80">{text}</span>
      </span>
      <input type="range" min={0} max={1000} value={Math.round(value * 1000)} aria-valuetext={text}
        onChange={e => onChange(Number(e.target.value) / 1000)}
        className="tone-range mt-2" style={{ '--track': background, '--thumb': thumb } as CSSProperties} />
    </label>
  );
}

export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}
          className={cn('h-9 rounded-full border px-3.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors duration-(--dur-hit) ease-out-expo',
            v === value ? 'border-fg bg-fg text-carbon' : 'border-line text-mute hover:border-fg/40 hover:text-fg')}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** A row of the paint tab: what the colour paints, folding open to change it. */
export function Row({ title, hint, swatch, value, open, onToggle, children }: {
  title: string; hint: string; swatch: string; value: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null), ready = useRef(false);
  useLayoutEffect(() => {
    const el = body.current!;
    if (ready.current && motionEnabled()) gsap.to(el, { height: open ? 'auto' : 0, duration: DUR.split, ease: EASE.out, overwrite: true });
    else gsap.set(el, { height: open ? 'auto' : 0 });
    ready.current = true;
  }, [open]);
  return (
    <div className="border-b border-line">
      <button type="button" aria-expanded={open} onClick={onToggle} className="group flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
        <span aria-hidden="true" className="size-7 shrink-0 rounded-full ring-1 ring-fg/20" style={{ background: swatch }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <span className="block truncate text-xs text-mute">{hint}</span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">{value}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" className={cn('size-3 shrink-0 text-mute transition-transform duration-(--dur-split) ease-out-expo group-hover:text-fg', open && 'rotate-180')}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={body} inert={!open} className="h-0 overflow-hidden"><div className="pb-5 pt-1">{children}</div></div>
    </div>
  );
}
