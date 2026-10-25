import { useMemo, useState } from 'react';
import { isHex, maxChroma } from '@/art/colour';
import { fit, groundsFor, RULES, type Seeds } from '@/art/liveries';
import { cn } from '@/lib/utils';
import { Tone } from './controls';
import { colourOf, hueName, type Ink, lightness, track, type Tune, tuneOf } from './tune';

const SWATCHES = [
  ['Red', '#ff2438'], ['Orange', '#ff7a1a'], ['Amber', '#ffb000'], ['Yellow', '#f2d74b'], ['Lime', '#b5e61d'], ['Green', '#2fd27a'],
  ['Teal', '#00c2a8'], ['Sky', '#4cb8ff'], ['Blue', '#5b7cff'], ['Violet', '#9061f9'], ['Pink', '#ff5fa2'], ['Chalk', '#f4f4ed'],
] as const;

/** One colour, painted: a swatch to start from, then hue, intensity and shade, or a hex. */
export function InkEditor({ ink, seeds, onPick }: { ink: Ink; seeds: Seeds; onPick: (hex: string, fade?: boolean) => void }) {
  const current = seeds[ink];
  const bg = groundsFor(seeds.ground)[RULES[ink].against!], min = RULES[ink].min!;
  const [tune, setTune] = useState(() => tuneOf(current, 25, bg, min));
  const [hex, setHex] = useState(current);
  const [mine, setMine] = useState<string | null>(null);
  // Follow the colour when something else changes it (a livery, a swatch, the main colour carrying it).
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current); setHex(current);
    if (current !== mine) setTune(t => tuneOf(current, t.h, bg, min));
  }
  const send = (t: Tune) => { setTune(t); const out = fit(ink, colourOf(t, bg, min), seeds.ground); setMine(out); onPick(out); };
  const jump = (raw: string) => { const out = fit(ink, raw, seeds.ground); setTune(t => tuneOf(out, t.h, bg, min)); setMine(out); onPick(out, true); };

  const top = Math.max(0.001, maxChroma(lightness(tune, bg, min), tune.h)); // the most intensity this hue and shade can hold
  const tracks = useMemo(() => ({
    hue: track(13, i => colourOf({ ...tune, h: i * 30 }, bg, min)),
    intensity: track(7, i => colourOf({ ...tune, c: (i / 6) * top }, bg, min)),
    shade: track(7, i => colourOf({ ...tune, s: i / 6 }, bg, min)),
  }), [tune, top, bg, min]);

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Start from" className="grid grid-cols-6 gap-1">
        {SWATCHES.map(([name, sw]) => {
          const out = fit(ink, sw, seeds.ground), on = out === current;
          return (
            <button key={name} type="button" aria-label={name} aria-pressed={on} title={name} onClick={() => jump(sw)}
              className="group grid h-10 place-items-center">
              <span className={cn('size-7 rounded-full ring-offset-2 ring-offset-carbon transition-[box-shadow,transform] duration-(--dur-hit) ease-out-expo group-hover:scale-110',
                on ? 'ring-2 ring-fg' : 'ring-1 ring-fg/15')} style={{ background: out }} />
            </button>
          );
        })}
      </div>
      <Tone label="Hue" value={tune.h / 360} text={hueName(tune.h)} background={tracks.hue} thumb={current}
        onChange={v => send({ ...tune, h: v * 359.9 })} />
      <Tone label="Intensity" value={Math.min(1, tune.c / top)} text={`${Math.round(Math.min(1, tune.c / top) * 100)}%`} background={tracks.intensity} thumb={current}
        onChange={v => send({ ...tune, c: v * top })} />
      <Tone label="Shade" value={tune.s} text={tune.s < 0.34 ? 'Deep' : tune.s < 0.67 ? 'Mid' : 'Light'} background={tracks.shade} thumb={current}
        onChange={v => send({ ...tune, s: v })} />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          Hex
          <input value={hex} spellCheck={false} maxLength={7} size={8}
            onChange={e => { const v = e.target.value.trim().toLowerCase(); setHex(v); if (isHex(v)) jump(v); }}
            onBlur={() => setHex(current)}
            className="border-b border-line bg-transparent py-1 text-[13px] normal-case text-fg outline-none focus-visible:border-ac" />
        </label>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 text-ac2"><path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Readable
        </span>
      </div>
    </div>
  );
}
