// What the playground offers: every block type with a group, a one-line use, a glyph and content to start
// from, and the templates a page can start from. Sample content is about a made-up product and says so.
import { products } from '../data';
import { SCENES } from '../stage/names';
import type { Block, Product } from '../types';

export type BlockType = Block['type'];
/** A rectangle in a 40 x 28 glyph: x, y, w, h, and how it is drawn (0 a line, 1 a filled area, 2 a ring). */
export type Rect = [number, number, number, number, 0 | 1 | 2];

export interface Entry {
  type: BlockType;
  name: string;
  /** What it is for, in one line. */
  use: string;
  group: Group;
  glyph: Rect[];
  /** Only for a product whose stage is a live demo with scenes. */
  needsScenes?: boolean;
}

export const GROUPS = ['Open with', 'Tell it', 'Prove it', 'Show it', 'Let them try', 'Close'] as const;
export type Group = (typeof GROUPS)[number];

const L = (x: number, y: number, w: number, h = 3): Rect => [x, y, w, h, 0];
const F = (x: number, y: number, w: number, h: number): Rect => [x, y, w, h, 1];
const R = (x: number, y: number, w: number, h: number): Rect => [x, y, w, h, 2];

export const CATALOG: Entry[] = [
  { type: 'stage', name: 'Stage', use: 'The product itself, live or in its frame', group: 'Open with', glyph: [F(5, 4, 30, 20)] },
  { type: 'statement', name: 'Statement', use: 'One big sentence, and why', group: 'Open with', glyph: [L(5, 6, 26, 5), L(5, 14, 18, 5), L(28, 20, 7, 2)] },
  { type: 'text', name: 'Text', use: 'A story in paragraphs', group: 'Open with', glyph: [L(5, 5, 30, 2), L(5, 10, 28, 2), L(5, 15, 30, 2), L(5, 20, 20, 2)] },
  { type: 'showcase', name: 'Showcase', use: 'Two or three screens, fanned out', group: 'Open with', glyph: [F(4, 9, 14, 12), F(13, 5, 14, 14), F(23, 9, 14, 12)] },
  { type: 'screens', name: 'Screens', use: 'A sideways gallery of screenshots', group: 'Open with', glyph: [F(2, 6, 14, 16), F(18, 6, 14, 16), F(34, 6, 6, 16)] },
  { type: 'features', name: 'Features', use: 'Six things it does', group: 'Tell it', glyph: [F(5, 5, 8, 8), F(16, 5, 8, 8), F(27, 5, 8, 8), F(5, 16, 8, 8), F(16, 16, 8, 8), F(27, 16, 8, 8)] },
  { type: 'steps', name: 'Steps', use: 'How a request travels, or how to set it up', group: 'Tell it', glyph: [R(4, 10, 8, 8), L(12, 13, 4, 2), R(16, 10, 8, 8), L(24, 13, 4, 2), R(28, 10, 8, 8)] },
  { type: 'split', name: 'Split', use: 'A screen beside its words', group: 'Tell it', glyph: [F(4, 5, 17, 18), L(24, 8, 12), L(24, 14, 10, 2), L(24, 18, 8, 2)] },
  { type: 'tour', name: 'Tour', use: 'Points that step through one screen', group: 'Tell it', glyph: [L(4, 6, 10), L(4, 12, 10, 2), L(4, 17, 10, 2), F(17, 4, 19, 20)] },
  { type: 'cases', name: 'Cases', use: 'One stage, a tab per use case', group: 'Tell it', glyph: [F(5, 3, 30, 17), L(6, 23, 8, 2), L(16, 23, 8, 2), L(26, 23, 8, 2)] },
  { type: 'scenes', name: 'Scenes', use: 'The live demo plays itself, scene by scene', group: 'Tell it', glyph: [F(5, 3, 30, 17), R(16, 8, 7, 7), L(6, 23, 28, 2)], needsScenes: true },
  { type: 'keys', name: 'Keys', use: 'Keyboard shortcuts, as keycaps', group: 'Tell it', glyph: [R(4, 6, 8, 7), R(14, 6, 8, 7), L(25, 9, 11, 2), R(4, 16, 8, 7), L(15, 19, 21, 2)] },
  { type: 'timeline', name: 'Timeline', use: 'Releases or milestones in order', group: 'Tell it', glyph: [L(4, 13, 32, 2), R(6, 10, 7, 7), R(17, 10, 7, 7), R(28, 10, 7, 7)] },
  { type: 'stats', name: 'Stats', use: 'Three huge numbers', group: 'Prove it', glyph: [F(5, 6, 8, 12), F(16, 6, 8, 12), F(27, 6, 8, 12), L(5, 21, 30, 2)] },
  { type: 'scores', name: 'Scores', use: 'Rings filled out of a maximum', group: 'Prove it', glyph: [R(4, 7, 14, 14), R(22, 7, 14, 14)] },
  { type: 'checks', name: 'Checks', use: 'Named checks that pass in turn', group: 'Prove it', glyph: [R(4, 5, 10, 8), R(16, 5, 10, 8), R(28, 5, 8, 8), R(4, 16, 10, 8), R(16, 16, 10, 8)] },
  { type: 'compare', name: 'Compare', use: 'Before and after, under a handle', group: 'Prove it', glyph: [F(4, 4, 16, 20), R(20, 4, 16, 20), L(19, 2, 2, 24)] },
  { type: 'diff', name: 'Diff', use: 'One edit, and what each way of saving leaves', group: 'Prove it', glyph: [R(4, 4, 15, 20), R(21, 4, 15, 20), L(6, 9, 10, 2), L(23, 9, 10, 2), L(23, 14, 7, 2)] },
  { type: 'quote', name: 'Quote', use: 'Something a real user said', group: 'Prove it', glyph: [L(5, 6, 4, 5), L(5, 14, 30, 3), L(5, 20, 22, 3)] },
  { type: 'bento', name: 'Bento', use: 'A grid of mixed tiles', group: 'Show it', glyph: [F(4, 4, 18, 12), F(24, 4, 12, 12), F(4, 18, 10, 6), F(16, 18, 20, 6)] },
  { type: 'marquee', name: 'Marquee', use: 'A band of big moving words', group: 'Show it', glyph: [L(0, 10, 13, 8), L(16, 10, 13, 8), L(32, 10, 8, 8)] },
  { type: 'palette', name: 'Palette', use: 'A product’s own colours and typefaces', group: 'Show it', glyph: [F(4, 5, 7, 10), F(13, 5, 7, 10), F(22, 5, 7, 10), R(31, 5, 6, 10), L(4, 20, 33, 2)] },
  { type: 'deck', name: 'Deck', use: 'A hand of cards: templates, themes, presets', group: 'Show it', glyph: [R(4, 6, 12, 17), R(14, 4, 12, 17), F(24, 6, 12, 17)] },
  { type: 'anatomy', name: 'Anatomy', use: 'One screen taken apart, part by part', group: 'Show it', glyph: [F(4, 12, 32, 10), L(8, 5, 2, 6), L(19, 5, 2, 6), L(30, 5, 2, 6)] },
  { type: 'morph', name: 'Morph', use: 'Plain text turning into the product’s UI', group: 'Show it', glyph: [L(4, 6, 12, 2), L(4, 11, 10, 2), L(4, 16, 12, 2), L(18, 13, 4, 2), F(24, 4, 12, 20)] },
  { type: 'specimens', name: 'Specimens', use: 'Every named part, beside an inspector', group: 'Show it', glyph: [L(4, 5, 10, 3), L(4, 11, 14, 3), L(4, 17, 8, 3), R(23, 4, 13, 20)] },
  { type: 'chips', name: 'Chips', use: 'A wall of names as pills', group: 'Show it', glyph: [R(3, 5, 12, 6), R(17, 5, 10, 6), R(29, 5, 8, 6), R(3, 15, 9, 6), R(14, 15, 14, 6)] },
  { type: 'rules', name: 'Rules', use: 'A product’s own rules, as switches', group: 'Let them try', glyph: [R(4, 5, 10, 6), R(4, 15, 10, 6), F(20, 4, 16, 20)] },
  { type: 'compose', name: 'Compose', use: 'Pick parts, watch the text write itself', group: 'Let them try', glyph: [R(4, 5, 11, 5), R(4, 13, 11, 5), F(18, 4, 18, 20)] },
  { type: 'replay', name: 'Replay', use: 'A stretch of time on fast-forward', group: 'Let them try', glyph: [L(4, 6, 10, 2), L(4, 11, 8, 2), L(4, 16, 10, 2), R(17, 8, 7, 7), F(27, 4, 9, 20)] },
  { type: 'prompts', name: 'Prompts', use: 'Suggested asks, and the screen each builds', group: 'Let them try', glyph: [R(4, 4, 32, 7), R(4, 14, 9, 5), R(15, 14, 9, 5), R(26, 14, 10, 5)] },
  { type: 'route', name: 'Route', use: 'Where requests go, and what never leaves', group: 'Let them try', glyph: [R(3, 10, 7, 7), L(10, 13, 6, 2), R(16, 10, 7, 7), L(23, 13, 6, 2), R(29, 10, 7, 7)] },
  { type: 'code', name: 'Code', use: 'A snippet with Copy, and what it makes', group: 'Let them try', glyph: [R(4, 4, 32, 20), L(8, 9, 14, 2), L(10, 13, 16, 2), L(8, 17, 10, 2)] },
  { type: 'specs', name: 'Specs', use: 'Requirements as name and value rows', group: 'Close', glyph: [L(4, 6, 10, 2), L(20, 6, 16, 2), L(4, 13, 10, 2), L(20, 13, 12, 2), L(4, 20, 10, 2), L(20, 20, 14, 2)] },
  { type: 'notes', name: 'Notes', use: 'Small print, honest limits', group: 'Close', glyph: [R(4, 5, 15, 18), R(21, 5, 15, 18)] },
  { type: 'faq', name: 'Questions', use: 'Questions that open and close', group: 'Close', glyph: [L(4, 6, 30, 2), L(4, 12, 30, 2), L(4, 18, 30, 2), L(34, 5, 2, 4)] },
  { type: 'film', name: 'Film', use: 'A poster, then the product’s film', group: 'Close', glyph: [F(4, 4, 32, 20), R(16, 10, 8, 8)] },
  { type: 'get', name: 'Get it', use: 'Install, store buttons or a link; always last', group: 'Close', glyph: [F(0, 7, 40, 14), R(6, 11, 16, 6)] },
];

