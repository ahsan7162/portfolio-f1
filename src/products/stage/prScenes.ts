// The four scenes the PR Dashboard demo plays by itself: Spot it, Pick it, Hand it off, Hear it. Each is a start
// state, an end state (what reduced motion shows), and a beat sheet in seconds that moves the camera and the
// pointer and makes the same changes the controls make. They follow on from each other, and every one ends
// inside the block's hold (HOLD_SCENE, 8.5 s). rest() puts the film layer back when the visitor takes over.
import { gsap } from '../motion';
import { camera, pointer, type FilmApi } from './film';
import { KEYS, land, pick, promptKey, push, send, START, type World } from './pr';
import { PR_PROMPTS } from './prData.gen';
import { PR, type FindingKey } from './prSample';
import type { AlertLine } from './PrView';

/** The demo's screen: the world, and what bb shows around it. */
export interface PrUi {
  w: World;
  /** The row j and k have reached in the list. */
  focus: number;
  /** The bb thread on the branch, slid in after a hand-off, with the prompt it got and what the agent did. */
  thread: boolean; prompt: string; agent: FindingKey[]; steps: number;
  toasts: { id: number; sent?: boolean; alert?: AlertLine }[];
  /** The approval's desktop notification and its count on My PRs. */
  banner: boolean;
  menu: boolean;
  /** The stuck PR has been opened once: its hint ring stops. */
  seen: boolean;
  /** The clock a scene skips to the next alert check. */
  clock: string | null;
}
export const FRESH: PrUi = { w: START, focus: 0, thread: false, prompt: '', agent: [], steps: 0, toasts: [], banner: false, menu: false, seen: false, clock: null };

/** The alert the reviewer's approval makes, as the plugin words it (diffWatch). */
export const APPROVAL: AlertLine = { kind: 'comment', headline: `mina-k commented · ${PR.repo}#${PR.number}`, detail: PR.title };
const toast = (x: PrUi, t: Omit<PrUi['toasts'][number], 'id'>) => [...x.toasts, { id: (x.toasts.at(-1)?.id ?? 0) + 1, ...t }];

/** Open #482: it lands on Checks while jobs fail, else on Comments (the plugin's landing rule). */
export const openUi = (x: PrUi): PrUi => ({ ...x, seen: true, menu: false, w: { ...x.w, view: 'pr', tab: x.w.fixed.includes('unit') && x.w.fixed.includes('lint') ? 'comments' : 'checks' } });
/** Send to agent (or, from the ⋯ menu, every finding left): the prompt goes to the thread on the branch. */
export function sendUi(x: PrUi, all = false): PrUi {
  const before = x.w;
  const w = send(all ? KEYS.reduce((a, k) => (a.picked.includes(k) ? a : pick(a, k)), before) : before);
  if (w === before) return x;
  return { ...x, w, menu: false, thread: true, prompt: PR_PROMPTS[promptKey(w.sent)] ?? '', agent: w.sent.filter(k => !before.sent.includes(k)), steps: 0, toasts: toast(x, { sent: true }) };
}
/** CI reports on the agent's push; an approval arrives as an alert, a desktop banner and a count on My PRs. */
export function landUi(x: PrUi): PrUi {
  const w = land(x.w);
  const approved = w.approved && !x.w.approved;
  return { ...x, w, steps: x.agent.length + 1, toasts: approved ? toast(x, { alert: APPROVAL }) : x.toasts, banner: approved || x.banner };
}

export interface PrSceneApi extends FilmApi {
  act: (f: (s: PrUi) => PrUi) => void;
  /** Runs `make` and keeps the animation it returns, so a take-over lands it on its end. */
  fx: (make: () => gsap.core.Animation) => void;
  /** The scene's cost has landed: the block ticks its cost tag. */
  cost: () => void;
}
export interface PrScene { start: PrUi; end: PrUi; play: (api: PrSceneApi) => gsap.core.Timeline }

const q = (api: PrSceneApi, sel: string) => [...api.win.querySelectorAll(sel)];
const ALL: FindingKey[] = ['jitter', 'gone', 'unit', 'lint'];
const picked = (w: World) => ALL.reduce(pick, w);

