// Content for v2. Copied from the v1 portfolio (portfolio/src/data.ts) and
// rewritten for a senior full-stack positioning. Visible copy is plain
// developer English (SEO); F1 styling lives only in the visuals.

/**
 * Before and after, in one unit, drawn as two bars in the details dialog. Only for
 * highlights whose own stat and text measure the same thing.
 */
export type Delta = { from: number; to: number; fromLabel: string; toLabel: string };
export type Highlight = { stat: string; title: string; text: string; delta?: Delta };

// Xtel's timings, shown on the job and on its archive entry.
const DOC_LOAD: Delta = { from: 250, to: 30, fromLabel: '250 s', toLabel: '30 s' };
const FIELD_CHECK: Delta = { from: 30000, to: 100, fromLabel: '30 s', toLabel: '100 ms' };
const SQL_OP: Delta = { from: 120, to: 30, fromLabel: '2 min', toLabel: '30 s' };

/** Anything the details dialog can show. */
export type Breakdown = {
  company: string;
  role: string;
  dates: string;
  loc: string;
  highlights: Highlight[];
};

export type Job = Breakdown & { id: string; years: string; result: string; place: string; summary: string };

export type Project = Breakdown & {
  id: 'agents' | 'partner-ops' | 'llm-server';
  title: string;
  summary: string;
  stack: string[];
  headline: string;
  /** Screenshot slot. Add files under src/assets/projects and fill this in. */
  image?: { src: string; w: number; h: number; alt: string };
};

export type ArchiveItem = {
  year: string;
  name: string;
  stack: string;
  ctx: string;
  note: string;
  highlights: Highlight[];
};

/** Public URL of the site (canonical and OG tags). Empty: on Vercel the prerender uses the production domain. */
export const SITE_URL = '';
export const CV_FILE = 'Muhammad-Ahsan-CV.pdf';
export const EMAIL = 'imranahsan716@gmail.com';
export const PHONE = '+923110237524';
export const PHONE_DISPLAY = '+92 311 023 7524';
export const GITHUB = 'https://www.github.com/ahsan7162';
export const LINKEDIN = 'https://www.linkedin.com/in/ahsan-imran-';
export const SOCIAL = [{ label: 'GitHub', href: GITHUB }, { label: 'LinkedIn', href: LINKEDIN }];

export type Section = {
  id: string;
  /** Its name on the track map and the scroll rail. */
  short: string;
  /** Its row in the site menu (the hero has none). */
  menu?: string;
  /** Menu: the row also lists every job. */
  jobs?: true;
  /** Menu: the row opens the full project list instead of scrolling. */
  archive?: true;
};

/** Every section, in page order. The ids are the sections' element ids (and #links). */
export const SECTIONS: Section[] = [
  { id: 'top', short: 'Start' },
  { id: 'about', short: 'About', menu: 'About' },
  { id: 'timeline', short: 'Timeline', menu: 'Career timeline' },
  { id: 'experience', short: 'Experience', menu: 'Work experience', jobs: true },
  { id: 'projects', short: 'Projects', menu: 'Projects', archive: true },
  { id: 'skills', short: 'Tech stack', menu: 'Tech stack' },
  { id: 'results', short: 'Results', menu: 'Results and education' },
  { id: 'contact', short: 'Finish', menu: 'Contact' },
];

export const profile = {
  name: 'Muhammad Ahsan',
  title: 'Full Stack / AI Developer',
  lede: 'I build React front ends and Go, Python and .NET back ends that scale.',
  now: 'Currently at Careem, building an AI agent platform used company-wide.',
  location: 'Karachi, Pakistan',
  about:
    'I find the slowest part of a system and make it fast. Front end or back end, I measure first, fix the real bottleneck, and ship it to production.',
  /** Words in `about` that get the accent italic treatment. */
  aboutAccent: ['slowest', 'fast.'],
};

