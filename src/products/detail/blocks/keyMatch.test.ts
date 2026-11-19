import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keysMatch, type Press } from './keyMatch';

const press = (key: string, mods: Partial<Press> = {}): Press => ({ key, meta: false, ctrl: false, shift: false, alt: false, ...mods });

void test('plain caps are alternatives', () => {
  assert.ok(keysMatch(['j', 'k'], press('j')));
  assert.ok(keysMatch(['j', 'k'], press('K')));
  assert.ok(!keysMatch(['j', 'k'], press('n')));
});

void test('modifiers are held with the rest, and ⌘ is Ctrl off a Mac', () => {
  assert.ok(keysMatch(['⌘', 'B'], press('b', { meta: true })));
  assert.ok(keysMatch(['⌘', 'B'], press('b', { ctrl: true })));
  assert.ok(!keysMatch(['⌘', 'B'], press('b')));
  assert.ok(keysMatch(['⌘', '⇧', 'X'], press('X', { meta: true, shift: true })));
  assert.ok(!keysMatch(['⌘', '⇧', 'X'], press('x', { meta: true })));
});

void test('a row without a modifier does not light while one is held', () => {
  assert.ok(!keysMatch(['Enter'], press('Enter', { meta: true })));
  assert.ok(keysMatch(['Tab'], press('Tab')));
});

void test('a range cap takes any digit in it', () => {
  assert.ok(keysMatch(['⌘', '⌥', '1–6'], press('3', { meta: true, alt: true })));
  assert.ok(!keysMatch(['⌘', '⌥', '1–6'], press('7', { meta: true, alt: true })));
});

void test('a held ⌥ that changes the character still matches by the physical key', () => {
  assert.ok(keysMatch(['⌘', '⌥', '1–6'], press('¡', { code: 'Digit1', meta: true, alt: true })));
  assert.ok(keysMatch(['⌘', '\\'], press('«', { code: 'Backslash', meta: true })));
});
