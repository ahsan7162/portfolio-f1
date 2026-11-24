# Notes for coding agents

## ui-sdk

The products pages (`src/products`) take their tabs, toggles, radio groups and task checkbox from ui-sdk. Before changing one, follow the ui-sdk skill if it's installed, and read `node_modules/@ui-sdk/react/docs/llms.txt`. `src/products/DESIGN.md` says which controls are ui-sdk and why the demo menus aren't.

## Check a change through the agent bridge

In dev (`npm run dev`), the products pages put a ui-sdk agent bridge on `window.__uiAgent` (`src/products/main.tsx`). Call it from the browser console, the Browser pane's JavaScript tool or Playwright to read and drive the page by name instead of by coordinates:

- `__uiAgent.snapshot()` lists the ui-sdk components on the page, each with its `ref`, `label`, state (`value`, `pressed`, `checked`), `items` and `actions`.
- `await __uiAgent.act({ steps: [{ ref: '03 Watch it work', action: 'setValue', args: ['Hand it off'] }] })` runs actions through the component's API. A step finds its component by label or by `ref`. Check `result.ok`, and `result.error.message` when it fails. The app sees the change with `details.source === 'agent'`.
- `await __uiAgent.query({ within, text })` lists a component's choices.

The full API is in `node_modules/@ui-sdk/react/docs/agents.md`. Search it by heading (Get Started, Reference) rather than reading all of it.

Before relying on it:

- It sees only ui-sdk parts. Plain buttons, links, and the demos' menus and popovers aren't in the snapshot: click those.
- Some labels repeat: "Fix with agent" four times on /products/pr-dashboard, and "Edit" twice on /products. The PR demo's tabs have no label. Act on those by the snapshot's `ref`.
- A demo film hands over to the visitor only on a real click or key press. After an agent's change the film keeps playing, so later scenes may change things again. Test the demos with reduced motion, or click in the demo first.
- `/products/usage-explorer` has no ui-sdk parts. The portfolio (`/`) doesn't load ui-sdk.
- Production builds leave the bridge out.
- Keep each call short: a hidden Browser pane throttles timers.
