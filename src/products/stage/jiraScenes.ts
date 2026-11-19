// The four scenes the Jira Board demo plays by itself: Close the tabs, Hands on the keys, Move it on, Hand it off.
// Each is a start state, the inputs it makes (keys, clicks, typing), the end state those inputs give (what reduced
// motion shows), and a beat sheet in seconds that moves the camera and the pointer. The inputs are data, so
// jiraScenes.test.ts can hold each scene's cost to what it really does. Every scene ends inside HOLD_SCENE (8.5 s).
import { gsap } from '../motion';
import { camera, pointer, type FilmApi } from './film';
import * as J from './jira';
import { crush, keycap, note, type Press } from './jiraFilm';

export interface JiraSceneApi extends FilmApi {
  root: HTMLElement;
  /** Change the demo's state now (the DOM is updated before the next step). */
  act: (f: (s: J.JState) => J.JState) => void;
  /** Runs `make` and keeps the animation it returns, so a take-over lands it on its end. */
  fx: (make: () => gsap.core.Animation) => void;
  /** The scene's cost has landed: the block ticks its cost tag. */
  cost: () => void;
}

export type Input =
  | { at: number; key: string; says: string; run: (s: J.JState) => J.JState }
  | { at: number; click: string; run: (s: J.JState) => J.JState }
  | { at: number; type: string; run: (s: J.JState, text: string) => J.JState };

export interface JiraScene { start: J.JState; inputs: Input[]; end: J.JState; play: (api: JiraSceneApi) => gsap.core.Timeline }

/** The Jira tabs scene 1 closes: the ones My Tickets replaces (a filter, an epic, single tickets). No board or sprint tabs. */
export const TABS: [string, string][] = [
  ['ACME-115 · Store cards as tokens…', '#2684FF'], ['ACME-101 · New-user onboarding', '#8f6bff'], ['ACME-149 · Review the copy in…', '#2684FF'],
  ['ACME-207 · Flaky end-to-end test…', '#2684FF'], ['ACME-125 · Write tests for the…', '#2684FF'], ['ACME-142 · Welcome screen with…', '#2684FF'],
  ['ACME-147 · Skip button hidden on…', '#2684FF'], ['ACME-100 · One-page checkout', '#8f6bff'], ['ACME-121 · Show the order summ…', '#2684FF'],
  ['ACME-124 · Promo code field clears…', '#2684FF'], ['Assigned to me · Filters · Jira', '#2684FF'],
];

/** When every scene's beats are done, inside the hold. */
const SETTLED = 8.1;

const apply = (s: J.JState, i: Input) => ('type' in i ? i.run(s, i.type) : i.run(s));
const make = (start: J.JState, inputs: Input[], beats: (tl: gsap.core.Timeline, api: JiraSceneApi) => void): JiraScene => ({
  start, inputs, end: inputs.reduce(apply, start),
  play: (api) => {
    const tl = gsap.timeline();
    const p = pointer(tl, api);
    const keys: Press[] = [];
    let entered = false;
    for (const i of inputs) {
      if ('key' in i) { keys.push(i); tl.call(() => api.act(i.run), [], i.at); }
      else if ('click' in i) {
        if (!entered) { p.enter(i.click, Math.max(0, i.at - 1.1)); entered = true; }
        p.press(i.click, i.at, () => api.act(i.run), 0.7);
      } else i.type.split('').forEach((_, n) => tl.call(() => api.act((s) => i.run(s, i.type.slice(0, n + 1))), [], i.at + n * 0.14));
    }
    if (keys.length) keycap(tl, api.root, keys, Math.max(0, keys[0].at - 0.75));
    beats(tl, api);
    return tl;
  },
});

const j = (at: number): Input => ({ at, key: 'J', says: 'Move through the list', run: (s: J.JState) => J.step(s, 1) });
const next = (at: number): Input => ({ at, key: ']', says: 'Next ticket', run: (s: J.JState) => J.step(s, 1) });
const upKey = (at: number): Input => ({ at, key: 'U', says: 'Up to the parent', run: J.up });

