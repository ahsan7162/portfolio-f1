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

/** Screens of Acme Notes, a product that does not exist: drawn and rendered for these samples (public/products-media/acme-notes). */
const A = (name: string, alt: string) => ({ src: `/products-media/acme-notes/${name}.jpg`, alt, width: 1920, height: 1200 });
const PHONE = (name: string, alt: string) => ({ src: `/products-media/acme-notes/${name}.jpg`, alt, width: 600, height: 1240 });
const SHOT = {
  panel: A('panel', 'The Notes panel beside the code: this branch’s notes on the left, a review note open with its checklist'),
  search: A('search', 'Searching every note for “rounding”: four notes across three branches, the matches marked'),
  links: A('links', 'A note’s linked line, opened as a card: src/cart/total.ts at line 42, followed through three edits'),
  branches: A('branches', 'Every branch with its notes: the current one marked, merged ones kept'),
  history: A('history', 'A note’s history: five versions, the picked one diffed against now'),
  light: A('panel-light', 'The Notes panel in the light theme'),
  site: A('site', 'The Acme Notes website: the headline, Install for bb, and the panel beside it'),
};

/** Content to start a block from, about Acme Notes, a product that does not exist: full enough to show the block at its best. */
const SAMPLES: Partial<Record<BlockType, Block>> = {
  stage: { type: 'stage' },
  statement: { type: 'statement', label: 'Why', head: 'Notes pile up in chat and get lost. *Acme Notes* keeps them beside the code they are about.', body: 'A review, a bug hunt, a hand-off: the notes for a piece of work end up in a chat thread, a doc and three sticky notes. Acme Notes keeps one note per branch, in plain Markdown, linked to the lines it talks about, and opens it beside the file you are in.', points: ['One note per branch, switched with the branch', 'Linked lines that follow your edits', 'Plain Markdown files, readable without the plugin', 'Search across every branch at once'] },
  text: { type: 'text', label: 'The story', head: 'It started with a lost review', body: ['A pull request sat for a week because the review notes lived in a chat thread nobody could find. The fix was two lines; finding out what the two lines were took a morning.', 'Acme Notes began as a file in the repository, one per branch, opened with a shortcut. Linked lines came next, so a note could point at code without going stale when the code moved.', 'It stays small on purpose: a note is a Markdown file you can read, diff and commit like anything else.'] },
  showcase: { type: 'showcase', label: 'The look', media: [SHOT.panel, SHOT.links, SHOT.history], caption: 'The panel, a linked line opened as a card, and a note’s history.' },
  screens: { type: 'screens', label: 'Screens', screens: [
    { src: SHOT.panel.src, title: 'The panel', caption: 'This branch’s notes on the left, the open one on the right, with its checklist and code.' },
    { src: SHOT.search.src, title: 'Search', caption: 'Every note on every branch, with the matches marked.' },
    { src: SHOT.links.src, title: 'Linked lines', caption: 'A link to a line opens as a card, and follows the line as you edit.' },
    { src: SHOT.branches.src, title: 'Branches', caption: 'Each branch with its notes; merged branches keep theirs.' },
    { src: SHOT.history.src, title: 'History', caption: 'Every save is a version, diffed like the code.' },
  ] },
  features: { type: 'features', label: 'What it does', items: [
    { title: 'A note per branch', body: 'Switching branch switches the note, so the right one is always open.' },
    { title: 'Beside the code', body: 'It opens in the side panel with ⌘J, never over the file you are in.' },
    { title: 'Plain Markdown', body: 'Notes are files in notes/, readable and diffable without the plugin.' },
    { title: 'Links that last', body: 'A link to a line follows the line through edits, moves and renames.' },
    { title: 'Search everything', body: 'One search across every note on every branch, with the matches marked.' },
    { title: 'Nothing leaves', body: 'Notes stay on your machine unless you commit them with your code.' },
  ] },
  steps: { type: 'steps', label: 'How it works', steps: [
    { tag: 'Open', title: 'Open a file', body: 'Press ⌘J: the note for this branch opens beside it, or a new one starts.' },
    { tag: 'Write', title: 'Write as you go', body: 'Checklists, code, links to lines. It saves on its own, as Markdown.' },
    { tag: 'Link', title: 'Point at the code', body: 'Drop a line into the note; the link follows that line from then on.' },
    { tag: 'Ship', title: 'Ship it, or keep it', body: 'Commit the note with the branch, or keep notes/ out of git.' },
  ] },
  split: { type: 'split', label: 'Up close', side: 'left', media: SHOT.links, head: 'A link to a line that never goes stale.', body: 'Drop a line from the editor into a note and it becomes a link. Edit above it, move it, rename the file: the link follows, and says how many edits it has followed.', points: ['Opens as a card with the code around it', 'Follows edits, moves and renames', 'Says when the line is gone'] },
  tour: { type: 'tour', label: 'A tour', head: 'One panel, four things to know.', steps: [
    { title: 'This branch’s notes', body: 'The list shows the notes for the branch you are on, newest first, with how much of each checklist is done.', media: SHOT.panel, focus: { x: 0.16, y: 0.35, zoom: 1.4 } },
    { title: 'A checklist that saves itself', body: 'Tick a box and the Markdown changes with it: - [ ] becomes - [x], and nothing else in the file moves.', media: SHOT.panel, focus: { x: 0.52, y: 0.5, zoom: 1.45 } },
    { title: 'Code in the note', body: 'A fenced block keeps its highlighting, and a link to a line shows the file and the number.', media: SHOT.panel, focus: { x: 0.62, y: 0.72, zoom: 1.4 } },
    { title: 'Saved, as a file', body: 'The footer says where the note lives and that it is plain Markdown, 41 lines of it.', media: SHOT.panel, focus: { x: 0.5, y: 0.94, zoom: 1.3 } },
  ] },
  cases: { type: 'cases', label: 'Use cases', note: 'Three ways teams use it.', cases: [
    { tab: 'Review', ask: 'Keep my review notes while I go through this pull request.', media: SHOT.panel, caption: 'A checklist per review, ticked as it goes, with the lines it is about linked in.' },
    { tab: 'Debug', ask: 'Where did I see that rounding problem before?', media: SHOT.search, caption: 'Search across every branch finds the earlier note, and the fix it led to.' },
    { tab: 'Hand-off', ask: 'Leave Sam enough to pick this up tomorrow.', media: SHOT.history, caption: 'The note’s history shows what changed since Sam last looked.' },
  ] },
  keys: { type: 'keys', label: 'Keyboard', note: 'Press one while this block is on screen.', keys: [
    { keys: ['⌘', 'J'], does: 'Open this branch’s note beside the code.' },
    { keys: ['⌘', '⇧', 'F'], does: 'Search every note on every branch.' },
    { keys: ['⌘', 'L'], does: 'Link the line under the cursor into the note.' },
    { keys: ['⌘', 'Enter'], does: 'Tick or untick the checklist item.' },
    { keys: ['j', 'k'], does: 'Next and previous note in the list.' },
    { keys: ['⌘', 'Z'], does: 'Undo, as in any file: a note is one.' },
  ] },
  timeline: { type: 'timeline', label: 'How it got here', events: [
    { when: 'Jan', title: 'One file per branch', body: 'notes/<branch>.md, opened with a shortcut.' },
    { when: 'Mar', title: 'Linked lines', body: 'Links that follow the code through edits.' },
    { when: 'Apr', title: 'Search', body: 'Every note on every branch, at once.' },
    { when: 'Jun', title: 'Version 1.0', body: 'History, the light theme, and the hand-off view.' },
    { when: 'Sep', title: 'Phone app', body: 'Read and tick your notes away from the desk.' },
  ] },
  stats: { type: 'stats', stats: [{ value: '3', unit: 's', label: 'to the note you need, by search' }, { value: '0', label: 'servers it talks to' }, { value: '41', label: 'lines in a typical review note' }] },
  scores: { type: 'scores', label: 'Scores', note: 'The website’s Lighthouse scores on a phone, as a sample.', scores: [{ value: 100, max: 100, label: 'Accessibility' }, { value: 98, max: 100, label: 'Performance' }, { value: 100, max: 100, label: 'Best practices' }, { value: 4.8, max: 5, label: 'Rating in bb' }] },
  checks: { type: 'checks', label: 'Checked', head: 'Every note in the test corpus, opened and saved untouched.', note: 'Saving a note without editing it must leave every byte as it was.', steps: ['open', 'save unedited', 'compare'], items: [
    { name: 'review-checklist.md', pass: true, detail: 'Saved unedited: identical', proof: 'a41f2c0 = a41f2c0' },
    { name: 'linked-lines.md', pass: true, detail: 'Saved unedited: identical', proof: '9be0d71 = 9be0d71' },
    { name: 'tables.md', pass: true, detail: 'Saved unedited: identical', proof: '3c58a19 = 3c58a19' },
    { name: 'front-matter.md', pass: true, detail: 'Saved unedited: identical', proof: '77d0e4b = 77d0e4b' },
    { name: 'crlf-endings.md', pass: true, detail: 'Saved unedited: identical', proof: 'e5a1f90 = e5a1f90' },
    { name: 'emoji-and-rtl.md', pass: true, detail: 'Saved unedited: identical', proof: '1d2b6ce = 1d2b6ce' },
    { name: 'huge-log.md', pass: false, detail: 'Refused by design: over 5 MB opens read-only' },
    { name: 'binary.png', pass: false, detail: 'Refused by design: not a text file' },
  ], total: { value: '6 of 8', label: 'identical; 2 refused, as designed' } },
  compare: { type: 'compare', label: 'Light and dark', before: SHOT.light, after: SHOT.panel, beforeLabel: 'Light', afterLabel: 'Dark', caption: 'It follows the editor’s theme. Drag the handle.' },
  diff: { type: 'diff', label: 'What git sees', head: 'One box ticked. Saved two ways.', note: 'A note is a file you commit; a save should change only what you changed.', file: 'notes/feat-checkout-v2.md', edit: 'The fourth checklist item ticked.', before: '# Review: totals that round twice\n\n## Before it merges\n\n- [x] Reproduce with the 8-item fixture\n- [x] Find where the second rounding happens\n- [x] Round once, at the total\n- [ ] Add a test for 7, 8 and 50 items\n- [ ] Ask Sam to check the receipts view\n', ways: [
    { name: 'Acme Notes', after: '# Review: totals that round twice\n\n## Before it merges\n\n- [x] Reproduce with the 8-item fixture\n- [x] Find where the second rounding happens\n- [x] Round once, at the total\n- [x] Add a test for 7, 8 and 50 items\n- [ ] Ask Sam to check the receipts view\n', pick: true },
    { name: 'A whole-file rewrite', after: 'Review: totals that round twice\n================================\n\nBefore it merges\n----------------\n\n* [x] Reproduce with the 8-item fixture\n* [x] Find where the second rounding happens\n* [x] Round once, at the total\n* [x] Add a test for 7, 8 and 50 items\n* [ ] Ask Sam to check the receipts view\n' },
  ] },
  quote: { type: 'quote', text: 'The review notes used to live in a chat thread nobody could find. Now they open with the branch.', by: 'A sample name', role: 'Staff engineer, a sample team' },
  bento: { type: 'bento', label: 'At a glance', tiles: [
    { kind: 'media', media: SHOT.panel, caption: 'The panel, beside the code' },
    { kind: 'number', value: '1', label: 'note per branch' },
    { kind: 'text', title: 'Plain files', body: 'Markdown in notes/, readable without the plugin.' },
    { kind: 'number', value: '0', label: 'servers' },
    { kind: 'media', media: SHOT.search, caption: 'Search across branches' },
    { kind: 'text', title: 'Links that last', body: 'They follow the line through edits.' },
  ] },
  marquee: { type: 'marquee', words: ['Write it down', 'Link the line', 'Switch branch', 'Find it again', 'Hand it off', 'Ship it'] },
  palette: { type: 'palette', label: 'Its colours and type', colours: [{ name: 'Ink', hex: '#0B0B0C' }, { name: 'Panel', hex: '#111113' }, { name: 'Line', hex: '#26262B' }, { name: 'Text', hex: '#ECECEE' }, { name: 'Signal', hex: '#FF6B3D' }, { name: 'Done', hex: '#3ECF8E' }], faces: [{ name: 'SF Pro Text', sample: 'Notes that live beside your code' }, { name: 'SF Mono', sample: 'src/cart/total.ts:42' }] },
  deck: { type: 'deck', label: 'Templates', head: 'Six ways to start a note.', note: 'An empty note offers all six.', cards: [
    { title: 'Review', body: 'What changed, what to check, what to ask', media: SHOT.panel },
    { title: 'Bug hunt', body: 'Seen, tried, ruled out, fixed', media: SHOT.links },
    { title: 'Hand-off', body: 'Where it stands and what is next', media: SHOT.history },
    { title: 'Release', body: 'The checklist before you tag', media: SHOT.branches },
    { title: 'Spike', body: 'What we tried and what broke', media: SHOT.search },
    { title: 'Decision', body: 'The options, the pick, and why', media: SHOT.light },
  ] },
  chips: { type: 'chips', label: 'Works with', note: 'Anything that reads Markdown can read a note.', items: ['bb', 'Git', 'Markdown', 'VS Code', 'JetBrains', 'GitHub', 'GitLab', 'Any agent', 'macOS', 'Windows', 'Linux', 'iOS', 'Android'] },
  prompts: { type: 'prompts', label: 'Ask it', head: 'Ask for a note, get the screen.', note: 'Sample asks and replies.', prompts: [
    { chip: 'Find it', ask: 'Where did I write about rounding?', reply: 'Four notes on three branches. The newest is your review of totals that round twice.', media: SHOT.search },
    { chip: 'Where is it', ask: 'Show me the line my review points at.', reply: 'src/cart/total.ts, line 42: the return that rounds the sum. It has moved three times since you linked it.', media: SHOT.links },
    { chip: 'What changed', ask: 'What changed in this note since Sam looked?', reply: 'Three boxes ticked and a paragraph added, 40 minutes ago.', media: SHOT.history },
    { chip: 'Which branch', ask: 'Which branches have notes?', reply: 'Five of six. feat/checkout-v2 has the most: three.', media: SHOT.branches },
  ] },
  specimens: { type: 'specimens', label: 'Every command', head: 'Point at a command. Pick one to keep it.', note: 'Every command Acme Notes adds, in its three groups.', groups: [
    { name: 'Notes', items: [
      { name: 'Open note', line: 'Opens this branch’s note beside the code, or starts one.', sig: '⌘J', code: 'acme.notes.open', media: SHOT.panel },
      { name: 'New note', line: 'Starts a note from one of six templates.', sig: '⌘⇧N', code: 'acme.notes.new' },
      { name: 'History', line: 'Every save of this note, diffed against now.', sig: '⌘Y', code: 'acme.notes.history', media: SHOT.history },
    ] },
    { name: 'Links', items: [
      { name: 'Link line', line: 'Links the line under the cursor into the note.', sig: '⌘L', code: 'acme.links.add', media: SHOT.links },
      { name: 'Open link', line: 'Jumps to the linked line, wherever it went.', sig: '⌘⇧L', code: 'acme.links.open' },
    ] },
    { name: 'Find', items: [
      { name: 'Search notes', line: 'Every note on every branch, with the matches marked.', sig: '⌘⇧F', code: 'acme.find.search', media: SHOT.search },
      { name: 'Branches', line: 'Each branch with its notes.', sig: '⌘⇧B', code: 'acme.find.branches', media: SHOT.branches },
    ] },
  ], also: { note: 'Builds on', names: ['bb’s side panel', 'Git', 'Markdown'] } },
  route: { type: 'route', label: 'Where it goes', head: 'From your editor to your disk, and only where you push.', note: 'Nothing goes to a server of ours: there is none.', stops: [
    { name: 'The editor', where: 'Your machine', holds: ['The open note', 'The line you linked'] },
    { name: 'The repository', where: 'Your machine', holds: ['Every note, as a Markdown file'] },
    { name: 'Your remote', where: 'Where you push', holds: ['Only the notes you commit'] },
    { name: 'The phone app', where: 'Your phone', holds: ['Notes it reads from your remote'] },
  ], never: 'Any server of ours', runs: [
    { name: 'Save', hops: [{ from: 0, to: 1, says: 'notes/feat-checkout-v2.md, as plain Markdown' }] },
    { name: 'Push', hops: [{ from: 1, to: 2, says: 'With your code, when you commit the note' }] },
    { name: 'Read on the go', hops: [{ from: 2, to: 3, says: 'Read-only, through your own Git host' }] },
  ] },
  code: { type: 'code', label: 'Set it up', note: 'One block in bb’s config, all optional.', title: 'bb.config.json', code: '{\n  "acme.notes": {\n    "folder": "notes",\n    "commit": false,\n    "templates": ["review", "bug-hunt", "hand-off"],\n    "linkedLines": true\n  }\n}', result: SHOT.panel, caption: 'What it opens' },
  specs: { type: 'specs', label: 'Before you install', rows: [
    { name: 'bb', value: '0.49 or later', note: 'Plugin SDK 0.6 or later.' },
    { name: 'Git', value: 'Any version', note: 'Notes follow the branch Git reports.' },
    { name: 'Disk', value: 'A few KB per note', note: 'Notes are plain Markdown files.' },
    { name: 'Network', value: 'None', note: 'It never makes a request.' },
    { name: 'Phone app', value: 'iOS 17, Android 12', note: 'Reads notes through your Git host.' },
    { name: 'Licence', value: 'MIT' },
  ] },
  notes: { type: 'notes', label: 'Good to know', items: [
    { title: 'It is a sample', body: 'Acme Notes does not exist. These screens and words show what each block looks like when it is full.' },
    { title: 'Big files open read-only', body: 'A note over 5 MB opens for reading, so the editor stays quick.', warn: true },
    { title: 'Notes are not committed by default', body: 'notes/ is in .gitignore until you take it out.' },
    { title: 'Linked lines need Git', body: 'Outside a repository, links point at a file and a number, and do not follow edits.' },
  ] },
  faq: { type: 'faq', label: 'Questions', show: 4, items: [
    { q: 'Where are my notes kept?', a: 'In a notes folder at the root of the repository, one Markdown file per branch.' },
    { q: 'Do my notes leave my machine?', a: 'Only if you commit and push them. The plugin itself makes no requests.' },
    { q: 'What happens to a note when a branch is merged?', a: 'It stays, under the branch’s name, and shows as merged in the branches list.' },
    { q: 'Can two people write in one note?', a: 'Yes, through Git: commit the note and it merges like any text file.' },
    { q: 'Does a linked line survive a rename?', a: 'Yes. It follows the file through renames Git can see.' },
    { q: 'Can I turn it off for one repository?', a: 'Yes, in the plugin’s settings, or with "acme.notes": false in bb.config.json.' },
  ] },
  film: { type: 'film', label: 'Film', src: '/products-media/acme-notes/film.mp4', poster: '/products-media/acme-notes/poster.jpg', duration: '0:13', title: 'A 13-second tour with sample data' },
  get: { type: 'get', label: 'Get it', note: 'A sample command: the product does not exist.', via: { kind: 'command', command: 'bb plugin install acme-notes' } },
};

