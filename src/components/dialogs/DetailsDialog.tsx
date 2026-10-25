import type { Breakdown } from '@/content/data';
import { Bars } from './Bars';
import { DialogFrame, type DialogProps } from './DialogFrame';

export function DetailsDialog({ sel, ...frame }: DialogProps & { sel: Breakdown }) {
  return (
    <DialogFrame {...frame} label="Details" titleId="selTitle" tone="carbon" width="max-w-[1100px]">
      <h2 id="selTitle" data-din className="display break-words text-display-lead md:text-display-section">{sel.company}</h2>
      <p data-din className="mt-4 text-mute">{sel.role}, {sel.loc}, {sel.dates}</p>
      {/* Rows are subgrids of one grid, so the stat column fits the widest stat and the text lines up. */}
      <div className="mt-12 grid border-t border-line md:grid-cols-[minmax(12rem,max-content)_1fr] md:gap-x-4">
        {sel.highlights.map(h => (
          <div key={h.title} data-din className="grid gap-4 border-b border-line py-8 md:col-span-2 md:grid-cols-subgrid">
            <div className="display text-display-stat text-ac2"><span data-dstat className="inline-block">{h.stat}</span></div>
            <div>
              <h3 className="text-xl font-semibold font-stretch-semi-expanded">{h.title}</h3>
              <p className="mt-2 max-w-[65ch] leading-relaxed text-mute">{h.text}</p>
              {h.delta && <Bars d={h.delta} />}
            </div>
          </div>
        ))}
      </div>
    </DialogFrame>
  );
}