export const entry = (type: string) => CATALOG.find(e => e.type === type);

/** Sample media: the drawn sample screens, in the product's own frame. */
const S = (n: number, dark = false) => ({ sample: n, dark });

/** Content to start a block from, about Acme Notes, a product that does not exist. */
const SAMPLES: Partial<Record<BlockType, Block>> = {
  stage: { type: 'stage' },
  statement: { type: 'statement', label: 'Why', head: 'Notes pile up. *Acme Notes* puts them where the work is.', body: 'Sample copy for a made-up product. Say the problem in the headline, then what the product does about it, in one paragraph, for the person using it.', points: ['Opens beside the file you are in', 'Keeps one note per branch', 'Writes plain Markdown'] },
  text: { type: 'text', label: 'The story', head: 'Where it started', body: ['A sample paragraph. Use text for the part of a story that needs sentences in a row.', 'Keep each paragraph short, and let the next block carry the picture.'] },
  showcase: { type: 'showcase', label: 'The look', media: [S(0), S(1, true), S(2)], caption: 'Sample screens, in the frame the product’s kind calls for.' },
  screens: { type: 'screens', label: 'Screens', screens: [] },
  features: { type: 'features', label: 'What it does', items: [
    { title: 'A note per branch', body: 'Switching branch switches the note.' },
    { title: 'Beside the code', body: 'It opens in the side panel, never over the file.' },
    { title: 'Plain Markdown', body: 'Notes are files you can read without the plugin.' },
    { title: 'Links that last', body: 'A link to a line follows the line when it moves.' },
    { title: 'Search everything', body: 'One search across every note in the repository.' },
    { title: 'Nothing leaves', body: 'Notes stay on your machine unless you commit them.' },
  ] },
  steps: { type: 'steps', label: 'How it works', steps: [
    { tag: 'Open', title: 'Open a file', body: 'The note for this branch opens beside it.' },
    { tag: 'Write', title: 'Write as you go', body: 'Every change saves on its own, as Markdown.' },
    { tag: 'Ship', title: 'Ship it with the branch', body: 'Commit the note, or keep it to yourself.' },
  ] },
  split: { type: 'split', label: 'Up close', side: 'left', media: S(1), head: 'One note, one branch.', body: 'A split puts one screen beside the words about it. Use a few in a row and alternate the side.', points: ['A sample point', 'Another'] },
  tour: { type: 'tour', label: 'A tour', steps: [
    { title: 'The note', body: 'Each step points at one part of the screen.', media: S(0), focus: { x: 0.3, y: 0.3, zoom: 1.3 } },
    { title: 'The search', body: 'The screen eases in on what the step is about.', media: S(0), focus: { x: 0.7, y: 0.25, zoom: 1.4 } },
    { title: 'The links', body: 'And it steps on by itself.', media: S(0), focus: { x: 0.5, y: 0.7, zoom: 1.3 } },
  ] },
  cases: { type: 'cases', label: 'Use cases', cases: [
    { tab: 'Review', ask: 'Keep notes while I review this pull request.', media: S(0), caption: 'A sample case: what was asked, and the screen that came of it.' },
    { tab: 'Debug', ask: 'Track what I tried on this bug.', media: S(1, true), caption: 'Another case, on its own tab.' },
    { tab: 'Hand off', ask: 'Leave notes for whoever picks this up.', media: S(2), caption: 'A third.' },
  ] },
  keys: { type: 'keys', label: 'Keyboard', note: 'Press one while this block is on screen.', keys: [{ keys: ['⌘', 'J'], does: 'Open the note.' }, { keys: ['⌘', '⇧', 'F'], does: 'Search every note.' }, { keys: ['j', 'k'], does: 'Next and previous note.' }] },
  timeline: { type: 'timeline', label: 'How it got here', events: [
    { when: 'Jan', title: 'First note', body: 'A sample milestone.' },
    { when: 'Mar', title: 'Notes per branch' },
    { when: 'Jun', title: 'Version 1.0', body: 'Another sample milestone.' },
  ] },
  stats: { type: 'stats', stats: [{ value: '3', unit: 's', label: 'to the note you need' }, { value: '0', label: 'servers it talks to' }, { value: '100', unit: '%', label: 'plain Markdown' }] },
  scores: { type: 'scores', label: 'Scores', note: 'Sample scores.', scores: [{ value: 100, max: 100, label: 'Accessibility' }, { value: 98, max: 100, label: 'Performance' }, { value: 4.8, max: 5, label: 'Rating' }] },
  checks: { type: 'checks', label: 'Checked', head: 'Every sample file, opened and saved.', steps: ['open', 'save'], items: [
    { name: 'README.md', pass: true, detail: 'Saved unedited: identical' },
    { name: 'notes.md', pass: true, detail: 'Saved unedited: identical' },
    { name: 'huge.md', pass: false, detail: 'Refused by design: over 5 MB' },
  ], total: { value: '2 of 3', label: 'identical, one refused' } },
  compare: { type: 'compare', label: 'Before and after', before: S(0), after: S(0, true), beforeLabel: 'Light', afterLabel: 'Dark', caption: 'Drag the handle.' },
  diff: { type: 'diff', label: 'What git sees', head: 'One line added. Saved two ways.', file: 'notes.md', edit: 'A line added under the first heading.', before: '# Notes\n\nFirst line.\n', ways: [{ name: 'Acme Notes', after: '# Notes\n\nFirst line.\nA new line.\n', pick: true }, { name: 'The whole file rewritten', after: '# Notes\n\n\nFirst line.\nA new line.\n\n' }] },
  quote: { type: 'quote', text: 'A pull quote sits here. Use only what a real person said, for a real product.', by: 'A sample name', role: 'Sample role' },
  bento: { type: 'bento', label: 'At a glance', tiles: [{ kind: 'number', value: '12', label: 'notes this week' }, { kind: 'text', title: 'Plain files', body: 'Readable without the plugin.' }, { kind: 'media', media: S(1), caption: 'A sample screen' }, { kind: 'number', value: '0', label: 'servers' }] },
  marquee: { type: 'marquee', words: ['Write', 'Find', 'Link', 'Ship'] },
  palette: { type: 'palette', label: 'Its colours', colours: [{ name: 'Ink', hex: '#14161A' }, { name: 'Paper', hex: '#F4F1EA' }, { name: 'Signal', hex: '#FF6B3D' }], faces: [{ name: 'Archivo', sample: 'Notes that stay put' }] },
  deck: { type: 'deck', label: 'Templates', head: 'Three ways to start a note.', cards: [{ title: 'Review', body: 'What changed, what to check', media: S(0) }, { title: 'Bug', body: 'Seen, tried, fixed', media: S(1, true) }, { title: 'Hand-off', body: 'Where it stands', media: S(2) }] },
  chips: { type: 'chips', label: 'Works with', items: ['Markdown', 'Git', 'bb', 'VS Code', 'Any agent'] },
  route: { type: 'route', label: 'Where it goes', head: 'From your editor to your disk, and nowhere else.', stops: [{ name: 'The editor', where: 'Your machine', holds: ['The open note'] }, { name: 'The repository', where: 'Your machine', holds: ['Every note, as a file'] }], never: 'Any server', runs: [{ name: 'Save', hops: [{ from: 1, to: 2, says: 'notes/main.md' }] }] },
  code: { type: 'code', label: 'Set it up', note: 'One line in the config.', title: 'bb.config.json', code: '{\n  "notes": { "folder": "notes" }\n}' },
  specs: { type: 'specs', label: 'Before you install', rows: [{ name: 'bb', value: '0.49 or later' }, { name: 'Disk', value: 'A few KB per note', note: 'Notes are plain files.' }] },
  notes: { type: 'notes', label: 'Good to know', items: [{ title: 'It is a sample', body: 'Acme Notes does not exist. Replace this copy with the real product’s.' }, { title: 'Big files', body: 'Files over 5 MB open read-only.', warn: true }] },
  faq: { type: 'faq', label: 'Questions', items: [{ q: 'Where are my notes kept?', a: 'In a notes folder in the repository, as Markdown.' }, { q: 'Can I turn it off for a repository?', a: 'Yes, in the plugin’s settings.' }] },
  get: { type: 'get', label: 'Get it', note: 'A sample command: the product does not exist.', via: { kind: 'command', command: 'bb plugin install acme-notes' } },
};

