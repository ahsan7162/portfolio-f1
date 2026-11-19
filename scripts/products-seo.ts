// Gives every products URL its own HTML file after the build: its own title, description, canonical,
// link-preview tags and structured data, and its words as plain HTML inside #root. A crawler that
// runs no JavaScript reads the page from that; in a browser the app replaces it as soon as it starts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { products } from '../src/products/data';
import { HOME, productPath } from '../src/products/paths';
import { homeMeta, productMeta, type PageMeta } from '../src/products/seo';
import { KINDS, type Product } from '../src/products/types';

const ME = 'Muhammad Ahsan';
const real = products.filter(p => !p.sample);

const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** `<` escaped, so no string in the data can close the script tag. */
const ld = (graph: object[]) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;

/** Fields that are settings or file paths, not words to read. */
const NOT_COPY = new Set(['type', 'label', 'side', 'src', 'poster', 'hex', 'sample', 'dark', 'warn', 'max', 'kind', 'live', 'focus', 'before', 'after', 'file', 'proof', 'pass', 'pick', 'source', 'sig', 'set', 'surfaces', 'outputs', 'options', 'now', 'start']);
/** Fields that are settings in one block type and copy in another, by the types they are settings in: a route's
    `from` and `to` are stop numbers, a morph's are its two sides in words; compose's `parts` and replay's `runs` are a
    drawing's name and worked-out data, anatomy's and route's are copy; a replay setting's `line` is config, a specimen's
    is what it does; the ids of Your turn's goals and of anatomy's parts tie them to code, a replay setting's is its name. */
const NOT_COPY_IN: Partial<Record<string, string[]>> = { scenes: ['id'], anatomy: ['id'], route: ['from', 'to'], compose: ['parts'], replay: ['runs', 'line'] };
/** The words in a value, in order: a block's copy without knowing the block. `*accents*` lose their marks. */
function words(value: unknown, skip = NOT_COPY): string {
  if (Array.isArray(value)) return value.map(v => words(v, skip)).filter(Boolean).join(' · ');
  if (value && typeof value === 'object') return Object.entries(value).filter(([k]) => !skip.has(k)).map(([, v]) => words(v, skip)).filter(Boolean).join(' · ');
  // a morph line's `{key}` ties it to a part of the screen; it is not copy
  return typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\*/g, '').replace(/^\{[\w-]+\}/, '') : '';
}

/** A block as plain HTML: its label as a heading, then each field as a paragraph or a list. Works for any block type. */
function blockHtml(block: object) {
  const out: string[] = [];
  const skip = new Set([...NOT_COPY, ...(NOT_COPY_IN['type' in block ? String(block.type) : ''] ?? [])]);
  if ('label' in block && block.label) out.push(`<h2>${esc(block.label)}</h2>`);
  for (const [key, value] of Object.entries(block)) {
    if (skip.has(key)) continue;
    if (Array.isArray(value)) out.push(`<ul>${value.map(v => `<li>${esc(words(v, skip))}</li>`).join('')}</ul>`);
    else if (key === 'head') out.push(`<h3>${esc(words(value, skip))}</h3>`);
    else if (words(value, skip)) out.push(`<p>${esc(words(value, skip))}</p>`);
  }
  return out.join('');
}

/** What is in #root before the app starts: the page-change curtain the app opens under, then the page's words. */
function body(curtain: string, brand: string | undefined, main: string) {
  const tint = brand ? ` data-branded style="--brand:${esc(brand)}"` : '';
  return `<div class="pp-curtain" aria-hidden="true"${tint}><span class="pp-display">${esc(curtain)}</span></div><main>${main}</main>`;
}

const homeBody = () => body('Products', undefined, [
  `<h1>Products by ${ME}</h1>`,
  `<p>${esc(homeMeta.description)}</p>`,
  `<ul>${real.map(p => `<li><a href="${productPath(p.slug)}">${esc(p.name)}</a>: ${esc(KINDS[p.kind].label)}, ${p.year}. ${esc(p.line)}</li>`).join('')}</ul>`,
  `<p><a href="/">Portfolio of ${ME}, full stack and AI developer</a></p>`,
].join(''));

