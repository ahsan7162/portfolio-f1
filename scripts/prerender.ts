// Renders the app to static HTML after the client build, so crawlers and
// no-JS visitors get every heading and paragraph. main.tsx then hydrates it.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = resolve('dist');
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const app: string = render();
if (!html.includes('<!--app-->')) throw new Error('prerender: <!--app--> placeholder missing');
writeFileSync(resolve(dist, 'index.html'), html.replace('<!--app-->', app));
rmSync(resolve('dist-ssr'), { recursive: true, force: true });
console.log(`prerender: wrote ${(app.length / 1024).toFixed(1)} KB of HTML`);
