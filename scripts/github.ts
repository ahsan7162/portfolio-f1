// Daily contribution counts and achievement badges for both GitHub accounts, from
// the public profile pages (github.com/users/<login>/contributions and
// github.com/<login>?tab=achievements), the same pages a logged-out visitor sees.
// Private work shows there as anonymous counts because the profile shares them; no
// repository, commit or organisation name is read.
//
// Security: no token, no login, no Authorization header, and no environment
// variable is read for credentials. The output is dates, integers, badge names and
// GitHub's own badge images (saved here, so visitors never load anything from
// GitHub), so the site ships nothing that isn't already public on both profiles.
//
//   npm run github            refresh src/content/github.json (commit it)
//   tsx scripts/github.ts --build
//                             the build step: fetches fresh counts on Vercel only,
//                             keeps the committed snapshot everywhere else
//
// If GitHub is unreachable or its markup changes, the committed snapshot stays and
// the build carries on.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Account, Achievement, GithubData, GithubYear } from '../src/content/github';

const OUT = resolve('src/content/github.json');
// GitHub's badge art, served as static files (./github-badges/<name>). The names carry
// GitHub's content hash, so they are cached for good (vercel.json).
const BADGES = resolve('public/github-badges');
// Only GitHub's asset host, only content-hashed PNG names (also the saved file names).
const BADGE_URL = /^https:\/\/github\.githubassets\.com\/assets\/([a-z0-9-]+-[0-9a-f]{8,}\.png)$/;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ACCOUNTS: { key: Account; login: string; since: number }[] = [
  { key: 'personal', login: 'ahsan7162', since: 2020 },
  { key: 'careem', login: 'MuhammadAhsan-Careem', since: 2025 },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const zeros = (n: number) => Array.from({ length: n }, () => 0);
const daysIn = (y: number) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
const dayIndex = (iso: string) => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(+iso.slice(0, 4), 0, 1)) / 864e5;

/** A public GitHub URL, fetched the way a logged-out visitor would. */
async function get(url: string, accept: string) {
  const res = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'portfolio-build' }, redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}
const page = async (url: string) => (await get(url, 'text/html')).text();

/** A badge image: a PNG under 300 KB from GitHub's asset host, or an error. */
async function badgeArt(file: string): Promise<Uint8Array> {
  const res = await get(`https://github.githubassets.com/assets/${file}`, 'image/png');
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (res.headers.get('content-type') !== 'image/png' || bytes.length > 300_000 || PNG.some((b, i) => bytes[i] !== b)) throw new Error(`${file}: not a badge image`);
  return bytes;
}

/** One account's year as counts per day (index 0 is 1 January). */
async function fetchYear(login: string, year: number): Promise<number[]> {
  const html = await page(`https://github.com/users/${login}/contributions?from=${year}-01-01&to=${year}-12-31`);

  // Each day is a <td data-date id> cell; its count is in the <tool-tip for=id> label.
  const dateOf = new Map<string, string>();
  for (const [td] of html.matchAll(/<td\b[^>]*\bdata-date="\d{4}-\d\d-\d\d"[^>]*>/g)) {
    const date = /data-date="([^"]+)"/.exec(td)![1], id = /\bid="([^"]+)"/.exec(td)?.[1];
    if (id) dateOf.set(id, date);
  }
  const counts = zeros(daysIn(year));
  let seen = 0;
  for (const [, id, label] of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const date = dateOf.get(id);
    if (!date || !date.startsWith(`${year}-`)) continue;
    const m = /^(No|\d[\d,]*) contributions? on (\w+) (\d+)/.exec(label.trim());
    if (!m) throw new Error(`${login} ${year}: unreadable label "${label}"`);
    // The label names its own day: check it against the cell's date.
    if (MONTHS.indexOf(m[2]) !== +date.slice(5, 7) - 1 || +m[3] !== +date.slice(8, 10)) throw new Error(`${login} ${year}: label "${label}" is not ${date}`);
    counts[dayIndex(date)] = m[1] === 'No' ? 0 : +m[1].replace(/,/g, '');
    seen++;
  }
  if (seen !== daysIn(year)) throw new Error(`${login} ${year}: read ${seen} of ${daysIn(year)} days`);

  // The heading's total must match the days read.
  const total = /<h2\b[^>]*>\s*([\d,]+)\s+contributions?/.exec(html)?.[1];
  const sum = counts.reduce((a, b) => a + b, 0);
  if (total === undefined || +total.replace(/,/g, '') !== sum) throw new Error(`${login} ${year}: days add up to ${sum}, the page says ${total}`);
  return counts;
}

