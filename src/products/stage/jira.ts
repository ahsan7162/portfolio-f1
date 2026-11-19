// The Jira Board demo as data: an invented Jira site (acme-software), its workflow and its people, and the state
// the demo's controls and scenes change. Pure, so jira.test.ts can check it. The list rules themselves (filters,
// groupings, ages) are the plugin's own, in jiraRules.ts.
import {
  age, allIds, byBoard, byHierarchy, byStatus, catOf, ISSUE_KEY, matchesFilter, visibleKeys,
  type Cat, type Group, type IssueNode, type Ticket,
} from './jiraRules';

/** The demo's "now": ages are worked out from it, so the page reads the same on every visit. */
export const NOW = Date.UTC(2026, 10, 19, 12, 0);
export const SITES = ['acme-software', 'acme-labs'] as const;
export type Site = (typeof SITES)[number];

export interface Person { accountId: string; name: string; email: string }
/** People Jira lets you assign the demo's tickets to. Two are called Alex Kim, as names repeat on a real site. */
export const PEOPLE: Person[] = [
  { accountId: 'jane', name: 'Jane Doe', email: 'jane.doe@acme.dev' },
  { accountId: 'alex-1', name: 'Alex Kim', email: 'alex.kim@acme.dev' },
  { accountId: 'alex-2', name: 'Alex Kim', email: 'akim@acme-labs.dev' },
  { accountId: 'alexandra', name: 'Alexandra Ruiz', email: 'a.ruiz@acme.dev' },
  { accountId: 'priya', name: 'Priya Shah', email: 'priya.shah@acme.dev' },
  { accountId: 'sam', name: 'Sam Rivera', email: 'sam.rivera@acme.dev' },
  { accountId: 'lin', name: 'Lin Okafor', email: 'lin.okafor@acme.dev' },
  { accountId: 'mo', name: 'Mo Haddad', email: 'mo.haddad@acme.dev' },
];
/** The visitor is Jane: My Tickets is everything assigned to her. */
export const ME = 'jane';
export const nameOf = (id: string | null) => (id === null ? null : (PEOPLE.find((p) => p.accountId === id)?.name ?? null));

export const STATUS_CAT: Record<string, Cat> = { 'To Do': 'new', 'In Progress': 'indeterminate', 'In Review': 'indeterminate', Blocked: 'indeterminate', Done: 'done' };

export interface Move { id: string; name: string; to: string }
/** The moves the demo's workflow allows from each status. A move shows as its target, or "name → target" when they differ, as in the plugin. */
export const WORKFLOW: Record<string, Move[]> = {
  'To Do': [{ id: '11', name: 'In Progress', to: 'In Progress' }, { id: '61', name: 'Blocked', to: 'Blocked' }],
  'In Progress': [{ id: '21', name: 'In Review', to: 'In Review' }, { id: '61', name: 'Blocked', to: 'Blocked' }, { id: '71', name: 'Stop work', to: 'To Do' }],
  'In Review': [{ id: '31', name: 'Done', to: 'Done' }, { id: '41', name: 'Changes needed', to: 'In Progress' }, { id: '61', name: 'Blocked', to: 'Blocked' }],
  Blocked: [{ id: '51', name: 'Unblocked', to: 'In Progress' }],
  Done: [{ id: '81', name: 'Reopen', to: 'To Do' }],
};
export const moveLabel = (m: Move) => (m.name === m.to ? m.to : `${m.name} → ${m.to}`);

export interface Issue {
  key: string;
  summary: string;
  type: 'Initiative' | 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task';
  status: string;
  priority: string | null;
  parent: string | null;
  assignee: string | null;
  reporter: string;
  /** Minutes before NOW. */
  updated: number;
  /** Days before NOW. */
  created: number;
  desc: string[];
  labels?: string[];
  comments?: { by: string; ago: number; body: string }[];
}

