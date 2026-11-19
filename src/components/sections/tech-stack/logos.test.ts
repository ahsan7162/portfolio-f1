import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as icons from 'simple-icons';
import { LOGOS } from './logos';

void test('every marquee logo is a simple-icons icon, under its own title', () => {
  const titles = new Map(Object.values(icons).map(i => [i.slug, i.title]));
  for (const l of LOGOS) assert.equal(titles.get(l.slug), l.title, l.slug);
});
