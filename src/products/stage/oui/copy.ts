// The words of the OpenUI Live Replies page that live with its programs: the CI run as plain text, and each ask
// with the sentence its reply opens with. Small, so the products pages carry it; the programs (programs.ts) load
// with the drawing kit.

/** The facts of one CI run, as an agent writes them without the plugin. `{key}` ties a line to its part of the UI. */
export const CI_TEXT = [
  '{title}CI failed on fix/checkout-rounding.',
  '{s-build}Build passed in 1m 14s.',
  '{s-test}Test failed after 3m 32s:',
  '{j-unit}  unit passed in 1m 36s,',
  '{j-e2e}  e2e failed in 1m 56s.',
  '{s-deploy}Deploy was skipped.',
  '{t-head}Checkout tests: 1 failed, 2 passed, 1 skipped.',
  '{t-1}- checkout > adds an item: passed',
  '{t-2}- checkout > removes an item: passed',
  '{t-0}- checkout > applies the promo code: failed. Expected total 42.50, received 45.00 (src/checkout.test.ts:88)',
  '{t-3}- checkout > pays with a saved card: skipped, needs the payments sandbox',
];

/** The asks the prompts block offers, and the sentence each reply opens with. */
export const ASK_COPY = [
  { id: 'waterfall', chip: 'Slow endpoint', ask: 'Where does the time go in GET /orders?', prose: 'Mostly in the database: the select takes 290 of the 420 ms. The last 30 requests look the same.' },
  { id: 'release', chip: 'Release check-in', ask: 'How are the release workstreams doing?', prose: 'One on track, one at risk, one late, one done. The press kit is the one to chase.' },
  { id: 'quiz', chip: 'Teach me', ask: 'Quiz me on HTTP caching.', prose: 'Three questions. Send me your score at the end and I’ll go over what you missed.' },
  { id: 'trip', chip: 'Weekend trip', ask: 'Plan two days in Lisbon.', prose: 'Belém on day one, the old town on day two. Tap a stop for its note.' },
  { id: 'estimate', chip: 'Estimate it', ask: 'How long will the environments dashboard take?', prose: 'About 10 days, 11 to be safe. The dashboard UI is the widest range.' },
  { id: 'pr', chip: 'Ready to merge?', ask: 'Is this branch ready to merge?', prose: 'Not yet. The checks are still running, and two things it claims haven’t been checked.' },
  { id: 'app', chip: 'A tiny tool', ask: 'Make me a tip splitter.', prose: 'Here it is. Change the numbers; the button sends the split to this chat.' },
  { id: 'shader', chip: 'Something calm', ask: 'Make me something calm to look at.', prose: 'Slow ripples. It runs on your graphics card, right in the reply.' },
] as const;