/** A block to drop: the sample, or for a block that draws a real product (its rules, its demo), that product's own first one. */
export function sample(type: BlockType): Block {
  return structuredClone(sampleSource(type).block);
}

/** Where a block's starting content comes from: the sample about Acme Notes, or the first real product that uses it. */
export function sampleSource(type: BlockType): { block: Block; from?: Product } {
  const own = SAMPLES[type];
  if (own) return { block: own };
  const from = products.find(p => p.blocks.some(b => b.type === type));
  const block = from?.blocks.find(b => b.type === type);
  return block && from ? { block, from } : { block: { type: 'custom', name: 'Block', props: {} } };
}

/** Whether a block can draw on this product: scenes need the product's own live demo. */
export function fits(e: Entry, product: Pick<Product, 'stage'>) {
  return !e.needsScenes || SCENES[product.stage] !== undefined;
}

export type Meta = Omit<Product, 'blocks'>;

/** The made-up product the samples are about. */
export const ACME: Meta = {
  slug: 'acme-notes', brand: '#FF6B3D', name: 'Acme Notes', lines: ['Acme', 'Notes'], kind: 'plugin', year: 2026,
  facts: ['for bb', 'v1.0', 'MIT'], line: 'Notes that live beside your code, one per branch. A made-up product, to arrange a page around.',
  hook: 'Where did that note go?', hint: 'Sample screens: this product does not exist.', stack: ['TypeScript', 'React'],
  stage: 'window', links: [], sample: true,
  shots: [SHOT.panel], thumb: '/products-media/acme-notes/thumb.jpg',
};

