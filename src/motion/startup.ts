import { ScrollTrigger } from './gsap';

// Start-up order for the sections' motion. The hero sets up at once (it is on screen and
// joins the loader's reveal). The rest wait for the web fonts, so SplitText splits once on
// the real metrics, then set up one per task in page order, so no single task holds the
// page for long; one sort and refresh follows. A #link or a restored scroll position sets
// everything up at once (the jump needs the pins), and so does any input before the queue is done.

const FONT_WAIT = 2000; // ms: past this, set up on the fallback font (SplitText re-splits later)
const INPUTS = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'] as const;

const jobs: Array<() => void> = [];
let state: 'idle' | 'waiting' | 'draining' | 'done' = 'idle';

const run = (job: () => void) => {
  try { job(); } catch (err) { console.error(err); }
};

function finish() {
  state = 'done';
  INPUTS.forEach(e => window.removeEventListener(e, onInput, true));
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

/** One setup per task, so the page can paint and answer input in between. */
function drain() {
  if (state === 'draining' || state === 'done') return;
  state = 'draining';
  const step = () => {
    if (state !== 'draining') return; // flushed meanwhile
    const job = jobs.shift();
    if (!job) { finish(); return; }
    run(job);
    setTimeout(step, 0);
  };
  setTimeout(step, 0);
}

/** Everything left, now. */
function flush() {
  if (state === 'done') return;
  jobs.splice(0).forEach(run);
  finish();
}

// Behind the loader the page can't scroll yet: stop waiting for the fonts, but keep the
// tasks short. Once it can, set up the rest before the visitor gets there.
function onInput() {
  if (document.documentElement.classList.contains('intro')) drain();
  else flush();
}

/** Run a section's setup now if start-up is over, else in its turn. Returns a cancel. */
export function afterStartup(job: () => void): () => void {
  if (state === 'idle' && (location.hash || window.scrollY > 0)) state = 'done';
  if (state === 'done') { job(); return () => {}; }
  jobs.push(job);
  if (state === 'idle') {
    state = 'waiting';
    INPUTS.forEach(e => window.addEventListener(e, onInput, { capture: true, passive: true }));
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void Promise.race([fonts, new Promise(r => setTimeout(r, FONT_WAIT))]).then(drain);
  }
  return () => {
    const i = jobs.indexOf(job);
    if (i >= 0) jobs.splice(i, 1);
  };
}

let queued = false;

/**
 * Sort and re-measure every ScrollTrigger, once for all the calls in a frame. During
 * start-up this waits for the one refresh after the last section is set up.
 */
export function refreshSoon() {
  if (queued || state === 'waiting' || state === 'draining') return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}
