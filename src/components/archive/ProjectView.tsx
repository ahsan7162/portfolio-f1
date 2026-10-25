import { Arrow } from '@/components/Arrow';
import { Bars } from '@/components/dialogs/Bars';
import { archive, type ArchiveItem } from '@/content/data';
import { twoDigits } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DUR } from '@/motion/tokens';
import { SCENES } from './scenes';
import { MORPH, N, type View, type ViewEls } from './useProjectView';

const RoundBtn = ({ dir, onClick, label }: { dir: -1 | 1; onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className="grid size-12 place-items-center rounded-full border border-line text-fg transition-colors duration-(--dur-hit) hover:border-ac2 hover:text-ac2">
    <span aria-hidden="true" className={cn('inline-block', dir < 0 && 'rotate-180')}><Arrow /></span>
  </button>
);

/** The project's text: name, year and team, note, stack, and every highlight with its stat.
 *  Phones get the position here, since the bar's counter has no room there. */
function Info({ a, i }: { a: ArchiveItem; i: number }) {
  return (
    <div>
      <h3 className="display break-words text-display-card">{a.name}</h3>
      <p className="label mt-3 flex justify-between gap-4">
        <span>{a.year}, {a.ctx}</span>
        <span className="font-mono text-xs tabular-nums sm:hidden">{twoDigits(i + 1)} / {twoDigits(N)}</span>
      </p>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-mute">{a.note}</p>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${a.name} stack`}>
        {a.stack.split(', ').map(s => <li key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs">{s}</li>)}
      </ul>
      <div className="mt-8 border-t border-line">
        {a.highlights.map(h => (
          <div key={h.title} className="grid gap-x-6 gap-y-2 border-b border-line py-5 sm:grid-cols-[minmax(6rem,max-content)_1fr]">
            <div className="display text-display-small text-ac2">{h.stat}</div>
            <div>
              <p className="font-semibold font-stretch-semi-expanded">{h.title}</p>
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-mute">{h.text}</p>
              {h.delta && <Bars d={h.delta} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One archive project, full size over the grid: its scene, its text, and the way back or on. */
export function ProjectView({ view, els, onClose, onStep }: { view: View; els: ViewEls; onClose: () => void; onStep: (d: 1 | -1) => void }) {
  const a = archive[view.sel], Big = SCENES[a.id];
  const { pane, bg, bar, big, info, back } = els;
  return (
    <div ref={pane} role="group" aria-label={a.name} data-lenis-prevent className="fixed inset-0 z-20 overflow-y-auto overscroll-contain">
      <div ref={bg} aria-hidden="true" className="pointer-events-none fixed inset-0 bg-graphite" />
      <div ref={bar} className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-graphite/95 px-4 py-3 md:px-8">
        <button ref={back} type="button" onClick={onClose} className="btn btn-ghost"><span aria-hidden="true" className="inline-block rotate-180"><Arrow /></span> All projects</button>
        <div className="flex items-center gap-3">
          <span className="label hidden sm:inline">{twoDigits(view.sel + 1)} / {twoDigits(N)}</span>
          <RoundBtn dir={-1} onClick={() => onStep(-1)} label="Previous project" />
          <RoundBtn dir={1} onClick={() => onStep(1)} label="Next project" />
        </div>
      </div>
      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <div className="relative aspect-[16/10] lg:sticky lg:top-24 lg:self-start">
          <div ref={big} key={view.sel} data-flip-id={`arch-${view.sel}`} className="absolute inset-0 overflow-hidden border border-line bg-carbon">
            <Big autoplay={view.sel === view.origin ? MORPH.duration : DUR.split} />
          </div>
        </div>
        <div ref={info} key={`info-${view.sel}`}><Info a={a} i={view.sel} /></div>
      </div>
    </div>
  );
}