const S0 = FRESH;
const S1: PrUi = { ...FRESH, seen: true };
const S2: PrUi = { ...S1, w: { ...picked(START), view: 'pr', tab: 'comments' } };
const S3 = sendUi(S2);
const S3done: PrUi = { ...S3, steps: S3.agent.length + 1, w: push(S3.w) };
const S4: PrUi = { ...landUi(S3done), thread: false, clock: null, w: { ...land(S3done.w), view: 'list' } };

export const PR_SCENES: PrScene[] = [
  {
    // Spot it. The list lands: rows rise, spines draw, chips pop; the pointer finds the red one and the camera
    // leans in on why it is stuck. The tab's one request is the cost.
    start: S0, end: { ...S0, focus: 0 },
    play: api => {
      const tl = gsap.timeline();
      const cam = camera(tl, api), hand = pointer(tl, api);
      cam.set({ s: 1.1, rx: 7, ry: -5 }, 0);
      cam.to({ s: 1 }, 0, 1.3, 'power3.out');
      api.fx(() => gsap.timeline()
        .from(q(api, '.prd-row'), { y: 16, autoAlpha: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out', clearProps: 'all' }, 0.1)
        .from(q(api, '.prd-row .prd-spine'), { scaleY: 0, duration: 0.6, stagger: 0.07, ease: 'expo.out', clearProps: 'transform' }, 0.3)
        .from(q(api, '.prd-row .prd-pill'), { scale: 0.6, autoAlpha: 0, duration: 0.45, stagger: 0.03, ease: 'back.out(2.4)', clearProps: 'all' }, 0.55)
        .from(q(api, '.prd-stat, .prd-new'), { y: 10, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }, 0.7));
      tl.call(api.cost, [], 0.9);
      hand.enter('.prd-row[data-pr="479"]', 1.7);
      hand.move('.prd-row[data-pr="482"] .prd-row-t', 2.2, 0.8);
      tl.call(() => api.act(x => ({ ...x, focus: 0 })), [], 3.0);
      cam.to({ s: 1.55, on: '.prd-row[data-pr="482"] .prd-pills' }, 3.2, 1.4);
      cam.to({ s: 1.55, on: '.prd-row[data-pr="482"] .prd-jobs' }, 5.0, 1.0);
      hand.leave(5.4);
      cam.to({ s: 1 }, 6.6, 1.3);
      return tl;
    },
  },
  {
    // Pick it. Open #482: it lands on Checks. Fix with agent ticks both failed jobs, then both threads in
    // Comments; the bar says 4 to fix. Opening the PR is one more request.
    start: S1, end: S2,
    play: api => {
      const tl = gsap.timeline();
      const cam = camera(tl, api), hand = pointer(tl, api);
      hand.enter('.prd-row[data-pr="482"] .prd-row-t', 0.2);
      hand.press('.prd-row[data-pr="482"] .prd-row-t', 0.9, () => {
        api.act(openUi);
        api.fx(() => gsap.timeline()
          .from(q(api, '.prd-pr > *, .prd-tabs'), { y: 8, autoAlpha: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out', clearProps: 'all' })
          .from(q(api, '.prd-ann'), { x: -10, autoAlpha: 0, duration: 0.4, stagger: 0.12, ease: 'power3.out', clearProps: 'all' }, 0.3));
      });
      tl.call(api.cost, [], 1.1);
      hand.press('[data-fix="unit"]', 2.5, () => api.act(x => ({ ...x, w: pick(x.w, 'unit') })), 0.7);
      hand.press('[data-fix="lint"]', 3.3, () => api.act(x => ({ ...x, w: pick(x.w, 'lint') })));
      hand.press('[data-tab="comments"]', 4.3, () => api.act(x => ({ ...x, w: { ...x.w, tab: 'comments' } })), 0.6);
      hand.press('[data-fix="jitter"]', 5.3, () => api.act(x => ({ ...x, w: pick(x.w, 'jitter') })), 0.6);
      hand.press('[data-fix="gone"]', 6.1, () => api.act(x => ({ ...x, w: pick(x.w, 'gone') })));
      cam.to({ s: 1.35, on: '.prd-batch' }, 6.4, 1.0);
      hand.leave(7.0);
      cam.to({ s: 1 }, 7.4, 0.7);
      return tl;
    },
  },
  {
    // Hand it off. Send to agent: the plugin's prompt arrives in the thread on the branch, a section at a time;
    // the agent works through it and pushes. Nothing is written to GitHub.
    start: S2, end: S3done,
    play: api => {
      const tl = gsap.timeline();
      const cam = camera(tl, api), hand = pointer(tl, api);
      hand.enter('.prd-batch', 0.2);
      hand.press('[data-send]', 1.0, () => {
        api.act(x => sendUi(x));
        api.fx(() => gsap.timeline()
          .from(q(api, '.prd-thread'), { xPercent: 100, duration: 0.7, ease: 'expo.out', clearProps: 'all' })
          .from(q(api, '.prd-msg-sec'), { y: 10, autoAlpha: 0, duration: 0.45, stagger: 0.32, ease: 'power3.out', clearProps: 'all' }, 0.4)
          .from(q(api, '.prd-toast'), { y: 20, autoAlpha: 0, duration: 0.45, ease: 'back.out(1.8)', clearProps: 'all' }, 0.2));
      });
      tl.call(api.cost, [], 1.2);
      hand.leave(1.6);
      cam.to({ s: 1.3, on: '.prd-msg' }, 1.7, 1.2);
      const n = ALL.length;
      for (let i = 1; i <= n; i++) tl.call(() => api.act(x => ({ ...x, steps: i })), [], 3.2 + i * 0.55);
      cam.to({ s: 1.3, on: '.prd-step:last-of-type' }, 4.0, 1.4);
      tl.call(() => api.act(x => ({ ...x, steps: n + 1, w: push(x.w) })), [], 6.1);
      cam.to({ s: 1 }, 6.6, 1.3);
      return tl;
    },
  },
  {
    // Hear it. The clock skips to the next check: CI is green, the threads resolve, and the reviewer's approval
    // arrives as one alert: a toast, a count on My PRs, a desktop banner. Back on the list, #482 is ready.
    start: S3done, end: S4,
    play: api => {
      const tl = gsap.timeline();
      const cam = camera(tl, api), hand = pointer(tl, api);
      tl.call(() => api.act(x => ({ ...x, clock: '10:00' })), [], 0.2);
      tl.call(() => api.act(x => ({ ...x, clock: '10:05 · the 5-minute check' })), [], 1.3);
      tl.call(() => {
        api.act(landUi);
        api.fx(() => gsap.timeline()
          .from(q(api, '.prd-banner'), { y: -24, autoAlpha: 0, duration: 0.55, ease: 'back.out(1.6)', clearProps: 'all' })
          .from(q(api, '.prd-toast:last-child'), { y: 20, autoAlpha: 0, duration: 0.45, ease: 'back.out(1.8)', clearProps: 'all' }, 0.15));
      }, [], 1.9);
      tl.call(api.cost, [], 2.0);
      tl.call(() => api.act(x => ({ ...x, thread: false })), [], 3.0);
      cam.to({ s: 1.35, on: '.prd-blk' }, 3.1, 1.1);
      hand.enter('.prd-back > button', 4.4);
      hand.press('.prd-back > button', 5.1, () => api.act(x => ({ ...x, w: { ...x.w, view: 'list' } })));
      cam.to({ s: 1.45, on: '.prd-row[data-pr="482"]' }, 5.4, 1.2);
      hand.leave(5.6);
      tl.call(() => api.act(x => ({ ...x, clock: null })), [], 7.0);
      cam.to({ s: 1 }, 7.0, 1.0);
      return tl;
    },
  },
];

/** Every film layer at its CSS rest, the camera flat: the demo is whole the moment the visitor takes over. */
export function rest(root: Element) {
  gsap.set(root.querySelectorAll('.prd-cam, .prd-hand, [data-glow], [data-click], .prd-row, .prd-spine, .prd-pill, .prd-stat, .prd-new, .prd-pr > *, .prd-tabs, .prd-ann, .prd-thread, .prd-msg-sec, .prd-toast, .prd-banner'), { clearProps: 'all' });
}
