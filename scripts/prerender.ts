// Renders the app to static HTML after the client build, so crawlers and no-JS visitors
// get every heading and paragraph (main.tsx then hydrates it), and writes what needs the
// site's absolute address: the canonical and social tags, the JSON-LD and the sitemap.
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMAIL, SITE_URL, SOCIAL, education, jobs, profile } from '../src/content/data';

const CARD_ALT = 'Muhammad Ahsan, Senior Full-Stack Developer: React, Go, Python, .NET and AI agents, 450+ AI agents shipped. The 04 helmet.';

/**
 * The site's address. Crawlers need absolute URLs and the build is relative (base './'),
 * so the address-bound tags are only written once it is known. On Vercel every build is
 * told the production domain (the custom one, once there is one).
 */
function siteUrl() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL || SITE_URL || (vercel ? `https://${vercel}` : '')).replace(/\/+$/, '');
}

/**
 * Scripts run only from the site itself, plus index.html's pre-paint scripts by hash.
 * Inline styles stay allowed: React and GSAP set style attributes throughout the page.
 * frame-ancestors can't be set from a meta tag, so it is a header (vercel.json).
 */
function contentSecurityPolicy(html: string) {
  const inlineHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineHashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

/**
 * Structured data (JSON-LD): the person the page is about. With the address known it is
 * one graph, the site, its profile page and the person, which Google reads for the site
 * name and the profile result. `builtAt` is a full ISO 8601 time (Google rejects a bare date).
 */
function structuredData(site: string, pageTitle: string, builtAt: string) {
  const person = {
    '@type': 'Person',
    ...(site && { '@id': `${site}/#person`, url: `${site}/`, image: `${site}/og.jpg` }),
    name: profile.name,
    jobTitle: ['Full Stack Developer', 'AI Developer', 'AI Engineer', 'Software Engineer'],
    description: `${profile.lede} ${profile.about}`,
    worksFor: { '@type': 'Organization', name: jobs.find(j => j.id === 'careem')?.company, url: 'https://www.careem.com' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: education.school },
    address: { '@type': 'PostalAddress', addressLocality: 'Karachi', addressCountry: 'PK' },
    email: `mailto:${EMAIL}`,
    knowsAbout: ['Full stack development', 'Software engineering', 'React', 'Next.js', 'Node.js', 'Go', 'Python', '.NET', 'FastAPI', 'Kafka', 'PostgreSQL', 'DynamoDB', 'OpenSearch', 'LangChain', 'LLMs', 'RAG pipelines', 'AI agents', 'Performance optimization'],
    sameAs: SOCIAL.map(s => s.href),
  };
  const graph = site ? [
    { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: profile.name, inLanguage: 'en' },
    { '@type': 'ProfilePage', '@id': `${site}/#page`, url: `${site}/`, name: pageTitle, inLanguage: 'en',
      isPartOf: { '@id': `${site}/#website` }, mainEntity: { '@id': `${site}/#person` }, dateModified: builtAt },
    person,
  ] : [person];
  // `<` escaped, so no string in the data can close the script tag.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

/** The canonical and social card tags (with an address) and the JSON-LD. */
function seoTags(site: string, pageTitle: string, builtAt: string) {
  return [
    ...(site ? [
      `<link rel="canonical" href="${site}/" />`,
      `<meta property="og:url" content="${site}/" />`,
      `<meta property="og:image" content="${site}/og.jpg" />`,
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      `<meta property="og:image:alt" content="${CARD_ALT}" />`,
      `<meta name="twitter:image" content="${site}/og.jpg" />`,
    ] : []),
    `<script type="application/ld+json">${structuredData(site, pageTitle, builtAt)}</script>`,
  ].join('\n    ');
}

/** The sitemap, and robots.txt pointing at it. One URL: the sections are #anchors on the same page. */
function writeSitemap(dist: string, site: string, day: string) {
  writeFileSync(resolve(dist, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${site}/</loc><lastmod>${day}</lastmod></url>`,
    '</urlset>',
    '',
  ].join('\n'));
  const robots = resolve(dist, 'robots.txt');
  writeFileSync(robots, `${readFileSync(robots, 'utf8').trimEnd()}\n\nSitemap: ${site}/sitemap.xml\n`);
}

const dist = resolve('dist');
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const app: string = render();
for (const slot of ['<!--app-->', '<!--seo-->', '<!--csp-->']) {
  if (!html.includes(slot)) throw new Error(`prerender: ${slot} placeholder missing`);
}

const site = siteUrl();
const builtAt = new Date().toISOString();
// The profile page is named after index.html's <title>, so the two never drift apart.
const pageTitle = (/<title>(.*?)<\/title>/.exec(html)?.[1] ?? profile.name).replace(/&amp;/g, '&');
if (!site) console.warn('prerender: SITE_URL is empty, so no canonical or og:image tags and no sitemap (they need an absolute URL). Set it in src/content/data.ts or pass SITE_URL=https://…');
// Function replacements: a string one would read `$&` or `$'` in the page's text as a pattern.
writeFileSync(resolve(dist, 'index.html'), html
  .replace('<!--csp-->', () => `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(html)}" />`)
  .replace('<!--seo-->', () => seoTags(site, pageTitle, builtAt))
  .replace('<!--app-->', () => app));
if (site) writeSitemap(dist, site, builtAt.slice(0, 10));
rmSync(resolve('dist-ssr'), { recursive: true, force: true });
console.log(`prerender: wrote ${(app.length / 1024).toFixed(1)} KB of HTML`);
