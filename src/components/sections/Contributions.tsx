import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { github, type Account, type GithubYear } from '@/content/github';
import { thousands } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useGSAP } from '@/motion/gsap';
import { batchReveal, clipReveal, digitRoll, gridSlot, inView } from '@/motion/patterns';
import { motionEnabled } from '@/motion/prefs';
import { DUR } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Cell and gap in viewBox units; the SVG scales to the card's width.
const CELL = 11, STEP = 14;
// An empty day is a faint chalk square; busy days are red at four strengths, GitHub's
// quartiles of the year's busy days. The busiest day stands out in chalk.
const LEVELS = [
  { fill: 'var(--fg)', opacity: 0.07 },
  { fill: 'var(--ac)', opacity: 0.3 },
  { fill: 'var(--ac)', opacity: 0.52 },
  { fill: 'var(--ac)', opacity: 0.76 },
  { fill: 'var(--ac)', opacity: 1 },
];
// The graph wipes in from the left, January first.
const WIPE = 'inset(0% 100% 0% 0%)';

const daysIn = (y: number) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
const dateOf = (y: number, i: number) => new Date(Date.UTC(y, 0, 1 + i));
/** "Tue 3 Mar", spelled out by hand so the prerender and the browser always agree. */
const dayName = (y: number, i: number) => { const d = dateOf(y, i); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const plural = (n: number) => `${thousands(n)} contribution${n === 1 ? '' : 's'}`;
const asOf = (() => { const [y, m, d] = github.asOf.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; })();

// What each badge is for, short, after GitHub's own descriptions (unknown ones show their name only).
const ABOUT: Record<string, string> = {
  'pair-extraordinaire': 'Co-authored commits on merged pull requests',
  quickdraw: 'Closed an issue or pull request within 5 minutes',
  'arctic-code-vault-contributor': 'Code in the 2020 GitHub Archive Program',
  yolo: 'Merged a pull request without a review',
  'galaxy-brain': 'Answered discussions',
  starstruck: 'Created a repository with many stars',
  'public-sponsor': 'Sponsored open source work',
};
// Pull Shark's levels as merged pull requests: the counts GitHub's own badge page lists
// (2nd, 16th, 128th merged). Other badges show their level only, as GitHub does.
const PULL_SHARK = [2, 16, 128, 1024];
const about = (slug: string, tier: number) => (slug === 'pull-shark' ? `${PULL_SHARK[tier - 1]}+ pull requests merged` : ABOUT[slug]);
const ACCOUNT_NAME: Record<Account, string> = { careem: 'Careem', personal: 'Personal' };
type Badge = { slug: string; name: string; tier: number; image: string; on: { who: Account; tier: number }[] };
/** Each badge once, at its highest level and with that level's art, plus every account that holds it. */
const BADGES = (() => {
  const by = new Map<string, Badge>();
  for (const who of ['careem', 'personal'] as const) for (const a of github.achievements[who]) {
    const b = by.get(a.slug) ?? { ...a, on: [] };
    if (a.tier > b.tier) Object.assign(b, { tier: a.tier, image: a.image });
    b.on.push({ who, tier: a.tier });
    by.set(a.slug, b);
  }
  for (const b of by.values()) b.on.sort((x, y) => y.tier - x.tier);
  return [...by.values()].sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
})();

/** Everything the graph needs for one year: per-day totals, levels, the week grid. */
function shape(y: GithubYear) {
  const days = y.personal.map((p, i) => p + y.careem[i]);
  const busy = days.filter(n => n > 0).sort((a, b) => a - b);
  const q = (f: number) => busy[Math.floor((busy.length - 1) * f)] ?? 0;
  const cut = [q(0.25), q(0.5), q(0.75)];
  const level = (n: number) => (n === 0 ? 0 : 1 + cut.filter(c => n > c).length);
  const max = Math.max(0, ...days);
  const lead = dateOf(y.year, 0).getUTCDay(); // weeks start on Sunday, as on GitHub
  const cols = Math.ceil((daysIn(y.year) + lead) / 7);
  return {
    days, max, best: max ? days.indexOf(max) : -1, cols, lead,
    total: days.reduce((a, b) => a + b, 0),
    personal: y.personal.reduce((a, b) => a + b, 0),
    careem: y.careem.reduce((a, b) => a + b, 0),
    cells: days.map((n, i) => ({ i, n, col: Math.floor((i + lead) / 7), row: (i + lead) % 7, level: level(n) })),
    // Each month's label sits over its first full week.
    months: MONTHS.map((m, k) => ({ m, col: Math.ceil((Math.round((Date.UTC(y.year, k, 1) - Date.UTC(y.year, 0, 1)) / 864e5) + lead) / 7) })),
  };
}

/**
 * Both GitHub accounts as one contribution graph, a year at a time: the personal
 * account and the Careem one, whose private work GitHub shows as counts only. The
 * counts come from the public profiles at build time (scripts/github.ts), so the
 * page never talks to GitHub and holds no token.
 */
export function Contributions() {
  const years = github.years;
  const [year, setYear] = useState(years[0].year);
  const [tip, setTip] = useState<number | null>(null);
  const graph = useRef<SVGSVGElement>(null);
  const cur = years.find(y => y.year === year)!;
  const g = useMemo(() => shape(cur), [cur]);
  const W = g.cols * STEP - (STEP - CELL), H = 7 * STEP - (STEP - CELL);

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
  const profile = (who: 'personal' | 'careem') => (
    <a href={`https://github.com/${github.logins[who]}`} target="_blank" rel="noreferrer" className="text-fg underline decoration-line underline-offset-4 transition-colors hover:text-ac">
      {github.logins[who]}
    </a>
  );

  return (
    <section ref={ref} id="github" tabIndex={-1} data-bg="#0b0b0c,#0e0e11" className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 data-speed className="display mb-14 max-w-[14ch] text-display-section">GitHub activity</h2>

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-line pt-5">
          <div>
            <p className="label mb-3">Contributions in {year}</p>
            <p className="display text-display-stat"><span key={year} data-total>{thousands(g.total)}</span></p>
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-mute">
              {thousands(g.careem)} on {profile('careem')}, my Careem account, and {thousands(g.personal)} on {profile('personal')}, my personal one.
            </p>
          </div>
          {/* Same pill as the phone 2D/3D toggle (GlToggle). */}
          <div role="group" aria-label="Year" className="flex max-w-full items-center overflow-x-auto rounded-full border border-line p-[3px] [scrollbar-width:none]">
            {years.map(({ year: y }) => (
              <button key={y} type="button" aria-pressed={y === year} onClick={() => { setTip(null); setYear(y); }}
                className={cn('flex h-9 shrink-0 items-center rounded-full px-2.5 font-mono text-[11px] font-semibold transition-colors duration-(--dur-hit) ease-out-expo md:px-3.5',
                  y === year ? 'bg-fg text-carbon' : 'text-mute hover:text-fg')}>
                {y}
              </button>
            ))}
          </div>
        </div>

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
                  <svg ref={graph} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img"
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
                      {at.n > 0 && <span className="mt-0.5 block font-mono text-[11px] text-dim">{cur.careem[at.i]} Careem · {cur.personal[at.i]} personal</span>}
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

        {/* The badges as on a GitHub profile: hover or focus one for what it is, click
            through to the account's badge page. */}
        {BADGES.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <p className="label">Achievements</p>
            <ul className="relative flex flex-wrap gap-3 md:gap-4">
              {BADGES.map((b, i) => (
                <li key={b.slug} data-badge className="group md:relative">
                  <a href={`https://github.com/${github.logins[b.on[0].who]}?achievement=${b.slug}&tab=achievements`} target="_blank" rel="noreferrer"
                    aria-describedby={`badge-${b.slug}`} className="relative block rounded-full">
                    <img src={`./github-badges/${b.image}`} alt={`${b.name}${b.tier > 1 ? `, level ${b.tier}` : ''}`} width={72} height={72} loading="lazy" decoding="async"
                      className="size-16 transition-transform duration-(--dur-hit) ease-out-expo group-hover:scale-110 md:size-[72px]" />
                    {b.tier > 1 && <span aria-hidden="true" className="absolute -right-1 bottom-0 rounded-full bg-fg px-1.5 font-mono text-[10px] font-semibold leading-4 text-carbon">x{b.tier}</span>}
                  </a>
                  {/* Never leaves the screen: on phones it starts where the row starts; wider, it
                      opens from its badge toward the middle of the row. */}
                  <div id={`badge-${b.slug}`} role="tooltip"
                    className={cn('pointer-events-none invisible absolute bottom-full z-10 mb-3 w-max max-w-60 border border-line bg-panel px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-(--dur-hit)',
                      'left-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100', i >= BADGES.length / 2 && 'md:left-auto md:right-0')}>
                    <span className="block font-semibold text-fg">{b.name}{b.tier > 1 ? ` x${b.tier}` : ''}</span>
                    {about(b.slug, b.tier) && <span className="mt-0.5 block text-mute">{about(b.slug, b.tier)}</span>}
                    <span className="mt-1 block font-mono text-[11px] text-dim">{b.on.map(o => `${ACCOUNT_NAME[o.who]}${o.tier > 1 ? ` x${o.tier}` : ''}`).join(' · ')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="label mt-12 text-dim">Updated {asOf}.</p>
      </div>
    </section>
  );
}
