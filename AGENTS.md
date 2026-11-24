# Notes for coding agents

## ui-sdk

Both pages take their tabs, toggles, radio groups and checkboxes from ui-sdk: on the portfolio (`/`), the livery panel's tabs and choices, the GitHub year picker and the phone's 2D/3D switch; on the products pages, see `src/products/DESIGN.md`, which also says why the demo menus aren't. Dialogs, menus, tooltips, disclosures and the native range and text inputs stay hand-rolled on both. Before changing a control, follow the ui-sdk skill if it's installed, and read `node_modules/@ui-sdk/react/docs/llms.txt`.

## Shared libraries

The libraries both pages use are set up in one place each. Apart from these modules, the two pages share no code:

- GSAP: `src/motion/gsap.ts` (`ensureGsap`). Each page passes the plugins only it uses, so they stay in its own bundle; `src/products/motion.ts` re-exports it for the products pages.
- Lenis: `src/motion/lenis.ts` (`startLenis`). Each page passes its own options.
- Reduced motion: `src/motion/reduced.ts`.
- Vercel Analytics and Speed Insights: `src/components/Vitals.tsx`.
- The ui-sdk dev bridge: `src/lib/devAgent.ts`.

## Check a change through the agent bridge

In dev (`npm run dev`), both pages put a ui-sdk agent bridge on `window.__uiAgent` (`src/lib/devAgent.ts`). Call it from the browser console, the Browser pane's JavaScript tool or Playwright to read and drive the page by name instead of by coordinates:

- `__uiAgent.snapshot()` lists the ui-sdk components on the page, each with its `ref`, `label`, state (`value`, `pressed`, `checked`), `items` and `actions`.
- `await __uiAgent.act({ steps: [{ ref: '03 Watch it work', action: 'setValue', args: ['Hand it off'] }] })` runs actions through the component's API. A step finds its component by label or by `ref`. Check `result.ok`, and `result.error.message` when it fails. The app sees the change with `details.source === 'agent'`.
- `await __uiAgent.query({ within, text })` lists a component's choices.

The full API is in `node_modules/@ui-sdk/react/docs/agents.md`. Search it by heading (Get Started, Reference) rather than reading all of it.

Before relying on it:

- It sees only ui-sdk parts. Plain buttons, links, and the demos' menus and popovers aren't in the snapshot: click those.
- Some labels repeat: "Fix with agent" four times on /products/pr-dashboard, and "Edit" twice on /products. The PR demo's tabs have no label. Act on those by the snapshot's `ref`.
- A demo film hands over to the visitor only on a real click or key press. After an agent's change the film keeps playing, so later scenes may change things again. Test the demos with reduced motion, or click in the demo first.
- `/products/usage-explorer` has no ui-sdk parts.
- On `/`, the livery panel is inert while it's closed: open it with the nav's Livery button before acting on its controls.
- Production builds leave the bridge out.
- Keep each call short: a hidden Browser pane throttles timers.