const productBody = (p: Product) => body(p.name, p.brand, [
  `<p><a href="${HOME}">All products by ${ME}</a></p>`,
  `<h1>${esc(p.name)}</h1>`,
  `<p>${esc(p.line)}</p>`,
  `<p>${esc(p.hook)}</p>`,
  `<p>${esc([KINDS[p.kind].label, ...p.facts, p.year].join(' · '))}. Built with ${esc(p.stack.join(', '))}.</p>`,
  p.links.length ? `<ul>${p.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>` : '',
  ...p.blocks.map(blockHtml),
].join(''));

function homeData(site: string, url: string, builtAt: string) {
  return [
    { '@type': 'CollectionPage', '@id': `${url}#page`, url, name: homeMeta.title, description: homeMeta.description, inLanguage: 'en', dateModified: builtAt,
      isPartOf: { '@id': `${site}/#website` }, author: { '@id': `${site}/#person` },
      mainEntity: { '@type': 'ItemList', itemListElement: real.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: site + productPath(p.slug) })) } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Portfolio', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: url },
    ] },
  ];
}

function productData(p: Product, m: PageMeta, site: string, url: string, builtAt: string) {
  const openSource = p.facts.includes('MIT');
  const repo = p.links.find(l => l.label === 'GitHub')?.href;
  return [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: m.title, description: m.description, inLanguage: 'en', dateModified: builtAt,
      isPartOf: { '@id': `${site}/#website` }, mainEntity: { '@id': `${url}#product` } },
    { '@type': p.kind === 'site' ? 'WebSite' : 'SoftwareApplication', '@id': `${url}#product`, name: p.name, description: p.line, url,
      ...(p.kind === 'plugin' && { applicationCategory: 'DeveloperApplication' }),
      ...(m.image && { image: site + m.image }),
      ...(p.seo && { keywords: p.seo.keywords.join(', ') }),
      ...(repo && { sameAs: [repo] }),
      // An MIT-licensed product is free to install: say so, since Google asks for a price on software.
      ...(openSource && p.kind !== 'site' && { license: 'https://opensource.org/licenses/MIT', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }),
      author: { '@type': 'Person', '@id': `${site}/#person`, name: ME, url: `${site}/` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Portfolio', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: site + HOME },
      { '@type': 'ListItem', position: 3, name: p.name, item: url },
    ] },
  ];
}

function page(shell: string, m: PageMeta, site: string, graph: object[], root: string) {
  const url = site + m.path;
  const tags = [
    `<meta name="robots" content="${m.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`,
    `<meta name="author" content="${ME}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${ME}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    ...(site ? [
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${site}${m.image ?? '/og.jpg'}" />`,
      `<meta name="twitter:image" content="${site}${m.image ?? '/og.jpg'}" />`,
      ...(m.noindex ? [] : [ld(graph)]),
    ] : []),
  ].join('\n    ');
  // Function replacements: a string one would read `$&` in the page's text as a pattern.
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${esc(m.description)}" />`)
    .replace('</head>', () => `  ${tags}\n  </head>`)
    // Without JavaScript nothing lifts the curtain, so it is not shown.
    .replace('<div id="root"></div>', () => `<div id="root">${root}</div>\n    <noscript><style>.pp-curtain{display:none}</style></noscript>`)
    // A product's file sits one folder deeper than the shell, so its assets are addressed from the root.
    .replaceAll('"../', '"/');
}

/** Writes dist/products/index.html and dist/products/<slug>/index.html. Returns the paths that belong in the sitemap. */
export function writeProductPages(dist: string, site: string, builtAt: string) {
  const shell = readFileSync(resolve(dist, 'products/index.html'), 'utf8');
  for (const slot of ['</head>', '<div id="root"></div>']) if (!shell.includes(slot)) throw new Error(`products-seo: ${slot} missing from products/index.html`);
  writeFileSync(resolve(dist, 'products/index.html'), page(shell, homeMeta, site, homeData(site, site + HOME, builtAt), homeBody()));
  for (const p of products) {
    const m = productMeta(p);
    mkdirSync(resolve(dist, 'products', p.slug), { recursive: true });
    writeFileSync(resolve(dist, 'products', p.slug, 'index.html'), page(shell, m, site, productData(p, m, site, site + m.path, builtAt), productBody(p)));
  }
  return [homeMeta, ...real.map(productMeta)].map(m => m.path);
}