export interface Template { id: string; name: string; use: string; meta: Meta; blocks: Block[] }

const t = (id: string, name: string, use: string, types: BlockType[], meta: Partial<Meta> = {}): Template => ({
  id, name, use, meta: { ...ACME, ...meta }, blocks: types.map(sample),
});

/** Starting points, after DESIGN.md's starting points by kind, plus a few shapes the real pages don't use. */
export const STARTERS: Template[] = [
  t('plugin-full', 'Plugin launch', 'Stage first, then why, what, how and proof; ends on Get it', ['stage', 'statement', 'features', 'split', 'split', 'steps', 'stats', 'screens', 'keys', 'faq', 'get']),
  t('plugin-short', 'Small plugin', 'Three blocks: a small product needs no more', ['statement', 'screens', 'get']),
  t('app', 'Mobile app', 'Phone frames, the look, a timeline of releases', ['stage', 'statement', 'showcase', 'features', 'split', 'stats', 'timeline', 'faq', 'get'], { kind: 'app', stage: 'phone', facts: ['iOS + Android', 'v1.0', 'iOS and Android'], shots: [PHONE('phone-list', 'The phone app’s notes list, grouped by branch'), PHONE('phone-note', 'A note open on the phone, with its checklist')] }),
  t('site', 'Website case study', 'A story, the site, before and after, its colours and scores', ['text', 'stage', 'compare', 'palette', 'scores', 'statement', 'get'], { kind: 'site', stage: 'browser', facts: ['Next.js', '2026', 'Any browser'], shots: [SHOT.site, PHONE('site-phone', 'The Acme Notes website on a phone')] }),
  t('dev-tool', 'Developer tool', 'Code, keys, requirements and the small print', ['statement', 'code', 'diff', 'keys', 'specs', 'chips', 'notes', 'faq', 'get']),
  t('story', 'Story-led', 'Words first, then the proof, with a breath in the middle', ['text', 'quote', 'timeline', 'marquee', 'showcase', 'stats', 'get']),
  t('privacy', 'Trust and privacy', 'Where the data goes, what is checked, what to know', ['statement', 'route', 'checks', 'bento', 'notes', 'faq', 'get']),
  t('blank', 'Blank', 'An empty page in the sample product’s colour', []),
];

/** A real product's own page, to remix. */
export function remix(p: Product): Template {
  const { blocks, ...meta } = structuredClone(p);
  return { id: `real:${p.slug}`, name: p.name, use: `${blocks.length} blocks · ${p.kind}`, meta, blocks };
}
