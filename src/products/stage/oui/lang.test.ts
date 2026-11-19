import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OUI_CLEAN, OUI_PARITY } from './check.gen';
import { check, isEl, isPending, resolve, statements, type El } from './lang';
import { ALL_PROGRAMS, DECISION } from './programs';

void test('check() words every problem as the plugin’s check_openui does', () => {
  for (const { program, problems } of OUI_PARITY) assert.equal(check(program), problems, program);
});

void test('every program on the page renders cleanly, in the plugin and here', () => {
  for (const [name, program] of Object.entries(ALL_PROGRAMS)) {
    assert.equal(OUI_CLEAN[name], '', `${name}: the plugin's check_openui found a problem`);
    assert.equal(check(program), '', name);
  }
});

void test('a streaming program shows whole statements only, and names not yet written are pending', () => {
  const src = DECISION.program;
  const cut = src.indexOf('redis = ') + 20; // part way into the third option
  assert.deepEqual(statements(src.slice(0, cut)).map((s) => s.id), ['root', 'd', 'pg']);
  const root = resolve(src.slice(0, cut)) as El;
  const d = (root.props.children as El[])[0];
  const options = d.props.options as unknown[];
  assert.ok(isEl(options[0]) && options[0].props.name === 'Postgres queue');
  assert.ok(isPending(options[1]) && isPending(options[2]));
  assert.ok(isPending(resolve('root = Stack([d')));
});

void test('arguments are named in the order the component declares them', () => {
  const root = resolve('root = Stack([g])\ng = Gauge(64, 0, 100, "CPU", "warn", "%")') as El;
  const g = (root.props.children as El[])[0];
  assert.deepEqual(g.props, { value: 64, min: 0, max: 100, label: 'CPU', tone: 'warn', unit: '%' });
});

void test('strings keep their escapes, objects take bare keys', () => {
  const root = resolve('root = Stack([x])\nx = KeyValue({Branch: "fix/\\"a\\"", "Two words": "line\\nbreak"})') as El;
  const x = (root.props.children as El[])[0];
  assert.deepEqual(x.props.pairs, { Branch: 'fix/"a"', 'Two words': 'line\nbreak' });
});