const H = 60, D = 24 * 60;
type Row = [key: string, type: Issue['type'], summary: string, status: string, priority: string | null, parent: string | null, assignee: string | null, updated: number, created: number, desc: string];
const ROWS: Row[] = [
  ['ACME-10', 'Initiative', 'Faster checkout', 'In Progress', 'High', null, 'priya', 3 * D, 62, 'Cut the time from cart to paid in half this quarter.'],
  ['ACME-11', 'Initiative', 'A better first week', 'In Progress', 'Medium', null, 'priya', 2 * D, 48, 'More people finish setup and place a second order.'],
  ['ACME-100', 'Epic', 'One-page checkout', 'In Progress', 'High', 'ACME-10', 'priya', D, 40, 'Address, delivery and payment on one page, with the order summary always in view.'],
  ['ACME-101', 'Epic', 'New-user onboarding', 'In Progress', 'Medium', 'ACME-11', 'lin', 2 * D, 31, 'Three setup steps, then the first order.'],
  ['ACME-102', 'Epic', 'Saved payment methods', 'To Do', 'Medium', 'ACME-10', 'sam', 4 * D, 21, 'Save a card once and pay with one tap after that.'],
  // Jane's open tickets
  ['ACME-124', 'Bug', 'Promo code field clears when the address changes', 'In Progress', 'Highest', 'ACME-100', ME, 35, 3, 'Change the delivery address after entering a promo code and the code is gone. The total goes back up without a word.'],
  ['ACME-142', 'Story', 'Welcome screen with three setup steps', 'In Progress', 'Medium', 'ACME-101', ME, H, 6, 'Name, address, first favourite. Each step can be skipped and finished later.'],
  ['ACME-147', 'Bug', 'Skip button hidden on small Android screens', 'In Progress', 'High', 'ACME-101', ME, 4 * H, 2, 'On screens under 360 px wide, the Skip button on the welcome screens sits under the system navigation bar.'],
  ['ACME-207', 'Bug', 'Flaky end-to-end test for sign-in', 'In Progress', 'Low', null, ME, 20 * H, 5, 'Fails about one run in ten, always on the second-factor step.'],
  ['ACME-121', 'Story', 'Show the order summary beside the payment form', 'In Review', 'High', 'ACME-100', ME, 2 * H, 14, 'Customers lose track of what they are paying for once the payment form opens. The summary (items, delivery, discount, total) stays visible beside the form on screens wider than 1024 px.'],
  ['ACME-125', 'Sub-task', 'Write tests for the summary panel', 'In Review', 'Medium', 'ACME-121', ME, 3 * H, 9, 'Totals, discounts, and the panel collapsing under 1024 px.'],
  ['ACME-149', 'Task', 'Review the copy in onboarding emails', 'In Review', 'Low', 'ACME-101', ME, 24 * H, 8, 'Three emails, one voice. Marketing has left notes in the doc.'],
  ['ACME-115', 'Task', 'Store cards as tokens with the payment gateway', 'Blocked', 'Medium', 'ACME-102', ME, 6 * D, 18, 'Waiting on the gateway to turn on tokenization for our account.'],
  ['ACME-128', 'Task', 'Track checkout drop-off by step', 'To Do', 'Medium', 'ACME-100', ME, 2 * D, 11, 'One event per step, so we can see where people leave.'],
  ['ACME-112', 'Story', 'Let customers save a card at checkout', 'To Do', 'High', 'ACME-102', ME, 5 * D, 20, 'A "Save this card" box under the card form, off by default.'],
  ['ACME-151', 'Story', 'Ask for notification permission after the first order', 'To Do', 'Low', 'ACME-101', ME, 9 * D, 16, 'Not on first launch: after the first order, when there is something to tell them.'],
  ['ACME-203', 'Task', 'Upgrade the CI runners to Node 22', 'To Do', 'Medium', null, ME, 3 * D, 12, 'Node 20 leaves support in April.'],
  // Jane's done tickets
  ['ACME-118', 'Story', 'Show delivery fees before the payment step', 'Done', 'Medium', 'ACME-100', ME, 2 * D, 25, 'Fees are shown with the delivery options, not after them.'],
  ['ACME-136', 'Sub-task', 'Snapshot tests for the fee line', 'Done', 'Low', 'ACME-118', ME, 2 * D + 3 * H, 23, 'Light and dark, three currencies.'],
  ['ACME-109', 'Bug', 'Card form loses focus on Android', 'Done', 'High', 'ACME-102', ME, 6 * D, 30, 'The keyboard closes after every digit on some devices.'],
  ['ACME-140', 'Task', 'Copy for the first-run tooltip', 'Done', 'Low', 'ACME-101', ME, 12 * D, 28, 'Short, and it says what the button does.'],
  ['ACME-099', 'Task', 'Move the payments SDK to v4', 'Done', 'Medium', null, ME, 36 * D, 70, 'v3 stops working in January.'],
  ['ACME-090', 'Bug', 'Receipt email shows the wrong currency', 'Done', 'Highest', 'ACME-100', ME, 80 * D, 95, 'Receipts always said USD.'],
  // other people's, or nobody's
  ['ACME-131', 'Task', 'Apply promo codes before tax', 'Done', 'Medium', 'ACME-100', 'sam', 6 * D, 26, 'Tax is worked out on the discounted total.'],
  ['ACME-126', 'Sub-task', 'Hide the summary on phones under 600 px', 'To Do', 'Low', 'ACME-121', 'alex-1', D, 9, 'A bar above Pay instead, with the total.'],
  ['ACME-153', 'Story', 'Remind people who skip setup', 'To Do', 'Medium', 'ACME-101', 'lin', 4 * D, 10, 'One reminder, a day later, and only if they skipped.'],
  ['ACME-160', 'Bug', 'Cart total is wrong when two promo codes stack', 'To Do', 'High', 'ACME-100', null, 3 * H, 1, 'Two codes that should not combine both apply. Found in support tickets.'],
];
const COMMENTS: Record<string, Issue['comments']> = {
  'ACME-121': [{ by: 'Alex Kim', ago: 5 * H, body: 'The design is final: the Checkout v3 file, frame Summary panel.' }, { by: 'Jane Doe', ago: 2 * H, body: 'Up for review. The panel collapses into a bar on phones.' }],
  'ACME-124': [{ by: 'Priya Shah', ago: H, body: 'Support has had four of these today.' }],
  'ACME-147': [{ by: 'Lin Okafor', ago: 6 * H, body: 'Seen on two devices; iOS is fine.' }],
};
export const ISSUES: Record<string, Issue> = Object.fromEntries(ROWS.map(([key, type, summary, status, priority, parent, assignee, updated, created, desc]) => [key, {
  key, type, summary, status, priority, parent, assignee, updated, created,
  reporter: assignee === 'alex-1' ? 'Jane Doe' : 'Alex Kim', desc: [desc], labels: key === 'ACME-121' ? ['web'] : undefined, comments: COMMENTS[key],
} satisfies Issue]));