/** A block to drop: the sample, or for a block that draws a real product (its rules, its demo), that product's own first one. */
export function sample(type: BlockType): Block {
  const own = SAMPLES[type] ?? products.flatMap(p => p.blocks).find(b => b.type === type);
  return own ? structuredClone(own) : { type: 'custom', name: 'Block', props: {} };
}

/** Whether a block can draw on this product: scenes need the product's own live demo. */
export function fits(e: Entry, product: Pick<Product, 'stage'>) {
  return !e.needsScenes || SCENES[product.stage] !== undefined;
}

export type Meta = Omit<Product, 'blocks'>;

const ACME: Meta = {
  slug: 'acme-notes', brand: '#FF6B3D', name: 'Acme Notes', lines: ['Acme', 'Notes'], kind: 'plugin', year: 2026,
  facts: ['for bb', 'v1.0', 'MIT'], line: 'Notes that live beside your code, one per branch. A made-up product, to arrange a page around.',
  hook: 'Where did that note go?', hint: 'Sample screens: this product does not exist.', stack: ['TypeScript', 'React'],
  stage: 'window', links: [], sample: true,
};

export interface Template { id: string; name: string; use: string; meta: Meta; blocks: Block[] }

const t = (id: string, name: string, use: string, types: BlockType[], meta: Partial<Meta> = {}): Template => ({
  id, name, use, meta: { ...ACME, ...meta }, blocks: types.map(sample),
});

