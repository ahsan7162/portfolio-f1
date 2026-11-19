// The pieces of Jira Board's interface, drawn: type glyphs, status rings, priority marks and a ticket row.
// The ring and the priority chevrons are the plugin's own paths (parts.tsx); the type glyphs follow its icon names.
import type { CSSProperties, ReactNode } from 'react';
import type { IssueNode, Ticket } from './jiraRules';
import { catOf, priorityLevel, type Cat, type Priority } from './jiraRules';

const PATHS: Record<string, string[]> = {
  bug: ['m8 2 1.88 1.88', 'M14.12 3.88 16 2', 'M9 7.13v-1a3 3 0 1 1 6 0v1', 'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6', 'M12 20v-9', 'M6.53 9C4.6 8.8 3 7.1 3 5', 'M6 13H2', 'M3 21c0-2.1 1.7-3.9 3.8-4', 'M20.97 5c0 2.1-1.6 3.8-3.5 4', 'M22 13h-4', 'M17.2 17c2.1.1 3.8 1.9 3.8 4'],
  story: ['M15 12H3', 'M17 18H3', 'M21 6H3'],
  task: ['M20 6 9 17l-5-5'],
  subtask: ['M4 4v9a3 3 0 0 0 3 3h6', 'm10 12 4 4-4 4', 'M16.5 13h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5z'],
  epic: ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'],
  initiative: ['M11.5 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.91l5.16-.75a2.12 2.12 0 0 0 1.6-1.16z'],
  security: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
  board: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M12 3v18'],
  chev: ['m6 9 6 6 6-6'],
  left: ['m15 18-6-6 6-6'],
  right: ['m9 18 6-6-6-6'],
  up: ['m5 12 7-7 7 7', 'M12 19V5'],
  plus: ['M5 12h14', 'M12 5v14'],
  refresh: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  out: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  side: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M9 3v18'],
  chat: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  pr: ['M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M13 6h3a2 2 0 0 1 2 2v7', 'M6 9v12'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  doc: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4'],
  gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  logo: ['M5 4h6a4 4 0 0 1 0 8H5z', 'M5 12h7a4 4 0 0 1 0 8H5z'],
};
export type IconName = keyof typeof PATHS;

export function Ico({ n, className }: { n: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[n].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
export const Chev = () => <Ico n="chev" className="jbd-chev" />;

export type TypeKey = 'initiative' | 'epic' | 'story' | 'task' | 'bug' | 'security' | 'subtask';
/** Issue type → colour and glyph: by name first (Bug, Story…), then by hierarchy level, as the plugin does. */
export function typeOf(type: string, level: number): TypeKey {
  const name = type.toLowerCase();
  if (level >= 2 || name.includes('initiative')) return 'initiative';
  if (level === 1 || name.includes('epic')) return 'epic';
  if (level === -1 || name.includes('sub')) return 'subtask';
  if (name.includes('security') || name.includes('vulnerab')) return 'security';
  if (name.includes('bug') || name.includes('incident')) return 'bug';
  if (name.includes('story')) return 'story';
  return 'task';
}
export const typeVars = (t: TypeKey) => ({ '--c': `var(--t-${t})`, '--bg': `var(--t-${t}-bg)`, '--ink': `var(--t-${t}-ink)` }) as CSSProperties;
export const catVars = (c: Cat) => ({ '--c': `var(--st-${c})`, '--bg': `var(--st-${c}-bg)`, '--ink': `var(--st-${c}-ink)` }) as CSSProperties;

export function TypeGlyph({ type, level }: { type: string; level: number }) {
  const t = typeOf(type, level);
  return <span className="jbd-ty" style={typeVars(t)} title={type}><Ico n={t} /></span>;
}
export function TypeChip({ type, level }: { type: string; level: number }) {
  const t = typeOf(type, level);
  return <span className="jbd-chipt" style={typeVars(t)} title={type}><Ico n={t} /><span className="pp-sr">{type}</span></span>;
}

/** The status category as a ring: empty (to do), half (in progress), filled with a check (done). */
export function Ring({ cat }: { cat: Cat }) {
  return (
    <svg viewBox="0 0 16 16" className="jbd-ring" style={catVars(cat)} aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill={cat === 'done' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      {cat === 'indeterminate' && <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />}
      {cat === 'done' && <path d="M5.3 8.2l1.8 1.8 3.6-3.8" fill="none" stroke="#070707" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

const PRIO: Record<Priority, string> = { highest: 'M3 6.5l3-3 3 3M3 9.5l3-3 3 3', high: 'M3 7.5l3-3 3 3', medium: 'M3 4.5h6M3 7.5h6', low: 'M3 4.5l3 3 3-3', lowest: 'M3 2.5l3 3 3-3M3 5.5l3 3 3-3' };
/** Urgent priorities as a tinted tag with their name; the rest as the coloured glyph alone, named on hover. */
export function PrioMark({ priority, label, part }: { priority: string | null; label?: boolean; part?: string }) {
  const p = priorityLevel(priority);
  if (!p || !priority) return null;
  const tag = label ?? (p === 'highest' || p === 'high');
  return (
    <span className="jbd-prio" data-part={part} data-tag={tag || undefined} title={priority} style={{ '--c': `var(--p-${p})`, '--bg': `var(--p-${p}-bg, transparent)` } as CSSProperties}>
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d={PRIO[p]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {tag ? priority : <span className="pp-sr">{priority}</span>}
    </span>
  );
}

/**
 * One ticket, inbox style: the title carries the row; key, parent, status, priority and age sit in aligned columns
 * on a wide list, or on one muted line under the title. `status` is the status control (the demo's button);
 * `hit` is the button that covers the row and opens it. `part` names each piece, for the anatomy block.
 */
export function RowView({ t, depth = 0, parent, via, age, status, hit, sel, after }: {
  t: Ticket; depth?: number; parent?: IssueNode | null; via?: boolean; age: string; status: ReactNode; hit?: ReactNode; sel?: boolean; after?: ReactNode;
}) {
  const pt = parent ? typeOf(parent.type, parent.level) : null;
  const tk = typeOf(t.type, t.level);
  return (
    <li className="jbd-row" data-key={t.key} data-sel={sel || undefined} data-depth={depth} data-flip-id={t.key}>
      {hit}
      <span className="jbd-ty" data-part="type" style={typeVars(tk)} title={t.type}><Ico n={tk} /></span>
      <span className="jbd-row-key jbd-mono" data-part="key">{t.key}</span>
      <span className="jbd-row-title" data-part="title">{depth > 0 && <span className="jbd-sub" aria-hidden="true">↳</span>}{t.summary}</span>
      <span className="jbd-row-par" data-part="parent">
        {parent && pt && <>{via && 'via '}<span className="jbd-par-ty" style={typeVars(pt)}><Ico n={pt} /></span><span>{parent.summary}</span></>}
      </span>
      <span className="jbd-row-st" data-part="status">{status}</span>
      <PrioMark priority={t.priority} part="priority" />
      <span className="jbd-row-age" data-part="age">{age}</span>
      {after}
    </li>
  );
}
export { catOf };