/** One account's badges: name and level (1 to 4, the x2 to x4 on the badge). */
async function fetchAchievements(login: string): Promise<Achievement[]> {
  const html = await page(`https://github.com/${login}?tab=achievements`);
  // Each badge is a link to ?achievement=<slug>, holding its image and, above the
  // first level, an x2 to x4 label. The page lists them more than once: keep each once.
  const found = new Map<string, Achievement>();
  for (const [, slug, inner] of html.matchAll(/<a\b[^>]*\bhref="\/[^"?]+\?achievement=([a-z0-9-]+)&amp;tab=achievements"[^>]*>([\s\S]*?)<\/a>/g)) {
    const name = /alt="Achievement: ([^"]+)"/.exec(inner)?.[1];
    if (!name) continue;
    const tier = +(/>\s*x([2-4])\s*<\/span>/.exec(inner)?.[1] ?? 1);
    const image = BADGE_URL.exec(/<img\b[^>]*\bsrc="([^"]+)"/.exec(inner)?.[1] ?? '')?.[1];
    if (!image) throw new Error(`${login}: no badge image for ${name}`);
    if ((found.get(slug)?.tier ?? 0) < tier) found.set(slug, { slug, name, tier, image });
  }
  // Every badge image on the page must have been read.
  const names = new Set([...html.matchAll(/alt="Achievement: ([^"]+)"/g)].map(m => m[1]));
  if (names.size !== found.size) throw new Error(`${login}: read ${found.size} of ${names.size} achievements`);
  return [...found.values()].sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
}

function check(d: GithubData) {
  if (!/^\d{4}-\d\d-\d\d$/.test(d.asOf) || !d.years.length) throw new Error('github: bad snapshot');
  for (const y of d.years) for (const { key } of ACCOUNTS) {
    const a = y[key];
    if (!Array.isArray(a) || a.length > daysIn(y.year) || a.some(n => !Number.isInteger(n) || n < 0)) throw new Error(`github: bad ${key} counts for ${y.year}`);
  }
  for (const { key } of ACCOUNTS) for (const a of d.achievements?.[key] ?? [null]) {
    if (!a || !/^[a-z0-9-]+$/.test(a.slug) || !/^[A-Za-z0-9' -]+$/.test(a.name) || ![1, 2, 3, 4].includes(a.tier)
      || !BADGE_URL.test(`https://github.githubassets.com/assets/${a.image}`)) throw new Error(`github: bad ${key} achievements`);
  }
}

async function build(): Promise<{ data: GithubData; art: Map<string, Uint8Array> }> {
  const asOf = new Date().toISOString().slice(0, 10);
  const now = +asOf.slice(0, 4);
  const all = Array.from({ length: now - Math.min(...ACCOUNTS.map(a => a.since)) + 1 }, (_, i) => now - i);
  // About ten small pages in all, fetched together.
  const rows = await Promise.all(all.map(async year => {
    // The current year stops at today, so the graph never shows empty future days.
    const keep = year === now ? dayIndex(asOf) + 1 : daysIn(year);
    const counts = await Promise.all(ACCOUNTS.map(async ({ login, since }) => (year < since ? zeros(daysIn(year)) : fetchYear(login, year))));
    const row = { year } as GithubYear;
    ACCOUNTS.forEach(({ key }, k) => { row[key] = counts[k].slice(0, keep); });
    return row;
  }));
  // Newest first; years with nothing in them are left out (this one always stays).
  const years = rows.filter(row => row.year === now || ACCOUNTS.some(({ key }) => row[key].some(n => n > 0)));
  const badges = await Promise.all(ACCOUNTS.map(({ login }) => fetchAchievements(login)));
  const achievements = Object.fromEntries(ACCOUNTS.map(({ key }, k) => [key, badges[k]])) as Record<Account, Achievement[]>;
  const data = { asOf, logins: Object.fromEntries(ACCOUNTS.map(a => [a.key, a.login])) as Record<Account, string>, achievements, years };
  check(data);
  // Every image is downloaded and checked before anything is written.
  const files = [...new Set(ACCOUNTS.flatMap(({ key }) => achievements[key].map(a => a.image)))];
  const art = new Map(await Promise.all(files.map(async f => [f, await badgeArt(f)] as const)));
  return { data, art };
}

if (process.argv.includes('--build') && !process.env.VERCEL) {
  console.log('github: using the committed snapshot (Vercel builds fetch fresh counts; npm run github refreshes it)');
} else {
  try {
    const { data, art } = await build();
    mkdirSync(BADGES, { recursive: true });
    for (const [file, bytes] of art) writeFileSync(resolve(BADGES, file), bytes);
    for (const file of readdirSync(BADGES)) if (!art.has(file)) rmSync(resolve(BADGES, file));
    // One year per line, so a refresh diffs by year.
    const body = data.years.map(y => `    ${JSON.stringify(y)}`).join(',\n');
    writeFileSync(OUT, `{\n  "asOf": "${data.asOf}",\n  "logins": ${JSON.stringify(data.logins)},\n  "achievements": ${JSON.stringify(data.achievements)},\n  "years": [\n${body}\n  ]\n}\n`);
    const totals = data.years.map(y => `${y.year} ${ACCOUNTS.reduce((s, { key }) => s + y[key].reduce((a, b) => a + b, 0), 0)}`);
    const badges = ACCOUNTS.flatMap(({ key }) => data.achievements[key].map(a => `${a.name}${a.tier > 1 ? ` x${a.tier}` : ''}`));
    console.log(`github: ${totals.join(', ')}; ${badges.join(', ')} (as of ${data.asOf})`);
  } catch (e) {
    if (!existsSync(OUT)) throw e;
    const kept = JSON.parse(readFileSync(OUT, 'utf8')) as GithubData;
    check(kept);
    for (const { key } of ACCOUNTS) for (const a of kept.achievements[key]) if (!existsSync(resolve(BADGES, a.image))) throw new Error(`github: ${a.image} is missing`, { cause: e });
    console.warn(`github: kept the committed snapshot. ${(e as Error).message}`);
  }
}
