// When a page is actually seen. Between pages a curtain covers the screen; a page's entrance
// should start as the curtain lifts, not when the page mounts behind it.
const waiting = new Set<() => void>();
let revealed = false;

/** Run `start` when the page is revealed (at once if it already is). Returns a canceller. */
export function onReveal(start: () => void) {
  if (revealed) { start(); return () => {}; }
  waiting.add(start);
  return () => { waiting.delete(start); };
}

/** The curtain has come down over the page. */
export function markCovered() { revealed = false; }

/** The curtain is lifting: every waiting entrance starts now. */
export function markRevealed() {
  revealed = true;
  waiting.forEach(start => start());
  waiting.clear();
}
