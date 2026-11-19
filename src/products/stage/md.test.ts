import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linesChanged } from '../lineDiff';
import { addRow, change, fileOf, find, insert, parse, read, setCell, toggleTask, write, type MdBlock } from './md';
import { CATALOG } from './mdCatalog';
import { DOCUMENT_TEMPLATES, fillTemplate } from './mdTemplates';
import { MW_DEMO } from './mwData.gen';

const demo = MW_DEMO.committed;
const tasks = (b: MdBlock) => b.t === 'list' && b.items.some((i) => i.done !== undefined);

void test('an untouched document is its file, byte for byte', () => {
  assert.equal(fileOf(parse(demo)), demo);
});

void test('the demo document is written in the serializer style, so its one-line edits are honest', () => {
  for (const p of parse(demo).parts) assert.equal(write(p.b), p.src, `not canonical: ${p.src}`);
});

void test('an edit rewrites only the block it touches', () => {
  const d = parse(demo);
  const list = find(d, tasks)!;
  const next = toggleTask(d, list.id, 2);
  next.parts.forEach((p, i) => { if (p.id !== list.id) assert.equal(p.src, d.parts[i].src); });
  assert.equal(linesChanged(demo, fileOf(next)), 1);
  assert.match(fileOf(next), /- \[x\] Load test with 10k concurrent devices/);
});

void test('a block not in the serializer style changes whole when edited', () => {
  const d = parse('* [ ] one\n* [ ] two\n');
  assert.equal(linesChanged(fileOf(d), fileOf(toggleTask(d, 0, 0))), 2);
});

void test('tables re-pad to their widest cell', () => {
  const d = parse(demo);
  const t = find(d, (b) => b.t === 'table')!;
  // "Not started" stays in its column, so the width holds and one row changes
  assert.equal(linesChanged(demo, fileOf(setCell(d, t.id, 1, 2, 'On track'))), 1);
  // the widest status goes, the column narrows, and every row of the table is rewritten
  assert.equal(linesChanged(demo, fileOf(setCell(d, t.id, 2, 2, 'On track'))), 5);
  assert.equal(linesChanged(demo, fileOf(addRow(d, t.id, ['Mobile release', 'Lin Okafor', 'On track', 'Mar 10']))), 1);
});

void test('inserted blocks add their own lines and one blank line', () => {
  const d = parse(demo);
  const para = find(d, (b) => b.t === 'p')!;
  const next = insert(d, para.id, [{ t: 'quote', callout: 'WARNING', text: 'Do not enable sync for enterprise workspaces until the audit log ships.' }]);
  assert.equal(linesChanged(demo, fileOf(next)), 3);
  assert.match(fileOf(next), /\n> \[!WARNING\]\n> Do not enable sync/);
});

void test('reading and writing agree on every block kind', () => {
  const blocks: MdBlock[] = [
    { t: 'h', level: 3, text: 'Title' },
    { t: 'p', text: 'Some **bold** and a [link](https://example.com).' },
    { t: 'quote', text: 'Plain quote' },
    { t: 'quote', callout: 'TIP', text: '' },
    { t: 'list', ordered: true, items: [{ text: 'one' }, { text: '' }] },
    { t: 'list', ordered: false, items: [{ text: '' }] },
    { t: 'code', lang: 'mermaid', code: 'flowchart LR\n  A --> B' },
    { t: 'hr' },
  ];
  for (const b of blocks) assert.deepEqual(read(write(b)), b);
  assert.equal(change(parse('x\n'), 0, () => ({ t: 'hr' })).parts[0].src, '---');
});

void test('the demo writes exactly what the plugin writes for the same edits', () => {
  const d = parse(demo);
  const list = find(d, tasks)!;
  const para = find(d, (b) => b.t === 'p')!;
  assert.equal(fileOf(toggleTask(d, list.id, 2)), MW_DEMO.edits.tick);
  assert.equal(fileOf(insert(d, para.id, [{ t: 'quote', callout: 'WARNING', text: 'Do not enable sync for enterprise workspaces until the audit log ships.' }])), MW_DEMO.edits.callout);
  const flow = CATALOG.find((e) => e.id === 'mermaid-flowchart')!.make!();
  assert.equal(fileOf(insert(d, null, flow)), MW_DEMO.edits.flowchart);
  // The plugin adds a blank line above an edited table (a known bug), so the demo leaves cell edits to the agent until it is fixed.
  assert.equal(linesChanged(demo, MW_DEMO.edits.status), 2);
});

void test('the / menu holds the plugin\'s 39 entries', () => {
  assert.equal(CATALOG.length, 39);
});

void test('every template reads into blocks with nothing left as raw syntax', () => {
  for (const tpl of DOCUMENT_TEMPLATES) {
    for (const p of parse(fillTemplate(tpl.markdown)).parts) {
      if (p.b.t === 'p') assert.doesNotMatch(p.b.text, /^(#|>|\||```|- |\d+\.)/, `${tpl.id}: ${p.src}`);
    }
  }
});