export const stats = {
  headline: { value: 450, suffix: '+', label: 'AI agents shipped on a platform I built' },
  grid: [
    { value: 300, prefix: '~', suffix: '×', label: 'Faster agent builds' },
    { value: 4, suffix: '+', label: 'Years in production' },
  ],
};

export const jobs: Job[] = [
  { id: 'careem', company: 'Careem', role: 'Software Engineer', dates: 'October 2025 to present', years: '2025 to now', loc: 'Karachi, Pakistan', place: 'Karachi',
    summary: 'Software engineer. AI agent platform used company-wide, partner ops dashboard, booking concurrency, Go notification service.',
    result: '450+ AI agents, 35% dashboard adoption', highlights: [
    { stat: '450+', title: 'AI agent platform, company-wide', text: 'Internal platform in Go, Python and React with chat, semantic search and Slack integration. Teams create, version and deploy custom AI assistants self-service, with deployment to CI/CD pipelines, Slack channels and threads, and Jira automation. Agent build time fell from 2 to 3 days to 10 minutes.' },
    { stat: '35%', title: 'Partner operations dashboard', text: 'Real-time booking and walk-in visibility on DynamoDB, Kafka and OpenSearch through a React microfrontend, with CSV and Excel export. Launched during a 2026 campaign of 50K bookings: adoption rose from under 2% to 35%, support chat groups fell from 500+ to under 20, and email queries dropped 70%.', delta: { from: 2, to: 35, fromLabel: 'under 2%', toLabel: '35%' } },
    { stat: '1,500+', title: 'Booking concurrency fix', text: 'Two writers could claim the same booking at the same time, leaving partner payouts wrong until someone fixed them by hand. Optimistic locking and structured logging closed the race: 50+ partner payouts delivered accurately across 1,500+ transactions.' },
    { stat: '500+', title: 'In-platform notifications', text: 'Go service (Gin, PostgreSQL) with AWS S3 and CloudFront media, delivered to 500+ partners.' },
    { stat: 'R19', title: 'Frontend modernization', text: 'Upgraded to React 19, migrated tooling, replaced hand-written fetch clients with OpenAPI-generated ones, and added the first automated unit tests.' },
  ] },
  { id: 'xtel', company: 'Xtel', role: 'Senior Software Engineer', dates: 'January 2025 to October 2025', years: '2025', loc: 'Remote, Italy', place: 'Remote, Italy',
    summary: 'Senior engineer. 250 s loads to 30 s, 30 s field checks to 100 ms.',
    result: 'Document loads 8× faster', highlights: [
    { stat: '8×', title: 'Document load: 250 s to 30 s', text: 'Optimized MARS usage and database access patterns across the document pipeline.', delta: DOC_LOAD },
    { stat: '2×', title: 'Anomaly evaluation: 40 s to 20 s', text: 'Removed unnecessary save-and-rollback transactions in document anomaly evaluation.', delta: { from: 40, to: 20, fromLabel: '40 s', toLabel: '20 s' } },
    { stat: '~150×', title: 'UI field visibility: 30 s to 100 ms', text: 'Removed unnecessary GUI initialization and optimized visibility calculations.', delta: FIELD_CHECK },
    { stat: '4×', title: 'A 2-minute operation in 30 seconds', text: 'Azure SQL Server indexing, pagination and on-demand loading, plus high-impact bug fixes across the .NET Core and React application.', delta: SQL_OP },
  ] },
  { id: 'astera', company: 'Astera', role: 'Associate to Software Engineer II', dates: 'June 2022 to December 2024', years: '2022 to 2024', loc: 'Karachi, Pakistan', place: 'Karachi',
    summary: 'Python, .NET and React. Multi-LLM API server, enterprise catalog, ETL marketplace.',
    result: 'Multi-LLM API server, 4 providers', highlights: [
    { stat: '4 LLMs', title: 'Multi-provider LLM server', text: 'Python FastAPI server integrating OpenAI, Anthropic, Llama and HuggingFace: streaming responses, image I/O, Pydantic-structured requests, Jinja2 prompt generation, LangChain and LangGraph agents, and an optimized RAG pipeline.' },
    { stat: '80%', title: 'Faster resource sharing', text: 'Enterprise catalog system on .NET 6 with role-based access control and secure resource sharing, integrated with a React data-governance application.' },
    { stat: '30%', title: 'Less troubleshooting time', text: 'Azure Monitor and Application Insights telemetry: real-time dashboards, anomaly alerts and server-request analysis.' },
    { stat: 'ETL', title: 'Workflow marketplace', text: 'Scalable ETL workflow marketplace on .NET 8 and React with JWT and OAuth. Also a WinForms to WPF modernization and product localization.' },
  ] },
];

