import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { GithubYear } from '@/content/github';
import { thousands } from '@/lib/format';
import { CELL, DAYS, dayName, LEVELS, plural, STEP, type YearShape } from './calendar';

/** The year as a contribution graph, with a tooltip for the day under the pointer. */
export function ContributionGraph({ ref, year, data, g }: { ref: RefObject<SVGSVGElement | null>; year: number; data: GithubYear; g: YearShape }) {
  const [tip, setTip] = useState<number | null>(null);
  // Another year clears the tip.
  const [tipYear, setTipYear] = useState(year);
  if (tipYear !== year) { setTipYear(year); setTip(null); }
  const W = g.cols * STEP - (STEP - CELL), H = 7 * STEP - (STEP - CELL);

  // Phones see a slice of the year: open it on the latest weeks, as GitHub does.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = scroller.current, last = g.cells.at(-1);
    if (s && last && s.scrollWidth > s.clientWidth) s.scrollLeft = ((last.col + 2) / g.cols) * s.scrollWidth - s.clientWidth;
  }, [g]);

  // One path per strength, not a node per day: each day is a 9 unit square drawn with a
  // 2 unit round-joined stroke, so it lands at 11 units with softly rounded corners.
  const paths = useMemo(() => {
    const d = LEVELS.map(() => '');
    let best = '';
    for (const c of g.cells) {
      const sq = `M${c.col * STEP + 1} ${c.row * STEP + 1}h9v9h-9z`;
      if (c.i === g.best) best = sq; else d[c.level] += sq;
    }
    return { d, best };
  }, [g]);

  const at = tip === null ? null : g.cells[tip];
  // The day under the pointer, from its position (gaps count as the day before them).
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * W / STEP);
    const row = Math.min(6, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * H / STEP)));
    const i = col * 7 + row - g.lead;
    setTip(i >= 0 && i < g.cells.length ? i : null);
  };

  return (
    <div data-graph className="mt-10 border border-line bg-graphite/55 p-4 md:p-8">
      {/* Phones scroll the year sideways inside the card (without the weekday names, which
          would scroll away); the page never scrolls sideways. */}
      <div ref={scroller} className="overflow-x-auto pb-3 [scrollbar-width:thin] md:pb-0">
        <div className="relative min-w-[640px]">
          <div aria-hidden="true" className="relative h-6 font-mono text-[11px] text-dim md:ml-9">
            {g.months.map(({ m, col }) => col < g.cols - 1 && (
              <span key={m} className="absolute top-0" style={{ left: `${(col * STEP / W) * 100}%` }}>{m}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <div aria-hidden="true" className="hidden w-7 shrink-0 grid-rows-7 font-mono text-[11px] text-dim md:grid">
              {DAYS.map((d, r) => <span key={d} className="flex items-center leading-none">{r % 2 ? d : ''}</span>)}
            </div>
            <div className="relative min-w-0 flex-1">
              {/* A lifting finger fires pointerleave at once, so a tap keeps its tip; a mouse leaving clears it. */}
              <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img"
                aria-label={`${plural(g.total)} in ${year}: ${thousands(g.careem)} on the Careem account, ${thousands(g.personal)} on the personal one.`}
                onPointerMove={pick} onPointerDown={pick} onPointerLeave={e => { if (e.pointerType === 'mouse') setTip(null); }}>
                <g strokeWidth={2} strokeLinejoin="round">
                  {paths.d.map((d, l) => d && <path key={LEVELS[l].opacity} d={d} fill={LEVELS[l].fill} stroke={LEVELS[l].fill} opacity={LEVELS[l].opacity} />)}
                  {paths.best && <path d={paths.best} fill="var(--fg)" stroke="var(--fg)" />}
                </g>
                {at && <rect x={at.col * STEP - 1} y={at.row * STEP - 1} width={CELL + 2} height={CELL + 2} rx={3} fill="none" stroke="var(--fg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
              </svg>
              {at && (
                // Slides from left-aligned in January to right-aligned in December, so it never leaves the card.
                // The scroll box clips above the graph, so the top three rows open it below the day.
                <div aria-hidden="true" className="pointer-events-none absolute z-10 whitespace-nowrap border border-line bg-panel px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: `${((at.col * STEP + CELL / 2) / W) * 100}%`,
                    top: at.row < 3 ? `calc(${((at.row * STEP + CELL) / H) * 100}% + 8px)` : `calc(${(at.row * STEP / H) * 100}% - 8px)`,
                    translate: `-${(at.col / (g.cols - 1)) * 100}% ${at.row < 3 ? '0' : '-100%'}`,
                  }}>
                  <span className="font-semibold text-fg">{plural(at.n)}</span> <span className="text-mute">on {dayName(year, at.i)}</span>
                  {at.n > 0 && <span className="mt-0.5 block font-mono text-[11px] text-dim">{data.careem[at.i]} Careem · {data.personal[at.i]} personal</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-xs text-mute">
        <div aria-hidden="true" className="flex items-center gap-1.5">
          <span className="mr-1">Less</span>
          {LEVELS.map(l => <span key={l.opacity} className="size-3 rounded-[2px]" style={{ background: l.fill, opacity: l.opacity }} />)}
          <span className="ml-1">More</span>
        </div>
        {g.best >= 0 && (
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-[2px] bg-fg" />
            Busiest day: {dayName(year, g.best)}, {plural(g.max)}
          </p>
        )}
      </div>
    </div>
  );
}
