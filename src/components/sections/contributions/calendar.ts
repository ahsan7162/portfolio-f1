import { github, type GithubYear } from '@/content/github';
import { thousands } from '@/lib/format';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Cell and gap in viewBox units; the SVG scales to the card's width. */
export const CELL = 11, STEP = 14;
/**
 * An empty day is a faint chalk square; busy days are red at four strengths, GitHub's
 * quartiles of the year's busy days. The busiest day stands out in chalk.
 */
export const LEVELS = [
  { fill: 'var(--fg)', opacity: 0.07 },
  { fill: 'var(--ac)', opacity: 0.3 },
  { fill: 'var(--ac)', opacity: 0.52 },
  { fill: 'var(--ac)', opacity: 0.76 },
  { fill: 'var(--ac)', opacity: 1 },
];

const daysIn = (y: number) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
const dateOf = (y: number, i: number) => new Date(Date.UTC(y, 0, 1 + i));
/** "Tue 3 Mar", spelled out by hand so the prerender and the browser always agree. */
export const dayName = (y: number, i: number) => { const d = dateOf(y, i); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
export const plural = (n: number) => `${thousands(n)} contribution${n === 1 ? '' : 's'}`;
export const asOf = (() => { const [y, m, d] = github.asOf.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; })();

export type YearShape = ReturnType<typeof shape>;

/** Everything the graph needs for one year: per-day totals, levels, the week grid. */
export function shape(y: GithubYear) {
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