export const projects: Project[] = [
  { id: 'agents', company: 'AI agent platform', title: 'AI agent platform', role: 'Go, Python, React, Slack API', dates: '2025 to present', loc: 'Careem, in production',
    stack: ['Go', 'Python', 'React', 'Slack API'], headline: '450+ agents, built in 10 minutes',
    summary: 'A self-service platform to create, version and deploy AI assistants with chat, semantic search, Slack and Jira integrations.',
    highlights: [
    { stat: '450+', title: 'Agents live company-wide', text: 'Teams create, version and deploy custom AI assistants self-service: chat interface, semantic search, Slack integration.' },
    { stat: '10 min', title: 'Build time, down from 2 to 3 days', text: 'What used to need an engineer and a sprint now takes anyone ten minutes.',
      // The bar uses the low end of 2 to 3 days.
      delta: { from: 2 * 24 * 60, to: 10, fromLabel: '2 to 3 days', toLabel: '10 min' } },
    { stat: '4', title: 'Deployment targets', text: 'CI/CD pipelines, Slack channels and threads, Jira automation, and in-platform chat.' },
    { stat: 'Go+Py', title: 'Architecture', text: 'Go services for the platform core, Python for the agent runtime, React front end. Versioning built in from day one.' },
  ] },
  { id: 'partner-ops', company: 'Partner operations dashboard', title: 'Partner operations dashboard', role: 'Kafka, DynamoDB, OpenSearch, React', dates: '2026', loc: 'Careem',
    stack: ['Kafka', 'DynamoDB', 'OpenSearch', 'React'], headline: '50K bookings, 2% to 35% adoption',
    summary: 'Real-time booking and walk-in visibility. Kafka streams into OpenSearch, DynamoDB is the source of truth, and a React microfrontend serves it.',
    highlights: [
    { stat: '50K', title: 'Bookings in one campaign', text: 'Launched during a 2026 campaign and held up under real load.' },
    { stat: '35%', title: 'Adoption after launch', text: 'Partner teams moved from support chats to the dashboard. Support groups fell from 500+ to under 20, email queries down 70%.' },
    { stat: 'Live', title: 'Kafka to OpenSearch pipeline', text: 'Events stream through Kafka into OpenSearch with DynamoDB as the source of truth, served via a React microfrontend.' },
    { stat: 'CSV', title: 'Self-serve exports', text: 'CSV and Excel export so ops teams stopped asking engineers for data pulls.' },
  ] },
  { id: 'llm-server', company: 'Multi-LLM API server', title: 'Multi-LLM API server', role: 'FastAPI, LangChain, Pydantic', dates: '2024', loc: 'Astera',
    stack: ['FastAPI', 'LangChain', 'Pydantic', 'RAG'], headline: '4 LLM providers, 1 API',
    summary: 'One FastAPI gateway for OpenAI, Anthropic, Llama and HuggingFace with streaming, image I/O and structured requests.',
    highlights: [
    { stat: '4', title: 'LLM providers, one gateway', text: 'OpenAI, Anthropic, Llama and HuggingFace behind a single FastAPI contract. Swap providers without touching client code.' },
    { stat: 'SSE', title: 'Streaming and image I/O', text: 'Streaming responses, image input and output, and structured request handling with Pydantic.' },
    { stat: 'Jinja2', title: 'Prompt orchestration', text: 'Multi-step AI flows with Jinja2 prompt generation for reliable outputs.' },
    { stat: 'RAG', title: 'Retrieval, optimized', text: 'LangChain and LangGraph agents and a tuned RAG pipeline for the flagship product.' },
  ] },
];

