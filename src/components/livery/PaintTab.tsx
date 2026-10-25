import { useState } from 'react';
import { toLch } from '@/art/colour';
import { fitGround, type Seeds } from '@/art/liveries';
import { setLivery } from '@/art/palette';
import { cn } from '@/lib/utils';
import { Choice, Row } from './controls';
import { InkEditor } from './InkEditor';
import { hueName, type Ink } from './tune';

const TINTS = [
  ['Carbon', '#0b0b0c'], ['Navy', '#0d1428'], ['Ocean', '#08191d'], ['Forest', '#0b1611'], ['Plum', '#150d1c'], ['Oxblood', '#1a0b0e'], ['Mocha', '#17120d'],
] as const;

type PaintRow = Ink | 'ground';

/**
 * What the paint tab remembers while the panel is mounted (across tab switches): the row
 * folded open, and whether the second colour and the name were given colours of their own.
 */
export function usePaintChoices() {
  const [row, setRow] = useState<PaintRow | null>('ac');
  const [ownSecond, setOwnSecond] = useState(false);
  const [ownName, setOwnName] = useState(false);
  const toggle = (r: PaintRow) => setRow(cur => (cur === r ? null : r));
  return { row, toggle, ownSecond, setOwnSecond, ownName, setOwnName };
}
type PaintChoices = ReturnType<typeof usePaintChoices>;

/** Paint your own: the main colour, the second, the name and the background, from `on` (the colours on the page now). */
export function PaintTab({ on, choices }: { on: Seeds; choices: PaintChoices }) {
  const { row, toggle, ownSecond, setOwnSecond, ownName, setOwnName } = choices;
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

  return (
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
  );
}
