// The Markwright demo's state and every change it can make, pure: what the editor shows, what is on disk,
// the save that is waiting, and the agent's edits. The demo (MdDemo.tsx) and its scenes (mdScenes.ts) both
// change it only through these functions, so what plays and what the visitor can do are the same thing.
import { linesChanged } from '../lineDiff';
import { CATALOG } from './mdCatalog';
import { MW_DEMO } from './mwData.gen';
import { addRow, change, fileOf, find, insert, parse, read, setCell, toggleTask, type Doc, type MdBlock } from './md';

export interface MdState {
  /** What the editor shows. */
  doc: Doc;
  /** What is on disk: the editor's last save, or the agent's last write. */
  disk: Doc;
  /** The committed file, which the gutter and the tally count from. */
  base: string;
  view: 'rich' | 'source';
  /** The empty line ("Type / for blocks") sits after this block; null puts it at the end. */
  slot: number | null;
  /** The `/` menu's filter while it is open, and the entry it has picked. */
  query: string | null;
  pick: number;
  /** An edit is waiting for autosave (800 ms after the last one). */
  saving: boolean;
  /** The agent's version, while the changed-on-disk banner is up; autosave waits. */
  theirs: Doc | null;
  compare: boolean;
  undo: Doc[];
  redo: Doc[];
  /** How many of the agent's edits have landed. */
  agent: number;
  /** The Mermaid block whose source is open (Edit diagram). */
  editing: number | null;
}

/** Autosave runs this long after the last edit, as the plugin's does. */
export const SAVE_MS = 800;

export const BASE = MW_DEMO.committed;

/** The committed file, open and saved. The empty line waits under the opening paragraph, in view from the start. */
export function fresh(): MdState {
  const doc = parse(BASE);
  return { doc, disk: doc, base: BASE, view: 'rich', slot: paragraphOf(doc), query: null, pick: 0, saving: false, theirs: null, compare: false, undo: [], redo: [], agent: 0, editing: null };
}

const tableOf = (d: Doc) => find(d, (b) => b.t === 'table')?.id ?? -1;
export const tasksOf = (d: Doc) => find(d, (b) => b.t === 'list' && b.items.some((i) => i.done !== undefined))?.id ?? -1;
const rolloutOf = (d: Doc) => find(d, (b) => b.t === 'h' && b.text.startsWith('Rollout'))?.id ?? -1;
export const paragraphOf = (d: Doc) => find(d, (b) => b.t === 'p')?.id ?? -1;

/** What the agent does, in turn: each is an edit to the file on disk, as an agent writing the text would make it. */
export const AGENT: { say: string; run: (d: Doc) => Doc }[] = [
  { say: 'Add a Mobile release row to Workstreams', run: (d) => addRow(d, tableOf(d), ['Mobile release', 'Lin Okafor', 'On track', 'Mar 10']) },
  { say: 'Mark the Dashboard on track', run: (d) => setCell(d, tableOf(d), 1, 2, 'On track') },
  { say: 'Rename Rollout to Rollout plan', run: (d) => change(d, rolloutOf(d), (b) => (b.t === 'h' ? { ...b, text: 'Rollout plan' } : b)) },
];

/** Any edit by the visitor: it can be undone, and autosave starts waiting (unless the banner is up). */
const edit = (s: MdState, doc: Doc): MdState => (doc === s.doc ? s : { ...s, doc, undo: [...s.undo, s.doc].slice(-40), redo: [], saving: true });

export const tick = (s: MdState, id: number, i: number) => edit(s, toggleTask(s.doc, id, i));

/** New blocks at the empty line; the empty line then follows the last of them. */
export function add(s: MdState, bs: MdBlock[]): MdState {
  if (!bs.length) return s;
  const after = s.slot ?? s.doc.parts.at(-1)?.id ?? null;
  const doc = insert(s.doc, after, bs);
  return { ...edit(s, doc), slot: doc.next - 1, query: null, pick: 0 };
}

/** A line typed on the empty line and Enter: Markdown shortcuts (`## `, `- [ ] `, `> `) make their block, as they do in the editor. */
export const typed = (s: MdState, text: string) => (text.trim() ? add(s, [read(text.trim())]) : s);

/** The pending edit lands on disk; with the banner up, autosave waits. */
export const save = (s: MdState): MdState => (s.saving && !s.theirs ? { ...s, disk: s.doc, saving: false } : s);

/**
 * The agent writes the file. With no unsaved edit the change appears in place; with one, nothing is
 * overwritten: autosave stops and the banner asks which version to keep.
 */
export function agentWrites(s: MdState): MdState {
  const step = AGENT[s.agent];
  if (!step) return s;
  const theirs = step.run(s.theirs ?? s.disk);
  if (!s.saving && !s.theirs) return { ...s, doc: theirs, disk: theirs, agent: s.agent + 1 };
  return { ...s, theirs, saving: false, agent: s.agent + 1 };
}

export const keepMine = (s: MdState): MdState => (s.theirs ? { ...s, disk: s.doc, theirs: null, compare: false } : s);
export const useTheirs = (s: MdState): MdState => (s.theirs ? { ...s, doc: s.theirs, disk: s.theirs, theirs: null, compare: false, undo: [], redo: [] } : s);

export function undo(s: MdState): MdState {
  const prev = s.undo.at(-1);
  return prev ? { ...s, doc: prev, undo: s.undo.slice(0, -1), redo: [...s.redo, s.doc], saving: true, slot: null } : s;
}
export function redo(s: MdState): MdState {
  const next = s.redo.at(-1);
  return next ? { ...s, doc: next, redo: s.redo.slice(0, -1), undo: [...s.undo, s.doc], saving: true, slot: null } : s;
}

/** The file on disk now: the agent's version while the banner is up, otherwise the last save. */
export const onDisk = (s: MdState) => s.theirs ?? s.disk;

/** Lines changed on disk since the commit: the demo's tally. */
export const tally = (s: MdState) => linesChanged(s.base, fileOf(onDisk(s)));

export const WARNING = 'Do not enable sync for enterprise workspaces until the audit log ships.';
/** What the `/` menu's Flowchart entry inserts. */
export const FLOWCHART = CATALOG.find((e) => e.id === 'mermaid-flowchart')?.make?.() ?? [];

/**
 * Where the four scenes start and end, in order: each scene starts where the one before ended. Tick it, Insert it,
 * Draw it, Agents welcome (an agent's write while the editor is clean, then one while an edit waits: Keep mine).
 */
export const STORY: MdState[] = (() => {
  const s0 = fresh();
  const s1 = save(tick(s0, tasksOf(s0.doc), 2));
  const s2 = save(add({ ...s1, slot: paragraphOf(s1.doc) }, [{ t: 'quote', callout: 'WARNING', text: WARNING }]));
  const s3 = save({ ...add({ ...s2, slot: null }, FLOWCHART), slot: null });
  const clean = agentWrites(s3);
  const s4 = keepMine(agentWrites(tick(clean, tasksOf(clean.doc), 3)));
  return [s0, s1, s2, s3, s4];
})();
