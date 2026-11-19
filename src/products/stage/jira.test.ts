import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ageOf, assign, assignable, BOARDS, childrenOf, counts, escape, fresh, goalsMet, groupsOf, ISSUES, listOf, ME, mine, moveLabel, movesOf,
  openTicket, orderOf, positionOf, setGroup, setQuery, statusOptions, step, tally, ticketOf, transition, typedKey, up,
} from './jira';
import { ROW_AGE, ROW_TICKET } from './jiraRowData';

const keys = (n: number, s = fresh()) => Array.from({ length: n }).reduce<typeof s>((x) => step(x, 1), s);

void test('My Tickets: 12 open and 6 done, all assigned to Jane, newest update first', () => {
  const s = fresh();
  assert.deepEqual(counts(s), { open: 12, done: 6 });
  for (const t of [...mine(s, 'open'), ...mine(s, 'done')]) assert.equal(ISSUES[t.key].assignee, ME);
  const ages = listOf(s).map((t) => ISSUES[t.key].updated);
  assert.deepEqual(ages, [...ages].sort((a, b) => a - b));
});

void test('the status chips match the real screenshots: In Progress 4, To Do 4, In Review 3, then Blocked 1 in the menu', () => {
  assert.deepEqual(statusOptions(fresh()).map((o) => `${o.id} ${o.count}`), ['In Progress 4', 'To Do 4', 'In Review 3', 'Blocked 1']);
});

void test('grouped by status in workflow order, the subtask under its story', () => {
  assert.deepEqual(groupsOf(fresh()).map((g) => g.id), ['status:In Progress', 'status:In Review', 'status:Blocked', 'status:To Do']);
  assert.deepEqual(orderOf(fresh()), ['ACME-124', 'ACME-142', 'ACME-147', 'ACME-207', 'ACME-121', 'ACME-125', 'ACME-149', 'ACME-115', 'ACME-128', 'ACME-203', 'ACME-112', 'ACME-151']);
});

void test('by initiative: epics inside their initiative, tickets with neither last', () => {
  const g = groupsOf(setGroup(fresh(), 'hierarchy:initiative'));
  assert.deepEqual(g.map((x) => x.id), ['initiative:ACME-10', 'initiative:ACME-11', 'epic:']);
  assert.deepEqual(g[0].groups?.map((x) => x.id), ['initiative:ACME-10/epic:ACME-100', 'initiative:ACME-10/epic:ACME-102']);
});

void test('by board: a ticket no board lists inherits its parent’s board, marked via', () => {
  const g = groupsOf(setGroup(fresh(), 'board'));
  const row = (board: string, key: string) => g.find((x) => x.id === board)?.rows?.find((r) => r.ticket.key === key);
  assert.equal(row('board:7', 'ACME-125')?.via, true);
  assert.equal(row('board:7', 'ACME-125')?.parent?.key, 'ACME-121');
  assert.equal(row('board:9', 'ACME-149')?.parent?.key, 'ACME-101');
  // every open ticket lands on a board, directly or through a parent
  assert.equal(g.some((x) => x.id === 'board:none'), false);
  assert.ok(BOARDS.every((b) => b.keys.every((k) => ISSUES[k])));
});

void test('J J J, Enter, ] ], U U: the walk scene 2 plays', () => {
  let s = keys(3);
  assert.equal(s.cursor, 'ACME-147');
  s = openTicket(s, 'ACME-147');
  s = step(step(s, 1), 1);
  assert.equal(s.open, 'ACME-121');
  assert.deepEqual(positionOf(s), { index: 4, total: 12 });
  s = up(s);
  assert.equal(s.open, 'ACME-100');
  assert.equal(positionOf(s), null); // the epic isn't yours, so "x of 12" goes
  assert.equal(up(s).open, 'ACME-10');
  assert.equal(up(up(s)).open, 'ACME-10'); // the top: U does nothing
});

void test('only the moves the workflow allows', () => {
  const s = openTicket(fresh(), 'ACME-121');
  assert.deepEqual(movesOf(s, 'ACME-121').map(moveLabel), ['Done', 'Changes needed → In Progress', 'Blocked']);
  assert.equal(transition(s, 'ACME-128', 'Done'), s); // To Do can't jump to Done
  const done = transition(s, 'ACME-121', 'Done');
  assert.deepEqual(counts(done), { open: 11, done: 7 });
  assert.equal(done.open, 'ACME-121'); // the pane stays on it
  assert.equal(positionOf(done), null);
});

void test('assigning a ticket to someone else takes it out of My Tickets; giving one to yourself brings it in', () => {
  const s = openTicket(fresh(), 'ACME-147');
  const away = assign(s, 'ACME-147', 'alex-2');
  assert.equal(tally(away), 11);
  assert.equal(listOf(away).some((t) => t.key === 'ACME-147'), false);
  assert.equal(tally(assign(s, 'ACME-147', null)), 11);
  assert.equal(tally(assign(fresh(), 'ACME-160', ME)), 13);
  assert.equal(assign(s, 'ACME-147', 'nobody'), s);
});

void test('two Alex Kims, told apart by email', () => {
  const alexes = assignable('alex');
  assert.deepEqual(alexes.map((p) => p.name), ['Alex Kim', 'Alex Kim', 'Alexandra Ruiz']);
  assert.notEqual(alexes[0].email, alexes[1].email);
  assert.notEqual(alexes[0].accountId, alexes[1].accountId);
});

void test('a key that isn’t in the list is offered, and opening it is a goal', () => {
  const s = setQuery(fresh(), 'acme-160');
  assert.equal(typedKey(s), 'ACME-160');
  assert.equal(typedKey(setQuery(fresh(), 'ACME-124')), null);
  assert.deepEqual(goalsMet(s, openTicket(s, 'ACME-160')), ['search']);
});

void test('the goals of Your turn', () => {
  const review = openTicket(fresh(), 'ACME-121');
  assert.deepEqual(goalsMet(fresh(), review), ['review']);
  assert.deepEqual(goalsMet(review, up(review)), ['epic']);
  assert.deepEqual(goalsMet(review, transition(review, 'ACME-121', 'Done')), ['done']);
});

void test('Esc: the menu, then the ticket, then the search', () => {
  const s = { ...openTicket(setQuery(fresh(), 'promo'), 'ACME-124'), menu: 'move' as const, menuFor: 'ACME-124' };
  assert.equal(escape(s).menu, null);
  assert.equal(escape(escape(s)).open, null);
  assert.equal(escape(escape(escape(s))).query, '');
});

void test('ages read as the plugin writes them', () => {
  assert.deepEqual([35, 4 * 60, 24 * 60, 6 * 1440, 36 * 1440, 80 * 1440].map(ageOf), ['35m', '4h', '24h', '6d', '36d', 'Aug 31']);
  assert.equal(ageOf(19 * 30 * 1440), 'Apr 2025');
});

void test('the anatomy row is ACME-124 as the site has it', () => {
  assert.deepEqual(ROW_TICKET, ticketOf(ISSUES, 'ACME-124'));
  assert.equal(ISSUES['ACME-124'].updated, ROW_AGE);
});

void test('every parent exists, and children are listed for the ticket view', () => {
  for (const i of Object.values(ISSUES)) if (i.parent) assert.ok(ISSUES[i.parent], `${i.key} has a missing parent`);
  assert.deepEqual(childrenOf(ISSUES, 'ACME-121').map((t) => t.key), ['ACME-125', 'ACME-126']);
  assert.equal(ticketOf(ISSUES, 'ACME-125').initiative?.key, 'ACME-10');
});
