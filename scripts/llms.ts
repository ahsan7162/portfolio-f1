// Writes the site's Markdown guides for AI tools, from the same data as the pages: llms.txt (what the
// site is, with links), llms-full.txt (every job, project, skill and product inline) and AGENTS.md
// (how an agent should use the site). They need absolute URLs, so prerender.ts writes them once the address is known.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CV_FILE, EMAIL, SOCIAL, archive, education, jobs, profile, projects, skills, type Highlight } from '../src/content/data';
import { products } from '../src/products/data';
import { HOME, productPath } from '../src/products/paths';
import { KINDS, findBlock, type Product } from '../src/products/types';

const real = products.filter(p => !p.sample);
const bullets = (highlights: Highlight[]) => highlights.map(h => `- **${h.title}** (${h.stat}): ${h.text}`);

const install = (p: Product) => {
  const via = findBlock(p, 'get')?.via;
  return via?.kind === 'command' ? ` Install: \`${via.command}\`` : '';
};

export function writeLlmsFiles(dist: string, site: string) {
  const intro = [
    `# ${profile.name}`,
    '',
    `> ${profile.title}. ${profile.lede} ${profile.now}`,
    '',
    profile.about,
    '',
    'This site is a static portfolio and a products catalogue: no API, no sign-in, no forms. Everything on it is public.',
  ];
  const links = [
    '## Contact',
    `- [Email](mailto:${EMAIL})`,
    ...SOCIAL.map(s => `- [${s.label}](${s.href})`),
  ];

  const llms = [
    ...intro,
    '',
    '## Portfolio',
    `- [Portfolio](${site}/): about, career timeline, work experience, projects, tech stack, GitHub activity, results and contact, on one page`,
    `- [CV](${site}/${CV_FILE}): the CV as a PDF`,
    `- [Full text](${site}/llms-full.txt): every job, project, skill and product below as Markdown`,
    '',
    '## Products',
    ...real.map(p => `- [${p.name}](${site}${productPath(p.slug)}): ${KINDS[p.kind].label}, ${p.year}. ${p.line}${install(p)}`),
    `- [All products](${site}${HOME})`,
    '',
    ...links,
  ];

  const full = [
    ...intro,
    '',
    '## Work experience',
    ...jobs.flatMap(j => ['', `### ${j.role}, ${j.company} (${j.dates}, ${j.loc})`, '', j.summary, ''].concat(bullets(j.highlights))),
    '',
    '## Projects',
    ...projects.flatMap(p => ['', `### ${p.company} (${p.dates}, ${p.loc})`, '', `${p.summary} Stack: ${p.stack.join(', ')}.`, ''].concat(bullets(p.highlights))),
    '',
    '## More projects',
    '',
    ...archive.map(a => `- **${a.name}** (${a.year}, ${a.ctx}; ${a.stack}): ${a.note}`),
    '',
    '## Tech stack',
    '',
    `- Languages: ${skills.core.join(', ')}`,
    `- AI: ${[...skills.ai.providers, ...skills.ai.items].join(', ')}`,
    `- Frameworks: ${skills.frameworks.join(', ')}`,
    `- Data: ${skills.data.join(', ')}`,
    `- Infrastructure: ${skills.infra.join(', ')}`,
    `- Tooling: ${skills.tooling.join(', ')}`,
    '',
    '## Education',
    '',
    `${education.degree}, ${education.school}, ${education.years}. ${education.gpa}. ${education.deansList}.`,
    '',
    '## Products',
    ...real.flatMap(p => ['', `### [${p.name}](${site}${productPath(p.slug)})`, '', `${KINDS[p.kind].label}, ${p.year}. ${p.line}${install(p)}`]),
    '',
    '## Links',
    `- [Portfolio](${site}/)`,
    `- [CV](${site}/${CV_FILE})`,
    '',
    ...links,
  ];

  const agents = [
    `# ${profile.name}'s portfolio, for agents`,
    '',
    'A static site: a one-page portfolio and a products catalogue. There is no API, MCP server, sign-in or form, so there is nothing to call. Read the pages: each one has all its words in its HTML, with no JavaScript needed.',
    '',
    `- Start with [llms.txt](${site}/llms.txt), or [llms-full.txt](${site}/llms-full.txt) for every job, project, skill and product as Markdown.`,
    `- Every page is in the [sitemap](${site}/sitemap.xml).`,
    `- The CV is a [PDF](${site}/${CV_FILE}).`,
    '- The products are plugins for bb. Each product page shows its install command.',
    `- What crawlers and AI tools may do is in [robots.txt](${site}/robots.txt).`,
    `- Contact: ${EMAIL}`,
  ];

  for (const [file, lines] of [['llms.txt', llms], ['llms-full.txt', full], ['AGENTS.md', agents]] as const) {
    const text = `${lines.join('\n')}\n`;
    // What AI tools and the IsAgentReady check look for: a Markdown heading first, then absolute links.
    if (!text.startsWith('# ') || !text.includes(`${site}/`)) throw new Error(`llms: ${file} needs a heading and absolute links`);
    writeFileSync(resolve(dist, file), text);
  }
}