export const archive: ArchiveItem[] = [
  { year: '2026', name: 'In-platform notifications', stack: 'Go, Gin, PostgreSQL, S3, CloudFront', ctx: 'Careem', note: 'Product updates delivered to 500+ Careem partners.', highlights: [
    { stat: '500+', title: 'Partners reached', text: 'In-platform notifications delivering product updates and tips across Careem partners.' },
    { stat: 'Gin', title: 'Go backend', text: 'Gin and PostgreSQL service with AWS S3 and CloudFront for media.' } ] },
  { year: '2026', name: 'Booking concurrency fix', stack: 'Optimistic locking, structured logging', ctx: 'Careem', note: '50+ partner payouts accurate across 1,500+ transactions.', highlights: [
    { stat: '1,500+', title: 'Transactions protected', text: 'Two writers could claim the same booking at the same time. Optimistic locking closed the race.' },
    { stat: '50+', title: 'Partner payouts, accurate', text: 'Structured logging made every payout traceable.' } ] },
  { year: '2025', name: 'React 19 modernization', stack: 'React 19, OpenAPI, Vite', ctx: 'Careem', note: 'Tooling migrated, generated API clients, first unit tests.', highlights: [
    { stat: 'R19', title: 'Framework and tooling upgrade', text: 'Upgraded a legacy React app to React 19 and migrated the build tooling without breaking production.' },
    { stat: 'OpenAPI', title: 'Generated API clients', text: 'Replaced hand-written fetch clients with OpenAPI-generated, type-safe ones.' },
    { stat: '1st', title: 'Unit tests', text: 'Introduced the first automated unit tests the codebase had.' } ] },
  { year: '2025', name: 'Xtel performance work', stack: 'Azure SQL, .NET Core', ctx: 'Xtel, Italy', note: 'Loads 250 s to 30 s, field checks 30 s to 100 ms.', highlights: [
    { stat: '8×', title: 'Document loads: 250 s to 30 s', text: 'Optimized MARS usage and database access patterns.', delta: DOC_LOAD },
    { stat: '~150×', title: 'Field checks: 30 s to 100 ms', text: 'Removed unnecessary GUI initialization and optimized visibility calculations.', delta: FIELD_CHECK },
    { stat: '4×', title: '2 minutes to 30 seconds', text: 'Azure SQL indexing, pagination and on-demand data loading.', delta: SQL_OP } ] },
  { year: '2024', name: 'ETL workflow marketplace', stack: '.NET 8, React, JWT, OAuth', ctx: 'Astera', note: 'Upload and publish ETL workflows, APIs secured.', highlights: [
    { stat: 'ETL', title: 'Scalable marketplace', text: '.NET 8 and React marketplace where users upload and publish ETL workflows.' },
    { stat: 'OAuth', title: 'Secured APIs', text: 'JWT and OAuth authentication across the marketplace API.' } ] },
  { year: '2023', name: 'Enterprise catalog system', stack: '.NET 6, C#, RBAC', ctx: 'Astera', note: 'Resource sharing 80% faster.', highlights: [
    { stat: '80%', title: 'Faster resource sharing', text: 'Full user control over shared data made sharing 80% faster.' },
    { stat: 'RBAC', title: 'Role-based access control', text: '.NET 6 REST APIs with secure resource sharing, integrated with a React data-governance app.' } ] },
  { year: '2023', name: 'WinForms to WPF modernization', stack: 'WPF, MVVM', ctx: 'Astera', note: 'Responsive rebuild, backward compatible.', highlights: [
    { stat: 'WPF', title: 'Interface modernization', text: 'WinForms to WPF with responsive design while keeping backward compatibility.' },
    { stat: 'LLM', title: 'AI features', text: 'Built a .NET Web API backend for AI-powered features inside the product.' } ] },
  { year: '2022', name: 'Azure telemetry and dashboards', stack: 'Azure Monitor, App Insights', ctx: 'Astera', note: 'Troubleshooting time down 30%.', highlights: [
    { stat: '30%', title: 'Less troubleshooting time', text: 'Azure Monitor and Application Insights telemetry across the .NET product.' },
    { stat: 'Live', title: 'Dashboards and alerts', text: 'Real-time dashboards, anomaly alerts and server-request analysis.' } ] },
  { year: '2022', name: 'Product localization', stack: 'i18n, .NET', ctx: 'Astera', note: 'Multi-language support across flagship products.', highlights: [
    { stat: 'i18n', title: 'Led localization', text: 'Multi-language support across flagship products.' } ] },
  { year: '2021', name: 'Weather forecasting AI', stack: 'Alibaba Cloud, machine learning', ctx: 'Global challenge', note: '3rd of 2,520 teams, Alibaba Cloud Global Challenge.', highlights: [
    { stat: '3rd', title: 'Of 2,520 teams worldwide', text: 'Third place in the Alibaba Cloud Global Challenge with a weather-forecasting solution.' } ] },
];