const review = J.openTicket(J.fresh(), 'ACME-121');
const handoff = J.openTicket(J.fresh(), 'ACME-147');

export const JIRA_SCENES: JiraScene[] = [
  // Close the tabs. Eleven Jira tabs fold into bb's rail one by one, and My Tickets drops in: one list. About 4.5 s.
  make(J.fresh(), [], (tl, api) => {
    const cam = camera(tl, api);
    cam.set({ s: 0.92, rx: 8, ry: -8 }, 0);
    cam.to({ s: 1 }, 0.05, 1.5, 'expo.out');
    const landed = crush(tl, api.root, 1.0);
    tl.call(api.cost, [], landed);
    cam.to({ s: 0.975 }, landed + 0.4, SETTLED - landed - 0.4, 'sine.inOut');
  }),
  // Hands on the keys. J J J moves the ring, Enter opens the ticket beside the list, ] ] walks to ACME-121 (5 of 12),
  // U opens its epic, U its initiative. The keycap presses every key; nothing is clicked. About 6.5 s.
  make(J.fresh(), [j(0.9), j(1.35), j(1.8), { at: 2.5, key: '↵', says: 'Open the selected ticket', run: (s: J.JState) => J.openTicket(s, s.cursor!) }, next(3.3), next(3.9), upKey(4.9), upKey(5.9)], (tl, api) => {
    const cam = camera(tl, api);
    tl.call(api.cost, [], 0.6);
    cam.set({ s: 0.95, ry: 6 }, 0);
    cam.to({ s: 1 }, 0.05, 1.2, 'expo.out');
    cam.to({ s: 1.06, on: '.jbd-pane' }, 4.4, 1.4, 'power2.inOut');
    cam.to({ s: 0.985 }, 6.5, SETTLED - 6.5, 'sine.inOut');
  }),
  // Move it on. S shows the moves ACME-121's workflow allows; one click on Done pops the pill and takes the ticket out of
  // the open list: Open 12 → 11, Done 6 → 7. About 4.5 s.
  make(review, [{ at: 1.3, key: 'S', says: 'Change the status', run: (s: J.JState) => J.showMoves(s) }, { at: 3.0, click: '[data-move="Done"]', run: (s: J.JState) => J.transition(s, 'ACME-121', 'Done') }], (tl, api) => {
    const cam = camera(tl, api);
    cam.set({ s: 0.94, rx: -5, ry: 7 }, 0);
    cam.to({ s: 1 }, 0.05, 1.0, 'expo.out');
    cam.to({ s: 1.12, on: '.jbd-tk-pills' }, 1.5, 1.2, 'power2.inOut');
    tl.call(api.cost, [], 3.05);
    cam.to({ s: 1 }, 3.6, 1.2, 'power2.inOut');
    cam.to({ s: 0.975 }, 4.9, SETTLED - 4.9, 'sine.inOut');
  }),
  // Hand it off. The assignee opens a search of the people Jira lets you assign ACME-147 to; "alex" finds two Alex
  // Kims, told apart by email; the second takes it, and it leaves Jane's list. About 6 s.
  make(handoff, [
    { at: 1.4, click: '[data-assignee]', run: J.showAssign },
    { at: 2.0, type: 'alex', run: (s: J.JState, text: string) => ({ ...s, who: text }) },
    { at: 4.7, click: '[data-person="alex-2"]', run: (s: J.JState) => J.assign(s, 'ACME-147', 'alex-2') },
  ], (tl, api) => {
    const cam = camera(tl, api);
    cam.set({ s: 0.95, rx: 6, ry: -6 }, 0);
    cam.to({ s: 1 }, 0.05, 1.1, 'expo.out');
    cam.to({ s: 1.2, on: '.jbd-picker' }, 2.3, 1.2, 'power2.inOut');
    note(tl, api.root, api.win, '[data-person="alex-1"] small', 3.0, 4.45);
    tl.call(api.cost, [], 4.75);
    cam.to({ s: 1 }, 5.1, 1.2, 'power2.inOut');
    cam.to({ s: 0.975 }, 6.4, SETTLED - 6.4, 'sine.inOut');
  }),
];
