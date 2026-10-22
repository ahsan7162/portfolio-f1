// Renders the app to static HTML after the client build, so crawlers and
// no-JS visitors get every heading and paragraph. main.tsx then hydrates it.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMAIL, SITE_URL, SOCIAL, education, jobs, profile } from '../src/content/data';

const dist = resolve('dist');
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const app: string = render();
if (!html.includes('<!--app-->')) throw new Error('prerender: <!--app--> placeholder missing');
if (!html.includes('<!--seo-->')) throw new Error('prerender: <!--seo--> placeholder missing');

// Canonical and the social card. Crawlers need absolute URLs and the build is relative
// (base './'), so these are only written once the site's address is known. On Vercel
// every build is told the production domain (the custom one, once there is one).
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = (process.env.SITE_URL || SITE_URL || (vercel ? `https://${vercel}` : '')).replace(/\/+$/, '');
const card = 'Muhammad Ahsan, Senior Full-Stack Developer: React, Go, Python, .NET and AI agents, 450+ AI agents shipped. The 04 helmet.';
const built = new Date().toISOString().slice(0, 10);
/** The <title> in index.html, so the profile page's name never drifts from it. */
const pageTitle = (/<title>(.*?)<\/title>/.exec(html)?.[1] ?? profile.name).replace(/&amp;/g, '&');

// Structured data (JSON-LD): the person the page is about. With the address known it
// is one graph, the site, its profile page and the person, which Google reads for the
// site name and the profile result.
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
    isPartOf: { '@id': `${site}/#website` }, mainEntity: { '@id': `${site}/#person` }, dateModified: built },
  person,
] : [person];
// `<` escaped, so no string in the data can close the script tag.
const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

const seo = [
  ...(site ? [
    `<link rel="canonical" href="${site}/" />`,
    `<meta property="og:url" content="${site}/" />`,
    `<meta property="og:image" content="${site}/og.jpg" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${card}" />`,
    `<meta name="twitter:image" content="${site}/og.jpg" />`,
  ] : []),
  `<script type="application/ld+json">${ld}</script>`,
].join('\n    ');
if (!site) console.warn('prerender: SITE_URL is empty, so no canonical or og:image tags and no sitemap (they need an absolute URL). Set it in src/content/data.ts or pass SITE_URL=https://…');
writeFileSync(resolve(dist, 'index.html'), html.replace('<!--seo-->', seo).replace('<!--app-->', app));

// The sitemap, and robots.txt pointing at it, need the absolute address too. One URL:
// the sections are #anchors on the same page, which crawlers don't list separately.
if (site) {
  writeFileSync(resolve(dist, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${site}/</loc><lastmod>${built}</lastmod></url>`,
    '</urlset>',
    '',
  ].join('\n'));
  const robots = resolve(dist, 'robots.txt');
  writeFileSync(robots, `${readFileSync(robots, 'utf8').trimEnd()}\n\nSitemap: ${site}/sitemap.xml\n`);
}
rmSync(resolve('dist-ssr'), { recursive: true, force: true });
console.log(`prerender: wrote ${(app.length / 1024).toFixed(1)} KB of HTML`);