/** Starting points, after DESIGN.md's starting points by kind, plus a few shapes the real pages don't use. */
export const STARTERS: Template[] = [
  t('plugin-full', 'Plugin launch', 'Stage first, then why, what, how and proof; ends on Get it', ['stage', 'statement', 'features', 'split', 'split', 'steps', 'stats', 'screens', 'keys', 'faq', 'get']),
  t('plugin-short', 'Small plugin', 'Three blocks: a small product needs no more', ['statement', 'screens', 'get']),
  t('app', 'Mobile app', 'Phone frames, the look, a timeline of releases', ['stage', 'statement', 'showcase', 'features', 'split', 'stats', 'timeline', 'faq', 'get'], { kind: 'app', stage: 'phone', facts: ['iOS + Android', 'v1.0', 'iOS and Android'], brand: '#7C5CFF' }),
  t('site', 'Website case study', 'A story, the site, before and after, its colours and scores', ['text', 'stage', 'compare', 'palette', 'scores', 'statement', 'get'], { kind: 'site', stage: 'browser', facts: ['Next.js', '2026', 'Any browser'], brand: '#1FB6A6' }),
  t('dev-tool', 'Developer tool', 'Code, keys, requirements and the small print', ['statement', 'code', 'diff', 'keys', 'specs', 'chips', 'notes', 'faq', 'get']),
  t('story', 'Story-led', 'Words first, then the proof, with a breath in the middle', ['text', 'quote', 'timeline', 'marquee', 'showcase', 'stats', 'get'], { brand: '#E7C547' }),
  t('privacy', 'Trust and privacy', 'Where the data goes, what is checked, what to know', ['statement', 'route', 'checks', 'bento', 'notes', 'faq', 'get'], { brand: '#4C9AFF' }),
  t('blank', 'Blank', 'An empty page in the sample product’s colour', []),
];

/** A real product's own page, to remix. */
export function remix(p: Product): Template {
  const { blocks, ...meta } = structuredClone(p);
  return { id: `real:${p.slug}`, name: p.name, use: `${blocks.length} blocks · ${p.kind}`, meta, blocks };
}
