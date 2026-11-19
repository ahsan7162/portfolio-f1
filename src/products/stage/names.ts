// Names the data refers to. No browser code and no styles here, so tests and build scripts can import it.

/** Every live screen (a screen drawn in code). stage/live.tsx must draw each one. */
export const LIVE_NAMES = [
  'dash:sales', 'dash:branch', 'dash:bench', 'dash:orders', 'dash:pricing',
  // Markwright's document templates, each drawn as the page it starts
  'md:tpl-readme', 'md:tpl-meeting-notes', 'md:tpl-adr', 'md:tpl-prd', 'md:tpl-rfc', 'md:tpl-changelog',
  'md:tpl-bug-report', 'md:tpl-runbook', 'md:tpl-pr-description', 'md:tpl-postmortem', 'md:tpl-weekly-status',
  // Jira Board: one ticket row, drawn large, for the anatomy block
  'jira:row',
  // OpenUI Live Replies: the CI reply, and the replies the prompts block streams in
  'oui:ci', 'oui:waterfall', 'oui:release', 'oui:quiz', 'oui:trip', 'oui:estimate', 'oui:pr', 'oui:app', 'oui:shader',
] as const;
/** A live screen by name; `oui:spec-<Component>` draws that OpenUI Live Replies component's own example program. */
export type LiveName = (typeof LIVE_NAMES)[number] | `oui:spec-${string}`;
export type OuiName = Extract<LiveName, `oui:${string}`>;
/** The live screens that are bb Dashboards dashboards. */
export type DashName = Extract<(typeof LIVE_NAMES)[number], `dash:${string}`>;
export const DASH_NAMES = LIVE_NAMES.filter((n): n is DashName => n.startsWith('dash:'));

/** How many scenes a live demo can play by itself, by stage. A `scenes` block must have exactly this many. */
export const SCENES: Partial<Record<string, number>> = { 'dash-demo': 4, 'md-demo': 4, 'jira-demo': 4, 'openui-demo': 4 };

/** OpenUI Live Replies components the page does not draw (they need a file, an image or Mermaid): signature only. */
export const OUI_UNDRAWN = ['Diagram', 'Snippet', 'FileImage', 'Transcript', 'ImageSearch'];
