import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { contrast, fromLch, isHex, maxChroma, toLch } from '@/art/colour';
import { derive, fit, fitGround, groundsFor, LIVERIES, liveryStore, presetSeeds, RULES, setLivery, type Seeds } from '@/art/palette';
import { cn } from '@/lib/utils';
import { gsap } from '@/motion/gsap';
import { isMobile, motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

// The livery panel, from the nav's Livery button. Two ways in: pick a ready-made livery,
// or paint your own from one main colour (the second colour and the name follow it until
// they are given their own). Every control can only reach readable colours: the sliders
// run over the shades that keep their contrast, and the background over dark tints. The
// whole page, 3D included, changes as you go; a pick crossfades (palette.ts setLivery).

type Ink = 'ac' | 'ac2' | 'letter';
type Tune = { h: number; c: number; s: number };

const SWATCHES = [
  ['Red', '#ff2438'], ['Orange', '#ff7a1a'], ['Amber', '#ffb000'], ['Yellow', '#f2d74b'], ['Lime', '#b5e61d'], ['Green', '#2fd27a'],
  ['Teal', '#00c2a8'], ['Sky', '#4cb8ff'], ['Blue', '#5b7cff'], ['Violet', '#9061f9'], ['Pink', '#ff5fa2'], ['Chalk', '#f4f4ed'],
] as const;
const TINTS = [
  ['Carbon', '#0b0b0c'], ['Navy', '#0d1428'], ['Ocean', '#08191d'], ['Forest', '#0b1611'], ['Plum', '#150d1c'], ['Oxblood', '#1a0b0e'], ['Mocha', '#17120d'],
] as const;
/** OKLCH hue names, each up to its bound. */
const HUES = [[12, 'Pink'], [42, 'Red'], [70, 'Orange'], [100, 'Amber'], [118, 'Yellow'], [138, 'Lime'], [168, 'Green'], [195, 'Teal'], [225, 'Cyan'], [255, 'Sky'], [282, 'Blue'], [308, 'Violet'], [338, 'Purple'], [361, 'Pink']] as const;
const hueName = (h: number) => HUES.find(([bound]) => h < bound)![1];

// Shade runs from the darkest lightness that still reads against the ground up to near white.
const L_TOP = 0.96;
function lowest(h: number, c: number, bg: string, min: number) {
  if (contrast(fromLch({ l: L_TOP, c, h }), bg) < min) return L_TOP;
  let lo = 0, hi = L_TOP;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(fromLch({ l: mid, c, h }), bg) >= min) hi = mid; else lo = mid;
  }
  return hi;
}
const lightness = (t: Tune, bg: string, min: number) => { const lo = lowest(t.h, t.c, bg, min); return lo + (L_TOP - lo) * t.s; };
const colourOf = (t: Tune, bg: string, min: number) => fromLch({ l: lightness(t, bg, min), c: t.c, h: t.h });
function tuneOf(hex: string, hue: number, bg: string, min: number): Tune {
  const x = toLch(hex), h = x.c < 0.02 ? hue : x.h, lo = lowest(h, x.c, bg, min);
  return { h, c: x.c, s: lo < L_TOP ? Math.min(1, Math.max(0, (x.l - lo) / (L_TOP - lo))) : 1 };
}
const track = (n: number, at: (i: number) => string) => `linear-gradient(90deg, ${Array.from({ length: n }, (_, i) => at(i)).join(', ')})`;

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