/** The boards that list tickets. The others reach a board through a parent, as "via …". */
export const BOARDS = [
  { id: 7, name: 'Checkout squad', keys: ['ACME-124', 'ACME-121', 'ACME-128', 'ACME-112', 'ACME-115', 'ACME-100', 'ACME-118', 'ACME-090', 'ACME-109', 'ACME-160'] },
  { id: 9, name: 'Mobile', keys: ['ACME-147', 'ACME-142', 'ACME-151', 'ACME-101', 'ACME-140'] },
  { id: 12, name: 'Platform', keys: ['ACME-207', 'ACME-203', 'ACME-099'] },
];

// ---------- issues as the plugin's tickets ----------

const levelOf = (type: Issue['type']) => (type === 'Initiative' ? 2 : type === 'Epic' ? 1 : type === 'Sub-task' ? -1 : 0);
const nodeOf = (i: Issue): IssueNode => ({ key: i.key, summary: i.summary, type: i.type, level: levelOf(i.type), status: i.status, category: STATUS_CAT[i.status] ?? 'new' });
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

/** Walk up from an issue, nearest parent first. */
export function ancestors(issues: Record<string, Issue>, key: string): IssueNode[] {
  const out: IssueNode[] = [];
  for (let p = issues[key]?.parent; p && issues[p] && out.length < 8; p = issues[p].parent) out.push(nodeOf(issues[p]));
  return out;
}
export function ticketOf(issues: Record<string, Issue>, key: string): Ticket {
  const i = issues[key];
  const self = nodeOf(i);
  const chain = ancestors(issues, key);
  const lineage = [self, ...chain];
  return {
    key, summary: i.summary, status: i.status, category: self.category, type: i.type, priority: i.priority, updated: iso(i.updated), level: self.level,
    ancestors: chain, epic: lineage.find((n) => n.level === 1) ?? null, initiative: lineage.find((n) => n.level >= 2) ?? null,
  };
}
export const ageOf = (minutesAgo: number) => age(iso(minutesAgo), NOW);
/** An issue's children, newest first, as the plugin's ticket view lists them (`parent = KEY`). */
export const childrenOf = (issues: Record<string, Issue>, key: string) =>
  Object.values(issues).filter((i) => i.parent === key).sort((a, b) => a.updated - b.updated).map((i) => ticketOf(issues, i.key));
export const childrenTitle = (level: number) => (level >= 2 ? 'Epics and issues in this initiative' : level === 1 ? 'Issues in this epic' : 'Subtasks');

// ---------- the demo's state ----------

