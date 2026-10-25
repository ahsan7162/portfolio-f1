import { useMemo, useRef } from 'react';
import { Arrow } from '@/components/Arrow';
import { DialogFrame, type DialogProps } from '@/components/dialogs/DialogFrame';
import { archive, type ArchiveItem } from '@/content/data';
import { cn } from '@/lib/utils';
import { ProjectView } from './ProjectView';
import type { SceneApi } from './scene';
import { SCENES } from './scenes';
import { useCardReveal } from './useCardReveal';
import { useProjectView } from './useProjectView';

// The All projects screen, a contact sheet: every project a card with its own scene, in its
// own code chunk (ArchiveGate). Rows of two and three on a six-column grid: [3,3] [2,2,2] ...
const SPAN = ['lg:col-span-3', 'lg:col-span-3', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2',
  'lg:col-span-3', 'lg:col-span-3', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2'];

const TileText = ({ a }: { a: ArchiveItem }) => (
  <span className="block p-5 md:p-6">
    <span data-cardtxt className="label block">{a.year}, {a.ctx}</span>
    <span data-cardtxt className="mt-3 block text-lg font-semibold font-stretch-semi-expanded">{a.name}</span>
    <span data-cardtxt className="mt-2 block text-sm leading-relaxed text-mute">{a.note}</span>
    <span data-cardtxt className="mt-4 flex items-center justify-between gap-4 text-sm">
      <span className="truncate font-mono text-xs text-mute">{a.stack}</span>
      <span className="shrink-0 font-semibold text-ac2">Open <span aria-hidden="true" className="inline-block transition-transform duration-(--dur-split) ease-out-expo group-hover:translate-x-1.5"><Arrow /></span></span>
    </span>
  </span>
);

export default function ArchiveShowcase(frame: DialogProps) {
  const tiles = useRef<(HTMLButtonElement | null)[]>([]), boxes = useRef<(HTMLDivElement | null)[]>([]);
  const apis = useRef<(SceneApi | null)[]>([]);
  const handles = useMemo(() => archive.map((_, i) => (api: SceneApi | null) => { apis.current[i] = api; }), [apis]);
  const landed = useRef(new Set<number>());
  useCardReveal(frame.dref, { apis, boxes, landed });
  const { view, open, close, step, els } = useProjectView(frame.dref, { tiles, boxes, landed });

  return (
    <DialogFrame {...frame} label="All projects" titleId="archTitle" tone="graphite" width="max-w-[1400px]">
      <h2 id="archTitle" data-din className="display text-display-section">All projects</h2>
      <p data-din className="mt-3 text-mute">Everything else I have shipped, 2021 to now. Open one to see what it did.</p>
      <ul inert={!!view || undefined} className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
        {archive.map((a, i) => {
          const S = SCENES[a.id];
          return (
            <li key={a.id} data-card={i} className={SPAN[i]}>
              <button type="button" data-tile ref={el => { tiles.current[i] = el; }} onClick={() => open(i)} data-cursor="view"
                className="group relative block h-full w-full border border-line bg-graphite text-left transition-colors duration-(--dur-hit) hover:border-ac2/60">
                <div ref={el => { boxes.current[i] = el; }} data-flip-id={`arch-${i}`}
                  className={cn('relative aspect-[16/10] overflow-hidden border-b border-line bg-carbon', view?.origin === i && 'invisible')}>
                  <div data-drift className="h-full w-full"><S handle={handles[i]} /></div>
                </div>
                <TileText a={a} />
              </button>
            </li>
          );
        })}
      </ul>

      {view && <ProjectView view={view} els={els} onClose={close} onStep={step} />}
    </DialogFrame>
  );
}
