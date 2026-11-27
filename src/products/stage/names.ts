// Names the data refers to. No browser code and no styles here, so tests and build scripts can import it.

/** Every live screen (a screen drawn in code). stage/live.tsx must draw each one. */
export const LIVE_NAMES = [
  'dash:branch', 'dash:bench', 'dash:orders', 'dash:pricing',
  // Markwright's document templates, each drawn as the page it starts
  'md:tpl-readme', 'md:tpl-meeting-notes', 'md:tpl-adr', 'md:tpl-prd', 'md:tpl-rfc', 'md:tpl-changelog',
  'md:tpl-bug-report', 'md:tpl-runbook', 'md:tpl-pr-description', 'md:tpl-postmortem', 'md:tpl-weekly-status',
  // Jira Board: one ticket row, drawn large, for the anatomy block
  'jira:row',
  // OpenUI Live Replies: the CI reply, and the replies the prompts block streams in
  'oui:ci', 'oui:waterfall', 'oui:release', 'oui:quiz', 'oui:trip', 'oui:estimate', 'oui:pr', 'oui:app', 'oui:shader',
] as const;
/**
 * Acme Notes, the made-up product the system page and the playground show, drawn in code (stage/AcmeScreen.tsx) so
 * every screen takes the colour picked for it. Desktop views are 16:10; the phone and site-phone views are 300:620.
 */
export const ACME_VIEWS = ['panel', 'search', 'links', 'branches', 'history', 'panel-light', 'site', 'phone-list', 'phone-note', 'site-phone'] as const;
export type AcmeView = (typeof ACME_VIEWS)[number];
export type AcmeName = `acme:${AcmeView}`;
export const ACME_NAMES = ACME_VIEWS.map((v): AcmeName => `acme:${v}`);
/** A live screen by name; `oui:spec-<Component>` draws that OpenUI Live Replies component's own example program. */
export type LiveName = (typeof LIVE_NAMES)[number] | `oui:spec-${string}` | AcmeName;
export type OuiName = Extract<LiveName, `oui:${string}`>;
/** The live screens that are bb Dashboards dashboards. */
export type DashName = Extract<(typeof LIVE_NAMES)[number], `dash:${string}`>;
export const DASH_NAMES = LIVE_NAMES.filter((n): n is DashName => n.startsWith('dash:'));

/** How many scenes a live demo can play by itself, by stage. A `scenes` block must have exactly this many. */
export const SCENES: Partial<Record<string, number>> = { 'dash-demo': 4, 'md-demo': 4, 'jira-demo': 4, 'openui-demo': 4, 'pr-demo': 4 };

/** OpenUI Live Replies components the page does not draw (they need a file, an image or Mermaid): signature only. */
export const OUI_UNDRAWN = ['Diagram', 'Snippet', 'FileImage', 'Transcript', 'ImageSearch'];

/** Product drawings the rules, compose and replay blocks can show, by name. stage/pieces.tsx draws each one. */
export const RULE_SET_NAMES = ['pr:blockers'] as const;
export type RuleSetName = (typeof RULE_SET_NAMES)[number];
export const PARTS_NAMES = ['pr:findings'] as const;
export type PartsName = (typeof PARTS_NAMES)[number];
export const SURFACES_NAMES = ['pr:alerts'] as const;
export type SurfacesName = (typeof SURFACES_NAMES)[number];