export type Scope = 'open' | 'done';
export type GroupBy = 'status' | 'hierarchy:initiative' | 'hierarchy:epic' | 'board';
export const GROUPINGS: { id: GroupBy; label: string }[] = [
  { id: 'status', label: 'Status' }, { id: 'hierarchy:initiative', label: 'Initiative, then epic' }, { id: 'hierarchy:epic', label: 'Epic' }, { id: 'board', label: 'Board' },
];
/** Which menu is open: a list menu, the move strip or the assignee search on a ticket, the shortcut list. */
export type Menu = null | 'more' | 'type' | 'group' | 'site' | 'sheet' | 'move' | 'assign';

export interface JState {
  issues: Record<string, Issue>;
  site: Site;
  scope: Scope;
  statuses: string[];
  types: string[];
  query: string;
  groupBy: GroupBy;
  collapsed: string[];
  /** The row the ring is on. */
  cursor: string | null;
  /** The ticket open beside the list (or instead of it, on a narrow screen). */
  open: string | null;
  menu: Menu;
  /** The ticket a move strip belongs to: the open one, or a row's. */
  menuFor: string | null;
  /** What is typed in the assignee search. */
  who: string;
  /** Bumped by each status change, so the pill pops once. */
  pop: number;
}

export const fresh = (): JState => ({
  issues: ISSUES, site: 'acme-software', scope: 'open', statuses: [], types: [], query: '', groupBy: 'status', collapsed: [],
  cursor: null, open: null, menu: null, menuFor: null, who: '', pop: 0,
});

/** My Tickets: assigned to me, in the tab's scope, newest update first (the plugin's JQL). */
export function mine(s: Pick<JState, 'issues'>, scope: Scope): Ticket[] {
  return Object.values(s.issues)
    .filter((i) => i.assignee === ME && (STATUS_CAT[i.status] === 'done') === (scope === 'done'))
    .sort((a, b) => a.updated - b.updated)
    .map((i) => ticketOf(s.issues, i.key));
}
export const counts = (s: JState) => ({ open: mine(s, 'open').length, done: mine(s, 'done').length });
/** The demo's headline number: tickets still open. */
export const tally = (s: JState) => counts(s).open;

export const listOf = (s: JState) => mine(s, s.scope);
export const shownOf = (s: JState) => listOf(s).filter((t) => matchesFilter(t, { statuses: new Set(s.statuses), types: new Set(s.types), query: s.query }));
export function groupsOf(s: JState): Group[] {
  const shown = shownOf(s);
  if (s.groupBy === 'status') return byStatus(shown);
  if (s.groupBy === 'board') return byBoard(shown, { boards: BOARDS });
  return byHierarchy(shown, s.groupBy === 'hierarchy:epic' ? 'epic' : 'initiative');
}
export const orderOf = (s: JState) => [...new Set(visibleKeys(groupsOf(s), new Set(s.collapsed)))];
/** "5 of 12" for the open ticket, while it is in the list. */
export function positionOf(s: JState) {
  const order = orderOf(s);
  return s.open && order.includes(s.open) ? { index: order.indexOf(s.open), total: order.length } : null;
}
/** A key typed into search that isn't in the list: the plugin offers to open it anyway. */
export function typedKey(s: JState): string | null {
  const q = s.query.trim().toUpperCase();
  return ISSUE_KEY.test(q) && !listOf(s).some((t) => t.key === q) ? q : null;
}
/** The chips: statuses on this page by count, the busiest three inline and the rest in a menu. */
export function statusOptions(s: JState) {
  const m = new Map<string, { id: string; cat: Cat; count: number }>();
  for (const t of listOf(s)) m.set(t.status, { id: t.status, cat: catOf(t.category), count: (m.get(t.status)?.count ?? 0) + 1 });
  const rank = { indeterminate: 0, new: 1, done: 2 } as const;
  return [...m.values()].sort((a, b) => b.count - a.count || rank[a.cat] - rank[b.cat]);
}
export function typeOptions(s: JState) {
  const m = new Map<string, { id: string; level: number; count: number }>();
  for (const t of listOf(s)) m.set(t.type, { id: t.type, level: t.level, count: (m.get(t.type)?.count ?? 0) + 1 });
  return [...m.values()].sort((a, b) => b.count - a.count);
}
/** People Jira lets you assign a ticket to, matching a name or email, at most 20 (as the plugin asks). */
export function assignable(query: string): Person[] {
  const q = query.trim().toLowerCase();
  return PEOPLE.filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)).slice(0, 20);
}
export const movesOf = (s: JState, key: string) => WORKFLOW[s.issues[key]?.status ?? ''] ?? [];

