// Names the data refers to. No browser code and no styles here, so tests and build scripts can import it.

/** Every live screen (a screen drawn in code). stage/live.tsx must draw each one. */
export const LIVE_NAMES = [
  'dash:sales', 'dash:branch', 'dash:bench', 'dash:orders', 'dash:pricing',
  // Markwright's document templates, each drawn as the page it starts
  'md:tpl-readme', 'md:tpl-meeting-notes', 'md:tpl-adr', 'md:tpl-prd', 'md:tpl-rfc', 'md:tpl-changelog',
  'md:tpl-bug-report', 'md:tpl-runbook', 'md:tpl-pr-description', 'md:tpl-postmortem', 'md:tpl-weekly-status',
  // Jira Board: one ticket row, drawn large, for the anatomy block
  'jira:row',
] as const;
export type LiveName = (typeof LIVE_NAMES)[number];
/** The live screens that are bb Dashboards dashboards. */
export type DashName = Extract<LiveName, `dash:${string}`>;
export const DASH_NAMES = LIVE_NAMES.filter((n): n is DashName => n.startsWith('dash:'));

/** How many scenes a live demo can play by itself, by stage. A `scenes` block must have exactly this many. */
export const SCENES: Partial<Record<string, number>> = { 'dash-demo': 4, 'md-demo': 4, 'jira-demo': 4 };