function Tone({ label, value, text, background, thumb, onChange }: {
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

/** One colour, painted: a swatch to start from, then hue, intensity and shade, or a hex. */
function InkEditor({ ink, seeds, onPick }: { ink: Ink; seeds: Seeds; onPick: (hex: string, fade?: boolean) => void }) {
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

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
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
function Row({ title, hint, swatch, value, open, onToggle, children }: {
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

export function LiveryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { livery, seeds } = useSyncExternalStore(liveryStore.subscribe, liveryStore.get, liveryStore.server);
  const [tab, setTab] = useState<'pick' | 'paint'>(livery === 'custom' ? 'paint' : 'pick');
  const [row, setRow] = useState<'ac' | 'ac2' | 'letter' | 'ground' | null>('ac');
  const [ownSecond, setOwnSecond] = useState(false);
  const [ownName, setOwnName] = useState(false);
  const root = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);

  // The colours on the page now: painting a ready-made livery starts from it.
  const on = livery === 'custom' ? seeds : presetSeeds(livery);
  const edit = (patch: Partial<Seeds>, fade = false) => setLivery('custom', { ...on, ...patch }, { fade });
  // The second colour and the name follow the main colour while they match it, so the first edit carries them.
  const paintInk = (role: Ink) => (hex: string, fade = false) => {
    const p: Partial<Seeds> = { [role]: hex };
    if (role === 'ac') { if (on.ac2 === on.ac) p.ac2 = hex; if (on.letter === on.ac) p.letter = hex; }
    if (role === 'ac2' && on.letter === on.ac2 && on.letter !== on.ac) p.letter = hex;
    edit(p, fade);
  };
  const secondMode = on.ac2 === on.ac && !ownSecond ? 'same' : 'own';
  const nameMode = ownName ? 'own' : on.letter === on.fg ? 'chalk' : on.letter === on.ac ? 'main' : on.letter === on.ac2 ? 'second' : 'own';
  const tint = TINTS.find(([, t]) => fitGround(t) === on.ground)?.[0] ?? '';
  const toggle = (r: typeof row) => setRow(cur => (cur === r ? null : r));

  // Open: a wipe down from the button (a sheet up from the bottom on phones), then the content rises in.
  const shown = useRef(false);
  useLayoutEffect(() => {
    const p = root.current!, phone = isMobile();
    if (!motionEnabled() || (!open && !shown.current)) { gsap.set(p, { autoAlpha: open ? 1 : 0 }); shown.current = open; return; }
    shown.current = open;
    const hidden = phone ? { yPercent: 100 } : { clipPath: 'inset(0% 0% 100% 0%)' };
    const whole = phone ? { yPercent: 0 } : { clipPath: 'inset(0% 0% 0% 0%)' };
    const tl = open
      ? gsap.timeline()
        .set(p, { autoAlpha: 1 })
        .fromTo(p, hidden, { ...whole, duration: DUR.wipe, ease: phone ? EASE.out : EASE.wipe })
        .fromTo(p.querySelectorAll('[data-lv]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: DUR.split, stagger: 0.04, ease: EASE.out }, 0.12)
      : gsap.timeline().to(p, { ...hidden, duration: 0.25, ease: EASE.in }).set(p, { autoAlpha: 0 });
    if (open) p.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.focus({ preventScroll: true });
    return () => { tl.kill(); };
  }, [open]);
  const switchTab = (t: typeof tab) => {
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

      {/* The hero in miniature, in the page's own variables: what each colour paints. */}
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

      <div data-lv role="tablist" aria-label="Livery" className="mt-4 grid grid-cols-2 rounded-full border border-line p-[3px]">
        {([['pick', 'Liveries'], ['paint', 'Paint your own']] as const).map(([t, text]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} aria-controls={`livery-${t}`} id={`livery-tab-${t}`} onClick={() => switchTab(t)}
            className={cn('h-9 rounded-full font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-(--dur-hit) ease-out-expo',
              tab === t ? 'bg-fg text-carbon' : 'text-mute hover:text-fg')}>
            {text}
          </button>
        ))}
      </div>

      <div data-lv ref={content} className="mt-4">
        {tab === 'pick' ? (
          <div id="livery-pick" role="tabpanel" aria-labelledby="livery-tab-pick" className="grid grid-cols-3 gap-2">
            {LIVERIES.map(l => (
              <button key={l.id} type="button" aria-pressed={livery === l.id} onClick={() => setLivery(l.id, seeds, { fade: true })}
                className={cn('group flex flex-col gap-2 border p-1.5 text-left transition-colors duration-(--dur-hit) ease-out-expo',
                  livery === l.id ? 'border-fg' : 'border-line hover:border-fg/40')}>
                <Strip seeds={l.seeds} />
                <span className={cn('px-1 pb-0.5 font-mono text-[11px] uppercase leading-tight tracking-[0.1em]', livery === l.id ? 'text-fg' : 'text-mute group-hover:text-fg')}>{l.label}</span>
              </button>
            ))}
            <button type="button" aria-pressed={livery === 'custom'} onClick={() => { setLivery('custom', seeds, { fade: true }); switchTab('paint'); }}
              className={cn('group flex flex-col gap-2 border border-dashed p-1.5 text-left transition-colors duration-(--dur-hit) ease-out-expo',
                livery === 'custom' ? 'border-fg' : 'border-line hover:border-fg/40')}>
              <Strip seeds={seeds} />
              <span className={cn('px-1 pb-0.5 font-mono text-[11px] uppercase leading-tight tracking-[0.1em]', livery === 'custom' ? 'text-fg' : 'text-mute group-hover:text-fg')}>Yours</span>
            </button>
          </div>
        ) : (
          <div id="livery-paint" role="tabpanel" aria-labelledby="livery-tab-paint" className="border-t border-line">
            <Row title="Main colour" hint="Buttons, the racing line, the helmet" swatch={on.ac} value={hueName(toLch(on.ac).h)}
              open={row === 'ac'} onToggle={() => toggle('ac')}>
              <InkEditor ink="ac" seeds={on} onPick={paintInk('ac')} />
            </Row>
            <Row title="Second colour" hint="Figures, italic words, the car" swatch={on.ac2} value={secondMode === 'same' ? 'As main' : 'Own'}
              open={row === 'ac2'} onToggle={() => toggle('ac2')}>
              <Choice label="Second colour" value={secondMode} options={[['same', 'Same as main'], ['own', 'Its own colour']]}
                onChange={v => { setOwnSecond(v === 'own'); if (v === 'same') edit({ ac2: on.ac, ...(on.letter === on.ac2 ? { letter: on.ac } : {}) }, true); }} />
              {secondMode === 'own' && <div className="mt-4"><InkEditor ink="ac2" seeds={on} onPick={paintInk('ac2')} /></div>}
            </Row>
            <Row title="Name" hint="Your name and race number" swatch={on.letter} value={nameMode}
              open={row === 'letter'} onToggle={() => toggle('letter')}>
              <Choice label="Name colour" value={nameMode} options={[['chalk', 'Chalk'], ['main', 'Main'], ['second', 'Second'], ['own', 'Own']]}
                onChange={v => {
                  setOwnName(v === 'own');
                  if (v !== 'own') edit({ letter: v === 'chalk' ? on.fg : v === 'main' ? on.ac : on.ac2 }, true);
                }} />
              {nameMode === 'own' && <div className="mt-4"><InkEditor ink="letter" seeds={on} onPick={paintInk('letter')} /></div>}
            </Row>
            <Row title="Background" hint="The page, tiles and the track" swatch={on.ground} value={tint}
              open={row === 'ground'} onToggle={() => toggle('ground')}>
              <div role="group" aria-label="Background" className="grid grid-cols-7 gap-1">
                {TINTS.map(([name, t]) => {
                  const g = fitGround(t), active = g === on.ground;
                  return (
                    <button key={name} type="button" aria-label={name} aria-pressed={active} title={name} onClick={() => edit({ ground: g }, true)}
                      className="group grid h-11 place-items-center">
                      <span className={cn('size-8 rounded-full ring-offset-2 ring-offset-carbon transition-[box-shadow,transform] duration-(--dur-hit) ease-out-expo group-hover:scale-110',
                        active ? 'ring-2 ring-fg' : 'ring-1 ring-fg/25')} style={{ background: g }} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-mute">Kept dark, so the 3D lighting and the text stay right.</p>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}