// ---------- the changes ----------

const close = (s: JState): JState => ({ ...s, menu: null, menuFor: null, who: '' });
export function openTicket(s: JState, key: string): JState {
  return s.issues[key] ? { ...close(s), open: key, cursor: key } : s;
}
export const closeTicket = (s: JState): JState => ({ ...close(s), open: null });
/** J / K and [ / ]: the next row, or with a ticket open, the next ticket. */
export function step(s: JState, delta: number): JState {
  const order = orderOf(s);
  const at = order.indexOf(s.open ?? s.cursor ?? '');
  const next = order[Math.min(order.length - 1, Math.max(0, at + delta))];
  if (!next || next === s.open) return s;
  return s.open ? openTicket(s, next) : { ...s, cursor: next };
}
/** U: up to the open ticket's parent. */
export function up(s: JState): JState {
  const parent = s.open ? s.issues[s.open]?.parent : null;
  return parent ? openTicket(s, parent) : s;
}
/** S, or a click on a status: the moves the workflow allows, for the open ticket or the row the ring is on. */
export function showMoves(s: JState, key = s.open ?? s.cursor): JState {
  if (!key || !s.issues[key]) return s;
  return s.menu === 'move' && s.menuFor === key ? close(s) : { ...close(s), menu: 'move', menuFor: key };
}
export function transition(s: JState, key: string, to: string): JState {
  const i = s.issues[key];
  if (!i || !movesOf(s, key).some((m) => m.to === to)) return s;
  return { ...close(s), issues: { ...s.issues, [key]: { ...i, status: to, updated: 0 } }, pop: s.pop + 1 };
}
export const showAssign = (s: JState): JState => (!s.open ? s : s.menu === 'assign' ? close(s) : { ...close(s), menu: 'assign', menuFor: s.open });
/** Assign by account (null unassigns). A ticket that is no longer yours leaves My Tickets when the list reloads. */
export function assign(s: JState, key: string, accountId: string | null): JState {
  const i = s.issues[key];
  if (!i || (accountId !== null && !PEOPLE.some((p) => p.accountId === accountId))) return s;
  return { ...close(s), issues: { ...s.issues, [key]: { ...i, assignee: accountId, updated: 0 } } };
}
export const setScope = (s: JState, scope: Scope): JState => ({ ...close(s), scope, statuses: [], types: [], cursor: null });
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
export const toggleStatus = (s: JState, id: string): JState => ({ ...s, statuses: toggle(s.statuses, id) });
export const toggleType = (s: JState, id: string): JState => ({ ...s, types: toggle(s.types, id) });
export const clearFilters = (s: JState): JState => ({ ...s, statuses: [], types: [] });
export const setQuery = (s: JState, query: string): JState => ({ ...s, query });
export const setGroup = (s: JState, groupBy: GroupBy): JState => ({ ...close(s), groupBy, collapsed: [] });
export const toggleGroup = (s: JState, id: string): JState => ({ ...s, collapsed: toggle(s.collapsed, id) });
export const collapseAll = (s: JState): JState => ({ ...s, collapsed: s.collapsed.length ? [] : allIds(groupsOf(s)) });
export const setMenu = (s: JState, menu: Menu): JState => (s.menu === menu ? close(s) : { ...close(s), menu });
export const setSite = (s: JState, site: Site): JState => ({ ...close(s), site });
/** Esc: a menu first, then the ticket, then the search. */
export function escape(s: JState): JState {
  if (s.menu) return close(s);
  if (s.open) return closeTicket(s);
  if (s.query) return { ...s, query: '' };
  return s;
}

// ---------- Your turn ----------

export type Goal = 'review' | 'epic' | 'done' | 'search';
/** The goals a change has just met: a ticket in review opened, an epic reached, a ticket moved to Done, ACME-160 opened from search. */
export function goalsMet(a: JState, b: JState): Goal[] {
  const out: Goal[] = [];
  const opened = b.open && b.open !== a.open ? b.issues[b.open] : null;
  if (opened?.status === 'In Review') out.push('review');
  if (opened && levelOf(opened.type) === 1 && a.open && b.issues[a.open]?.parent === opened.key) out.push('epic');
  if (Object.values(b.issues).some((i) => i.status === 'Done' && a.issues[i.key]?.status !== 'Done')) out.push('done');
  if (opened?.key === 'ACME-160' && typedKey(a) === 'ACME-160') out.push('search');
  return out;
}
