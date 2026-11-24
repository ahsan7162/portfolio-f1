/**
 * Dev only: puts a ui-sdk agent bridge on window.__uiAgent, so a coding agent can read and drive
 * the page's ui-sdk components (AGENTS.md). Production builds drop it with the DEV branch.
 */
export function devAgent() {
  if (import.meta.env.DEV) void import('@ui-sdk/react/agent').then(({ createAgent }) => Object.assign(window, { __uiAgent: createAgent() }));
}
