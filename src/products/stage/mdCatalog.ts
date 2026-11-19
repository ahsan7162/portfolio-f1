// The `/` menu: the plugin's 39 entries in its seven groups, with its own labels, glyphs, aliases and filter
// (copied from Markwright's editor/catalog.ts, MIT, (c) Muhammad Ahsan). Each entry says which blocks it adds
// to the demo's document; the words in a fresh block are filled in so the block shows and its line is visible.
import { CALLOUTS, parse, type Callout, type MdBlock } from './md';
import { DOCUMENT_TEMPLATES, fillTemplate } from './mdTemplates';

export type Group = 'Text' | 'Lists' | 'Advanced' | 'Diagrams' | 'Callouts' | 'Media' | 'Templates';
export const GROUP_ORDER: Group[] = ['Text', 'Lists', 'Advanced', 'Diagrams', 'Callouts', 'Media', 'Templates'];

export interface Entry {
  id: string;
  label: string;
  glyph: string;
  group: Group;
  aliases: string[];
  hint?: string;
  /** The blocks it adds. Without it the entry is shown but needs the real editor (Image needs a file). */
  make?: () => MdBlock[];
}

export const MERMAID_STARTERS: { id: string; label: string; code: string }[] = [
  { id: 'flowchart', label: 'Flowchart', code: 'flowchart TD\n  A[Start] --> B{Ready?}\n  B -->|Yes| C[Ship it]\n  B -->|No| D[Fix]\n  D --> B' },
  { id: 'sequence', label: 'Sequence diagram', code: 'sequenceDiagram\n  participant U as User\n  participant A as API\n  U->>A: Request\n  A-->>U: Response' },
  { id: 'class', label: 'Class diagram', code: 'classDiagram\n  class Order {\n    +id: string\n    +total(): number\n  }\n  Customer "1" --> "*" Order' },
  { id: 'state', label: 'State diagram', code: 'stateDiagram-v2\n  [*] --> Draft\n  Draft --> Review\n  Review --> Published\n  Published --> [*]' },
  { id: 'er', label: 'Entity relationship', code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains' },
  { id: 'gantt', label: 'Gantt chart', code: 'gantt\n  title Plan\n  dateFormat YYYY-MM-DD\n  section Build\n  Design :a1, 2026-01-05, 5d\n  Build  :after a1, 10d' },
  { id: 'pie', label: 'Pie chart', code: 'pie title Traffic\n  "Search" : 60\n  "Direct" : 30\n  "Social" : 10' },
  { id: 'mindmap', label: 'Mind map', code: 'mindmap\n  root((Idea))\n    Goals\n    Risks\n    Next steps' },
];

const CALLOUT_GLYPHS: Record<Callout, string> = { NOTE: 'ⓘ', TIP: '✦', IMPORTANT: '❢', WARNING: '⚠', CAUTION: '⛔' };
const title = (c: Callout) => c[0] + c.slice(1).toLowerCase();

const heading = (level: number): Entry => ({
  id: `h${level}`, label: `Heading ${level}`, glyph: `H${level}`, group: 'Text', aliases: [`h${level}`, 'heading', 'title'], hint: '#'.repeat(level),
  make: () => [{ t: 'h', level, text: 'New section' }],
});

export const CATALOG: Entry[] = [
  { id: 'text', label: 'Text', glyph: '¶', group: 'Text', aliases: ['paragraph', 'plain', 'p'], make: () => [{ t: 'p', text: 'A new paragraph.' }] },
  ...[1, 2, 3, 4, 5, 6].map(heading),
  { id: 'quote', label: 'Quote', glyph: '❝', group: 'Text', aliases: ['blockquote', 'citation'], hint: '>', make: () => [{ t: 'quote', text: 'Ship small, ship often.' }] },
  { id: 'divider', label: 'Divider', glyph: '—', group: 'Text', aliases: ['hr', 'rule', 'separator', 'line'], hint: '---', make: () => [{ t: 'hr' }] },
  { id: 'bullet', label: 'Bulleted list', glyph: '•', group: 'Lists', aliases: ['ul', 'unordered', 'list'], hint: '-', make: () => [{ t: 'list', ordered: false, items: [{ text: 'First point' }] }] },
  { id: 'numbered', label: 'Numbered list', glyph: '1.', group: 'Lists', aliases: ['ol', 'ordered'], hint: '1.', make: () => [{ t: 'list', ordered: true, items: [{ text: 'First step' }] }] },
  { id: 'checklist', label: 'Checklist', glyph: '☑', group: 'Lists', aliases: ['todo', 'task', 'checkbox'], hint: '[ ]', make: () => [{ t: 'list', ordered: false, items: [{ text: 'First task', done: false }] }] },
  { id: 'table', label: 'Table', glyph: '⊞', group: 'Advanced', aliases: ['grid', 'columns', 'rows'], make: () => [{ t: 'table', head: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] }] },
  { id: 'code', label: 'Code block', glyph: '</>', group: 'Advanced', aliases: ['snippet', 'pre', 'fence'], hint: '```', make: () => [{ t: 'code', lang: 'ts', code: 'export const ready = true;' }] },
  ...MERMAID_STARTERS.map<Entry>((m) => ({
    id: `mermaid-${m.id}`, label: m.label, glyph: '◇', group: 'Diagrams', aliases: ['mermaid', 'diagram', 'chart', 'graph', m.id],
    make: () => [{ t: 'code', lang: 'mermaid', code: m.code }],
  })),
  ...CALLOUTS.map<Entry>((c) => ({
    id: `callout-${c.toLowerCase()}`, label: `${title(c)} callout`, glyph: CALLOUT_GLYPHS[c], group: 'Callouts', aliases: ['callout', 'alert', 'admonition', c.toLowerCase()],
    make: () => [{ t: 'quote', callout: c, text: 'Write here' }],
  })),
  { id: 'image', label: 'Image', glyph: '▣', group: 'Media', aliases: ['img', 'picture', 'photo'] },
  ...DOCUMENT_TEMPLATES.map<Entry>((tpl) => ({
    id: `template-${tpl.id}`, label: tpl.label, glyph: '▤', group: 'Templates', aliases: ['template', tpl.id, ...tpl.label.toLowerCase().split(/\W+/)], hint: 'template',
    make: () => parse(fillTemplate(tpl.markdown)).parts.map((p) => p.b),
  })),
];

/** Substring match on label and aliases; an empty query lists everything. The plugin's own filter. */
export function filterCatalog(query: string, items: Entry[] = CATALOG): Entry[] {
  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((item) => item.label.toLowerCase().includes(q) || item.aliases.some((alias) => alias.includes(q))) : items;
  return [...matches].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}