export const archiveBreakdown = (a: ArchiveItem): Breakdown => ({
  company: a.name, role: a.stack, dates: a.year, loc: a.ctx, highlights: a.highlights,
});

export const skills = {
  core: ['Go', 'Python', 'C#', 'JS'],
  ai: {
    providers: ['OpenAI', 'Anthropic', 'Llama', 'HuggingFace'],
    items: ['LangChain', 'LangGraph', 'Pydantic', 'Jinja2', 'RAG pipelines'],
  },
  frameworks: ['.NET 6 / 8 / Core', 'Node.js', 'React', 'Next.js', 'FastAPI', 'Gin', 'Pandas'],
  data: ['PostgreSQL', 'MySQL', 'SQL Server', 'DynamoDB', 'OpenSearch', 'Kafka'],
  infra: ['AWS S3 / CloudFront', 'Azure DevOps', 'Azure Monitor', 'CI/CD'],
  tooling: ['GitHub', 'Jira', 'Vite', 'Matplotlib', 'Scrapy', 'BeautifulSoup'],
};

/** The red tile in the work grid. */
export const languages = {
  value: skills.core.length,
  text: 'languages in production: Go, Python, C# and JavaScript, from React front ends to back ends and AI.',
};

export const education = {
  degree: 'BS Computer Science',
  school: 'FAST-NUCES',
  years: '2018 to 2022',
  gpa: 'CGPA 3.58 / 4.00',
  deansList: "Dean's list, semesters five to eight",
  award: { year: '2021', place: 3, of: 2520, name: 'Alibaba Cloud Global Challenge', text: 'Third place with a weather-forecasting solution.' },
};

/** One lap through the career: each sector of the 3D lap is one stage. */
export const timeline = [
  { sector: 'S1', job: 'astera', years: '2022 to 2024', company: 'Astera', role: 'Associate to Software Engineer II',
    stat: '4 LLMs', statLabel: 'providers behind one API',
    text: 'Built a multi-LLM FastAPI server, an enterprise catalog on .NET 6 and an ETL workflow marketplace.' },
  { sector: 'S2', job: 'xtel', years: '2025', company: 'Xtel', role: 'Senior Software Engineer',
    stat: '8×', statLabel: 'faster document loads',
    text: 'Performance work on a .NET Core and React product: 250 s loads down to 30 s, 30 s field checks down to 100 ms.' },
  { sector: 'S3', job: 'careem', years: '2025 to now', company: 'Careem', role: 'Software Engineer',
    stat: '450+', statLabel: 'AI agents shipped',
    text: 'An AI agent platform used company-wide, and a real-time partner dashboard on Kafka, OpenSearch and React.' },
];
