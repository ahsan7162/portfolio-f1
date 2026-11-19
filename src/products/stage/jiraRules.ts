// Jira Board's list rules, copied from the plugin (github.com/ahsan7162/bb-plugin-my-jira, filters.ts and the
// ticket shape from jira.ts), so the demo filters, groups and dates its tickets exactly as the plugin does.
// MIT License, Copyright (c) 2026 Muhammad Ahsan. One change: age() pins dates to UTC, so the page reads the same everywhere.

/** One issue in a parent chain: enough to label, colour and link it. */
export interface IssueNode {
  key: string;
  summary: string;
  type: string;
  /** Jira hierarchy level: -1 subtask, 0 task/story/bug, 1 epic, 2+ initiative and above. */
  level: number;
  status: string;
  category: string;
}

export interface Ticket {
  key: string;
  summary: string;
  status: string;
  /** Jira status category: new | indeterminate | done. */
  category: string;
  type: string;
  priority: string | null;
  updated: string;
  level: number;
  /** Parent chain, nearest first: e.g. task → epic → initiative for a subtask. */
  ancestors: IssueNode[];
  /** The epic / initiative this ticket rolls up to (itself, when it is one). */
  epic: IssueNode | null;
  initiative: IssueNode | null;
}

/** Jira project key + number, e.g. ABC-123. */
export const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-\d+$/;

export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

/** A Jira priority name ("P1 - High", "Blocker", "Minor"…) as a level. Order matters: "highest" before "high", "lowest" before "low". */
export function priorityLevel(name: string | null): Priority | null {
  const p = (name ?? '').toLowerCase();
  if (/p0|highest|blocker|critical|immediate|urgent/.test(p)) return 'highest';
  if (/p1|high/.test(p)) return 'high';
  if (/p2|medium|normal/.test(p)) return 'medium';
  if (/p4|lowest|trivial/.test(p)) return 'lowest';
  if (/p3|low|minor/.test(p)) return 'low';
  return null;
}

export interface TicketFilter {
  statuses: ReadonlySet<string>;
  types: ReadonlySet<string>;
  query: string;
}

/** Status chips OR together, type chips OR together, the two AND, and the search narrows further. */
export function matchesFilter(t: Ticket, f: TicketFilter): boolean {
  if (f.statuses.size > 0 && !f.statuses.has(t.status)) return false;
  if (f.types.size > 0 && !f.types.has(t.type)) return false;
  const q = f.query.trim().toLowerCase();
  return !q || [t.key, t.summary, t.status, t.epic?.key, t.epic?.summary, t.initiative?.summary].some((s) => s?.toLowerCase().includes(q));
}

