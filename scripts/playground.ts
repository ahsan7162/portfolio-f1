// The playground's server side, for the dev and preview servers. Production has none of it: on Vercel the
// playground is static files, and the canvas's headers come from vercel.json.
//
// - The canvas (/products/playground/frame.html) is served with its lockdown headers (FRAME_HEADERS).
// - In dev, the canvas is built as one classic script by vite.frame.config.ts, rebuilt on every change.
// - In dev only, Save writes a page or a block into the repo. It is the one way the playground can touch a
//   disk, so it answers only a same-origin request from this machine that carries this run's token, and it
//   chooses every path itself.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join, resolve, sep } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { isLiteral, print } from '../src/products/playground/literal';
import { LIMITS, NAME } from '../src/products/playground/protocol';

/** The canvas's policy: no network, no frames, no workers, no forms, embeddable only by the site, and sandboxed. */
export const FRAME_CSP = [
  "default-src 'none'",
  // 'unsafe-eval' runs the visitor's own block; the sandbox's opaque origin and the rest of this policy contain it
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "manifest-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  'sandbox allow-scripts',
].join('; ');

export const FRAME_HEADERS: Record<string, string> = {
  'Content-Security-Policy': FRAME_CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-DNS-Prefetch-Control': 'off',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=(), display-capture=(), fullscreen=()',
};

/** The editor's own page: its scripts only, frames only from the site, and nothing may embed it. */
export const EDITOR_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const FRAME = '/products/playground/';
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why a Save request is refused, or null when it may go ahead. Every check must pass; none can be skipped by the page. */
export function refuse(req: Pick<IncomingMessage, 'method' | 'headers'> & { socket: { remoteAddress?: string } }, port: number, token: string): string | null {
  if (req.method !== 'POST') return 'Save takes POST only';
  if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return 'Save answers only this machine';
  const host = req.headers.host ?? '';
  // a rebound DNS name would arrive with its own Host: only the loopback names on this port are accepted
  if (![`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`].includes(host)) return 'Save answers only localhost';
  // another site open in the browser cannot post here: its Origin is its own
  if (req.headers.origin !== `http://${host}`) return 'Save answers only the playground itself';
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin') return 'Save answers only the playground itself';
  if (!/^application\/json(;|$)/.test(req.headers['content-type'] ?? '')) return 'Save takes JSON only';
  const given = Buffer.from(String(req.headers['x-playground-token'] ?? ''));
  const want = Buffer.from(token);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return 'Save needs the token this dev server gave its playground page';
  return null;
}

/** Writes a file whole or not at all. */
function put(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

/** Resolves a file under `dir`, and proves it stays there. */
function inside(dir: string, file: string) {
  const path = resolve(dir, file);
  if (!path.startsWith(resolve(dir) + sep)) throw new SaveError('That name would leave its folder');
  return path;
}

export class SaveError extends Error {}

const HEAD = '// Written by the playground\'s Save (scripts/playground.ts); edit it here or in the playground.\n';

/**
 * Saves a real product's page: its blocks go to src/products/pages/<slug>.ts, which replaces the blocks data.ts
 * lists for it. The blocks are written by print() from plain data, so no text in them can become code.
 */
export function writePage(root: string, slug: unknown, blocks: unknown) {
  if (typeof slug !== 'string' || !SLUG.test(slug)) throw new SaveError('Not a product slug');
  const data = readFileSync(resolve(root, 'src/products/data.ts'), 'utf8');
  if (!new RegExp(`\\bslug: '${slug}'`).test(data)) throw new SaveError(`No product "${slug}" in data.ts`);
  const types = new Set([...readFileSync(resolve(root, 'src/products/detail/blocks/index.tsx'), 'utf8').matchAll(/^ {2}([a-z]+): [A-Z]\w*,$/gm)].map(m => m[1]));
  if (!Array.isArray(blocks) || blocks.length > LIMITS.blocks || !isLiteral(blocks)) throw new SaveError('The page must be a list of plain blocks');
  for (const b of blocks) {
    if (!b || typeof b !== 'object' || Array.isArray(b) || typeof b.type !== 'string' || !types.has(b.type)) throw new SaveError('Every block needs a known type');
  }
  const dir = resolve(root, 'src/products/pages');
  const file = inside(dir, `${slug}.ts`);
  put(file, `${HEAD}import type { Block } from '../types';\n\nexport const blocks: Block[] = ${print(blocks)};\n`);
  const saved = readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && SLUG.test(f.slice(0, -3))).sort();
  put(join(dir, 'index.ts'), `${HEAD}// Every page saved from the playground, by product slug. data.ts uses these in place of its own blocks.\nimport type { Block } from '../types';\n${saved.map((f, i) => `import { blocks as p${i} } from './${f.slice(0, -3)}';\n`).join('')}\nexport const pages: Record<string, Block[]> = {${saved.map((f, i) => `\n  '${f.slice(0, -3)}': p${i},`).join('')}${saved.length ? '\n' : ''}};\n`);
  return [file];
}

