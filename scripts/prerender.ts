// Renders the app to static HTML after the client build, so crawlers and
// no-JS visitors get every heading and paragraph. main.tsx then hydrates it.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE_URL } from '../src/content/data';

const dist = resolve('dist');
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const app: string = render();
if (!html.includes('<!--app-->')) throw new Error('prerender: <!--app--> placeholder missing');
if (!html.includes('<!--seo-->')) throw new Error('prerender: <!--seo--> placeholder missing');

// Canonical and the social card. Crawlers need absolute URLs and the build is relative
// (base './'), so these are only written once the site's address is known.
const site = (process.env.SITE_URL || SITE_URL).replace(/\/+$/, '');
const card = 'Muhammad Ahsan, Senior Full-Stack Developer: React, Go, Python, .NET and AI agents, 450+ AI agents shipped. The 04 helmet.';
const seo = site ? [
  `<link rel="canonical" href="${site}/" />`,
  `<meta property="og:url" content="${site}/" />`,
  `<meta property="og:image" content="${site}/og.jpg" />`,
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  `<meta property="og:image:alt" content="${card}" />`,
  `<meta name="twitter:image" content="${site}/og.jpg" />`,
].join('\n    ') : '';
if (!site) console.warn('prerender: SITE_URL is empty, so no canonical or og:image tags (they need an absolute URL). Set it in src/content/data.ts or pass SITE_URL=https://…');
writeFileSync(resolve(dist, 'index.html'), html.replace('<!--seo-->', seo).replace('<!--app-->', app));
rmSync(resolve('dist-ssr'), { recursive: true, force: true });
console.log(`prerender: wrote ${(app.length / 1024).toFixed(1)} KB of HTML`);
