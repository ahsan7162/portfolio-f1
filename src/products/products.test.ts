import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandVars } from './brand';
import { products } from './data';
import { parseRoute } from './router';

void test('routes: /products is the main page, /products/<slug> a product', () => {
  assert.deepEqual(parseRoute('/products'), { page: 'home' });
  assert.deepEqual(parseRoute('/products/'), { page: 'home' });
  assert.deepEqual(parseRoute('/products/pr-dashboard'), { page: 'detail', slug: 'pr-dashboard' });
  assert.deepEqual(parseRoute('/products/pr-dashboard/'), { page: 'detail', slug: 'pr-dashboard' });
});

void test('every product can be listed, routed to and shown', () => {
  assert.equal(new Set(products.map(p => p.slug)).size, products.length, 'slugs are unique');
  for (const p of products) {
    assert.match(p.slug, /^[a-z0-9-]+$/, `${p.name}: slug is URL-safe`);
    assert.match(p.brand, /^#[0-9a-f]{6}$/i, `${p.name}: brand is a 6-digit hex colour`);
    assert.equal(p.lines.join(' '), p.name, `${p.name}: lines spell the name`);
    assert.equal(new Set(p.lines).size, p.lines.length, `${p.name}: lines are distinct`);
  }
  assert.ok(products.some(p => p.featured), 'something leads the main page');
});

void test('text on a product colour stays readable: dark on light colours, light on dark', () => {
  assert.equal(brandVars('#3DDC84')['--on-brand' as never], 'var(--black)');
  assert.equal(brandVars('#1B2A6B')['--on-brand' as never], 'var(--bone)');
});

void test('search titles and descriptions fit, differ, and a product’s keywords are in its own copy', async () => {
  const { allMeta, productMeta } = await import('./seo');
  const indexed = allMeta(products).filter(m => !m.noindex);
  for (const m of indexed) {
    assert.ok(m.title.length <= 60, `${m.path}: title is ${m.title.length} characters`);
    assert.ok(m.description.length >= 70 && m.description.length <= 160, `${m.path}: description is ${m.description.length} characters`);
  }
  assert.equal(new Set(indexed.map(m => m.title)).size, indexed.length, 'titles are unique');
  assert.equal(new Set(indexed.map(m => m.description)).size, indexed.length, 'descriptions are unique');
  for (const p of products) {
    assert.equal(productMeta(p).noindex, !!p.sample, `${p.slug}: only samples are kept out of search`);
    const copy = JSON.stringify([p.name, p.line, p.hook, p.stack, p.blocks, p.seo?.title, p.seo?.description]).toLowerCase();
    for (const k of p.seo?.keywords ?? []) assert.ok(copy.includes(k.toLowerCase()), `${p.slug}: "${k}" is not in the page's copy`);
  }
});

void test('every screenshot has its half-width copy beside it', async () => {
  const { existsSync } = await import('node:fs');
  const { srcSet } = await import('./paths');
  // Screenshots are the `src` of a picture or a gallery screen; a film's `src` is a video and has no copy.
  const shots = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'src' && typeof x === 'string' && x.endsWith('.jpg')) shots.add(x); else walk(x); }
  };
  walk(products.map(p => [p.shots, p.blocks]));
  assert.ok(shots.size > 0);
  for (const src of shots) {
    const small = srcSet(src)?.split(' ')[0];
    assert.ok(small && existsSync(`public${small}`), `${src}: make ${small} (ffmpeg -i in.jpg -vf scale=960:-2 -q:v 4 out-960.jpg)`);
  }
});