/** Saves a written block as src/products/detail/blocks/saved/<Name>.tsx (and .css), and lists it in saved/index.ts. */
export function writeBlock(root: string, name: unknown, code: unknown, css: unknown) {
  if (typeof name !== 'string' || !NAME.test(name)) throw new SaveError('A block name is a component name: a capital, then letters and digits');
  if (typeof code !== 'string' || code.length > LIMITS.code || typeof css !== 'string' || css.length > LIMITS.css) throw new SaveError('The block is too long');
  if (css.trim() && !code.includes(`'./${name}.css'`)) throw new SaveError(`The block has CSS: add import './${name}.css'; to its code`);
  const dir = resolve(root, 'src/products/detail/blocks/saved');
  const wrote = [inside(dir, `${name}.tsx`)];
  put(wrote[0], code.endsWith('\n') ? code : `${code}\n`);
  if (css.trim()) { wrote.push(inside(dir, `${name}.css`)); put(wrote[1], css.endsWith('\n') ? css : `${css}\n`); }
  const names = readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => f.slice(0, -4)).filter(n => NAME.test(n)).sort();
  put(join(dir, 'index.ts'), `${HEAD}// Every block saved from the playground, by name. Each is a component in this folder.\nimport type { ComponentType } from 'react';\nimport type { BlockProps } from '../shared';\n${names.map((n, i) => `import * as b${i} from './${n}';\n`).join('')}\nexport const saved: Record<string, ComponentType<BlockProps<'custom'>>> = {${names.map((n, i) => `\n  ${n}: b${i}.${n} as ComponentType<BlockProps<'custom'>>,`).join('')}${names.length ? '\n' : ''}};\n`);
  return wrote;
}

function body(req: IncomingMessage, max: number) {
  return new Promise<string>((ok, no) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      // stop reading, answer, and close: the rest of an oversized body is never held
      if (size > max) { req.removeAllListeners('data'); req.pause(); no(new SaveError('That is too large to save')); return; }
      parts.push(c);
    });
    req.on('end', () => ok(Buffer.concat(parts).toString('utf8')));
    req.on('error', no);
  });
}

function frameFile(res: ServerResponse, path: string, type: string) {
  if (!existsSync(path)) { res.statusCode = 503; res.setHeader('Content-Type', 'text/plain'); res.end('The canvas is still building. Reload in a moment.'); return; }
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  res.end(readFileSync(path));
}

const TYPES: Record<string, string> = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8' };

export function playground(root: string): Plugin {
  const token = randomBytes(32).toString('hex');
  const devOut = resolve(root, 'node_modules/.playground-frame');
  const page = resolve(root, 'public/products/playground/frame.html');

  /** The canvas's headers, wherever it is served from; and, in a build, the editor's (dev injects inline scripts it would refuse). */
  const headers = (built: boolean) => (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = req.url?.split('?')[0];
    if (path === `${FRAME}frame.html`) for (const [k, v] of Object.entries(FRAME_HEADERS)) res.setHeader(k, v);
    if (built && /^\/products\/playground(\/|\/index\.html)?$/.test(path ?? '')) res.setHeader('Content-Security-Policy', EDITOR_CSP);
    // no other window keeps a hold on the editor (and so on the page being built)
    if (/^\/products\/playground(\/|\/index\.html)?$/.test(path ?? '')) res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  };

  return {
    name: 'playground',
    configurePreviewServer(server) { server.middlewares.use(headers(true)); },
    async configureServer(server: ViteDevServer) {
      server.middlewares.use(headers(false));
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        const m = /^\/products\/playground\/frame\.(html|js|css)$/.exec(path);
        if (!m) return next();
        frameFile(res, m[1] === 'html' ? page : join(devOut, `frame.${m[1]}`), TYPES[m[1]]);
      });

      server.middlewares.use('/__playground/save', (req, res) => {
        const reply = (code: number, out: object) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Connection', 'close'); res.end(JSON.stringify(out)); };
        const port = (server.httpServer?.address() as AddressInfo | null)?.port ?? server.config.server.port ?? 0;
        const why = refuse(req, port, token);
        if (why) return reply(403, { error: why });
        body(req, 2 * LIMITS.code)
          .then(text => {
            const data: unknown = JSON.parse(text);
            if (!data || typeof data !== 'object') throw new SaveError('Not a save');
            const d = data as Record<string, unknown>;
            const wrote = d.kind === 'page' ? writePage(root, d.slug, d.blocks) : d.kind === 'block' ? writeBlock(root, d.name, d.code, d.css) : null;
            if (!wrote) throw new SaveError('Not a save');
            reply(200, { wrote: wrote.map(f => f.slice(root.length + 1)) });
          })
          .catch((e: unknown) => reply(400, { error: e instanceof SaveError ? e.message : e instanceof SyntaxError ? 'Not JSON' : 'Save failed' }));
      });

      // The canvas, built as the production one is, and again on every change; open playgrounds reload it.
      const { build } = await import('vite');
      const watcher = await build({ configFile: resolve(root, 'vite.frame.config.ts'), mode: 'development', logLevel: 'warn', build: { outDir: devOut, watch: {} } });
      if ('on' in watcher) {
        watcher.on('event', e => {
          if (e.code === 'BUNDLE_END') { void e.result.close(); server.ws.send({ type: 'custom', event: 'playground:canvas' }); }
          if (e.code === 'ERROR') { server.config.logger.error(`playground canvas: ${e.error.message}`); void e.result?.close(); }
        });
        server.httpServer?.on('close', () => void watcher.close());
      }
    },
    // The token goes only into the editor's own page, and only from the dev server: a build never has it.
    transformIndexHtml: {
      order: 'pre',
      handler(_html, ctx) {
        if (!ctx.server || !ctx.path.startsWith('/products/playground/')) return [];
        return [{ tag: 'meta', attrs: { name: 'playground-save', content: token }, injectTo: 'head' }];
      },
    },
  };
}