/** Compact age for rows: 5m, 3h, 36d, then "Apr 18" this year or "Apr 2025" before. */
export function age(iso: string, now = Date.now()): string {
  const at = Date.parse(iso);
  const minutes = Math.round((now - at) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days}d`;
  const d = new Date(at);
  return d.toLocaleDateString('en-US', d.getFullYear() === new Date(now).getFullYear() ? { month: 'short', day: 'numeric', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// ---------- status categories ----------

export type Cat = 'new' | 'indeterminate' | 'done';
export const catOf = (category: string): Cat => (category === 'done' || category === 'indeterminate' ? category : 'new');
/** Workflow order: in progress, then to do, then done. */
export const RANK: Record<Cat, number> = { indeterminate: 0, new: 1, done: 2 };

// ---------- groups as data, so the keyboard walks them in the order they show ----------

export interface GroupRow {
  ticket: Ticket;
  depth: number;
  /** The one parent worth naming on the row, when the group does not already say it. */
  parent?: IssueNode | null;
  via?: boolean;
}
export type GroupHead =
  | { kind: 'status'; status: string; cat: Cat }
  | { kind: 'node'; node: IssueNode; initiative?: IssueNode | null }
  | { kind: 'board'; name: string }
  | { kind: 'label'; text: string };
export interface Group {
  id: string;
  head: GroupHead;
  count: number;
  rows?: GroupRow[];
  groups?: Group[];
}
export type HierarchyBy = 'initiative' | 'epic';

/** Order a group's tickets so each subtask follows its parent when both are present. */
export function nestSubtasks(items: Ticket[]): { ticket: Ticket; depth: number }[] {
  const keys = new Set(items.map((t) => t.key));
  const children = new Map<string, Ticket[]>();
  for (const t of items) {
    const parent = t.ancestors[0];
    if (t.level === -1 && parent && keys.has(parent.key)) children.set(parent.key, [...(children.get(parent.key) ?? []), t]);
  }
  const nested = new Set([...children.values()].flat().map((t) => t.key));
  return items.flatMap((t) => (nested.has(t.key) ? [] : [{ ticket: t, depth: 0 }].concat((children.get(t.key) ?? []).map((c) => ({ ticket: c, depth: 1 })))));
}

/** A subtask names its task, a task its epic, an epic its initiative. */
export const parentOf = (t: Ticket): IssueNode | null =>
  t.level === -1 ? (t.ancestors[0] ?? null) : t.level === 0 ? t.epic : t.initiative && t.initiative.key !== t.key ? t.initiative : null;

const parentRows = (items: Ticket[]): GroupRow[] => nestSubtasks(items).map(({ ticket, depth }) => ({ ticket, depth, parent: depth === 0 ? parentOf(ticket) : null }));

export function byStatus(items: Ticket[]): Group[] {
  const groups = new Map<string, Ticket[]>();
  for (const t of items) groups.set(t.status, [...(groups.get(t.status) ?? []), t]);
  return [...groups.values()]
    .sort((a, b) => RANK[catOf(a[0].category)] - RANK[catOf(b[0].category)])
    .map((g): Group => ({ id: `status:${g[0].status}`, head: { kind: 'status', status: g[0].status, cat: catOf(g[0].category) }, count: g.length, rows: parentRows(g) }));
}

const lastIfEmpty = <T,>(entries: [string, T][]) => [...entries.filter(([k]) => k !== ''), ...entries.filter(([k]) => k === '')];

/** Initiative → epic → tickets, or one lane per epic, from each ticket's parent chain. */
export function byHierarchy(items: Ticket[], lanes: HierarchyBy): Group[] {
  const rows = (list: Ticket[]): GroupRow[] =>
    nestSubtasks(list).map(({ ticket, depth }) => ({ ticket, depth, parent: depth === 0 && ticket.level === -1 ? (ticket.ancestors[0] ?? null) : null }));
  const epicGroup = (id: string, node: IssueNode | null, list: Ticket[], emptyLabel: string, initiative?: IssueNode | null): Group => ({
    id,
    head: node ? { kind: 'node', node, initiative } : { kind: 'label', text: emptyLabel },
    count: list.length,
    rows: rows(list),
  });
  type Lane = { node: IssueNode | null; items: Ticket[] };
  if (lanes === 'epic') {
    const epics = new Map<string, Lane & { initiative: IssueNode | null }>();
    for (const t of items) {
      const ek = t.epic?.key ?? '';
      const e = epics.get(ek) ?? { node: t.epic, items: [], initiative: t.initiative };
      e.items.push(t);
      epics.set(ek, e);
    }
    return lastIfEmpty([...epics]).map(([ek, e]) => epicGroup(`epic:${ek}`, e.node, e.items, 'No epic', e.initiative));
  }
  const initiatives = new Map<string, { node: IssueNode | null; epics: Map<string, Lane> }>();
  for (const t of items) {
    const ik = t.initiative?.key ?? '';
    const ek = t.epic?.key ?? '';
    const i = initiatives.get(ik) ?? { node: t.initiative, epics: new Map<string, Lane>() };
    const e = i.epics.get(ek) ?? { node: t.epic, items: [] };
    e.items.push(t);
    i.epics.set(ek, e);
    initiatives.set(ik, i);
  }
  return lastIfEmpty([...initiatives]).flatMap(([ik, i]): Group[] => {
    const epics = lastIfEmpty([...i.epics]);
    if (!i.node) return epics.map(([ek, e]) => epicGroup(`epic:${ek}`, e.node, e.items, 'No epic or initiative'));
    return [{
      id: `initiative:${ik}`,
      head: { kind: 'node', node: i.node },
      count: epics.reduce((n, [, e]) => n + e.items.length, 0),
      groups: epics.map(([ek, e]) => epicGroup(`initiative:${ik}/epic:${ek}`, e.node, e.items, 'Not in an epic')),
    }];
  });
}

/**
 * Boards that list each ticket. A ticket no board lists directly takes the boards of its nearest
 * ancestor that is on one (a subtask via its task, a task via its epic), labelled "via …".
 */
export function byBoard(items: Ticket[], data: { boards: { id: number; name: string; keys: string[] }[] }): Group[] {
  const boardsOf = new Map<string, number[]>();
  for (const b of data.boards) for (const k of b.keys) boardsOf.set(k, [...(boardsOf.get(k) ?? []), b.id]);
  const entries = new Map<number, GroupRow[]>();
  const none: Ticket[] = [];
  for (const t of items) {
    let boards = boardsOf.get(t.key) ?? [];
    let via: IssueNode | undefined;
    if (boards.length === 0) {
      via = t.ancestors.find((a) => (boardsOf.get(a.key) ?? []).length > 0);
      boards = via ? boardsOf.get(via.key)! : [];
    }
    if (boards.length === 0) none.push(t);
    for (const id of boards) entries.set(id, [...(entries.get(id) ?? []), via ? { ticket: t, depth: 0, parent: via, via: true } : { ticket: t, depth: 0, parent: parentOf(t) }]);
  }
  const groups: Group[] = data.boards
    .filter((b) => entries.has(b.id))
    .sort((a, b) => entries.get(b.id)!.length - entries.get(a.id)!.length)
    .map((b) => ({ id: `board:${b.id}`, head: { kind: 'board', name: b.name }, count: entries.get(b.id)!.length, rows: entries.get(b.id)! }));
  if (none.length > 0) groups.push({ id: 'board:none', head: { kind: 'label', text: 'Not on any board (nor any parent)' }, count: none.length, rows: parentRows(none) });
  return groups;
}

export const allIds = (groups: Group[]): string[] => groups.flatMap((g) => [g.id, ...allIds(g.groups ?? [])]);
export const visibleKeys = (groups: Group[], collapsed: ReadonlySet<string>): string[] =>
  groups.flatMap((g) => (collapsed.has(g.id) ? [] : [...(g.rows ?? []).map((r) => r.ticket.key), ...visibleKeys(g.groups ?? [], collapsed)]));
