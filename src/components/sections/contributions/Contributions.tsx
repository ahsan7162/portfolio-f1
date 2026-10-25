import { useMemo, useRef, useState } from 'react';
import { github } from '@/content/github';
import { thousands } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useGSAP } from '@/motion/gsap';
import { digitRoll } from '@/motion/digitRoll';
import { batchReveal, clipReveal, inView } from '@/motion/reveals';
import { gridSlot } from '@/motion/split';
import { motionEnabled } from '@/motion/prefs';
import { DUR } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { Badges, BADGES } from './Badges';
import { asOf, shape } from './calendar';
import { ContributionGraph } from './ContributionGraph';

/** The graph wipes in from the left, January first. */
const WIPE = 'inset(0% 100% 0% 0%)';

const profileLink = (who: 'personal' | 'careem') => (
  <a href={`https://github.com/${github.logins[who]}`} target="_blank" rel="noreferrer" className="text-fg underline decoration-line underline-offset-4 transition-colors hover:text-ac2">
    {github.logins[who]}
  </a>
);

/** Same pill as the phone 2D/3D toggle (GlToggle). */
function YearPicker({ value, onChange }: { value: number; onChange: (year: number) => void }) {
  return (
    <div role="group" aria-label="Year" className="flex max-w-full items-center overflow-x-auto rounded-full border border-line p-[3px] [scrollbar-width:none]">
      {github.years.map(({ year: y }) => (
        <button key={y} type="button" aria-pressed={y === value} onClick={() => onChange(y)}
          className={cn('flex h-9 shrink-0 items-center rounded-full px-2.5 font-mono text-[11px] font-semibold transition-colors duration-(--dur-hit) ease-out-expo md:px-3.5',
            y === value ? 'bg-fg text-carbon' : 'text-mute hover:text-fg')}>
          {y}
        </button>
      ))}
    </div>
  );
}

/**
 * Both GitHub accounts as one contribution graph, a year at a time: the personal account
 * and the Careem one, whose private work GitHub shows as counts only. The counts come from
 * the public profiles at build time (scripts/github.ts), so the page never talks to GitHub.
 */
export function Contributions() {
  const [year, setYear] = useState(github.years[0].year);
  const graph = useRef<SVGSVGElement>(null);
  const data = github.years.find(y => y.year === year)!;
  const g = useMemo(() => shape(data), [data]);

  const ref = useSectionMotion(({ q, qa, onRevert }) => {
    gridSlot(q('h2'));
    // The icons rise in (not their list items: a transform there would hold the tooltips).
    batchReveal(qa('[data-badge] > a'), { y: 12, stagger: 0.06 });
    // The year's total rolls up like a sector timer, then the weeks wipe in from January.
    onRevert(digitRoll(q('[data-total]'), { scrollTrigger: inView(q('[data-total]')!) }));
    clipReveal(graph.current, { from: WIPE, scrollTrigger: inView(q('[data-graph]')!, { start: 'top 80%' }) });
  });

  // Another year wipes in the same way, quicker. Not on the first render.
  const first = useRef(true);
  useGSAP(() => {
    if (first.current) { first.current = false; return; }
    if (motionEnabled() && graph.current) clipReveal(graph.current, { from: WIPE, duration: DUR.wipe });
  }, { dependencies: [year] });

  return (
    <section ref={ref} id="github" tabIndex={-1} data-bg="#0b0b0c,#0e0e11" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 data-speed className="display mb-14 max-w-[14ch] text-display-section">GitHub activity</h2>

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-line pt-5">
          <div>
            <p className="label mb-3">Contributions in {year}</p>
            <p className="display text-display-stat"><span key={year} data-total>{thousands(g.total)}</span></p>
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-mute">
              {thousands(g.careem)} on {profileLink('careem')}, my Careem account, and {thousands(g.personal)} on {profileLink('personal')}, my personal one.
            </p>
          </div>
          <YearPicker value={year} onChange={setYear} />
        </div>

        <ContributionGraph ref={graph} year={year} data={data} g={g} />
        {BADGES.length > 0 && <Badges />}

        <p className="label mt-12 text-dim">Updated {asOf}.</p>
      </div>
    </section>
  );
}
