// The one Jira Board row the anatomy block takes apart, as data: the ticket, and the states each part can be drawn in.
// Kept apart from the demo's site (jira.ts), so a page that shows only the row doesn't load the whole site.
import { age, type Cat, type Ticket } from './jiraRules';

/** The demo's "now": ages are worked out from it, so the page reads the same on every visit. */
export const NOW = Date.UTC(2026, 10, 19, 12, 0);
export const H = 60, D = 24 * 60;
export const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();
export const ageOf = (minutesAgo: number) => age(iso(minutesAgo), NOW);
export const STATUS_CAT: Record<string, Cat> = { 'To Do': 'new', 'In Progress': 'indeterminate', 'In Review': 'indeterminate', Blocked: 'indeterminate', Done: 'done' };

/** ACME-124 as the demo's site has it (jira.test.ts checks the two agree). */
export const ROW_TICKET: Ticket = {
  key: 'ACME-124', summary: 'Promo code field clears when the address changes', status: 'In Progress', category: 'indeterminate', type: 'Bug', priority: 'Highest',
  updated: iso(35), level: 0,
  ancestors: [
    { key: 'ACME-100', summary: 'One-page checkout', type: 'Epic', level: 1, status: 'In Progress', category: 'indeterminate' },
    { key: 'ACME-10', summary: 'Faster checkout', type: 'Initiative', level: 2, status: 'In Progress', category: 'indeterminate' },
  ],
  epic: { key: 'ACME-100', summary: 'One-page checkout', type: 'Epic', level: 1, status: 'In Progress', category: 'indeterminate' },
  initiative: { key: 'ACME-10', summary: 'Faster checkout', type: 'Initiative', level: 2, status: 'In Progress', category: 'indeterminate' },
};
export const ROW_AGE = 35;

/** The parts of a row, in reading order, and the states the drawing can show each one in. */
export const ROW_TYPES = ['Initiative', 'Epic', 'Story', 'Task', 'Bug', 'Security', 'Sub-task'] as const;
export const ROW_STATUS = ['To Do', 'In Progress', 'Done'] as const;
export const ROW_PRIORITY = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;
/** Minutes before NOW: 5m, 3h, 36d, Apr 18, Apr 2025 as the plugin writes them. */
export const ROW_AGES = [5, 3 * H, 36 * D, 215 * D, 580 * D] as const;
export const ROW_STATES = {
  type: [...ROW_TYPES],
  key: [],
  title: [],
  parent: ['Its epic', 'Via a parent, on a board'],
  status: [...ROW_STATUS],
  priority: [...ROW_PRIORITY],
  age: ROW_AGES.map(ageOf),
} satisfies Record<string, string[]>;
export type RowPart = keyof typeof ROW_STATES;
