// The four scenes the OpenUI Live Replies demo plays by itself: Ask, Tune, Answer, Approve. Each is a thread to
// start from, the clicks that bring it to its start (made at once, out of sight) and to its end (what reduced
// motion shows), and a beat sheet in seconds that moves the camera and the pointer and presses the same buttons
// the visitor presses. Every one ends inside the block's hold (HOLD_SCENE, 8.5 s).
import { gsap } from '../motion';
import { camera, pointer, type FilmApi } from './film';
import { ASK } from './oui/programs';
import { APPROVE, GO, OPENING, TUNE, type Msg } from './ouiThread';

export interface OuiSceneApi extends FilmApi {
  /** Clicks the element `sel` matches, as the visitor would. */
  click: (sel: string) => void;
  /** Sets what the composer shows, a letter at a time. */
  draft: (text: string) => void;
  /** Presses Send on the composer. */
  send: () => void;
  /** The scene's cost has landed: the block ticks its cost tag. */
  cost: () => void;
}

export interface OuiScene { start: Msg[]; prep: string[]; endPrep: string[]; play: (api: OuiSceneApi) => gsap.core.Timeline }

/** When every scene's beats are done, inside the hold. */
const SETTLED = 8.1;

export const OUI_SCENES: OuiScene[] = [
  {
    // Ask. The question types into the composer and goes; the reply streams in, its sentence then its block,
    // the render line sweeping across as the program arrives. The camera leans in on the block. About 5.5 s.
    start: [],
    prep: [],
    // the question chip asks it and the answer lands whole
    endPrep: ['.oud-chip'],
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.92, rx: 9, ry: -8 }, 0);
      cam.to({ s: 1 }, 0.05, 1.4, 'expo.out');
      ASK.split('').forEach((_, i) => tl.call(() => api.draft(ASK.slice(0, i + 1)), [], 0.3 + i * 0.026));
      p.enter('.oud-send', 1.1);
      p.press('.oud-send', 1.85, () => api.send(), 0.55);
      p.leave(2.3);
      cam.to({ s: 1.05, on: '.oud-msg:last-child .oud-block' }, 3.1, 1.6, 'power2.inOut');
      cam.to({ s: 0.985 }, 5.6, SETTLED - 5.6, 'sine.inOut');
      return tl;
    },
  },
  {
    // Tune. Throughput up twice, Ops cost down four times: the rows glide and Redis queue takes the lead, with
    // no model call. About 4.5 s.
    start: OPENING,
    prep: [],
    endPrep: TUNE,
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.94, rx: -6, ry: 7 }, 0);
      cam.to({ s: 1.04, on: '.oui-decision' }, 0.05, 1.3, 'expo.out');
      p.enter(TUNE[0], 0.5);
      tl.call(() => api.cost(), [], 1.1);
      TUNE.forEach((sel, i) => p.press(sel, 1.1 + i * 0.48 + (i >= 2 ? 0.25 : 0), () => api.click(sel), i === 2 ? 0.45 : 0.22));
      p.move('.oui-dec-row[data-lead]', 4.35, 0.6);
      p.leave(5.3);
      cam.to({ s: 0.985 }, 5.4, SETTLED - 5.4, 'sine.inOut');
      return tl;
    },
  },
  {
    // Answer. Go with Redis queue: the button says Sent and the words rise into the thread as the visitor's next
    // message, weights and all. The agent answers with a plan. About 6 s.
    start: OPENING,
    prep: TUNE,
    endPrep: [...TUNE, GO],
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.93, rx: 7, ry: 8 }, 0);
      cam.to({ s: 1.03, on: GO }, 0.05, 1.3, 'expo.out');
      p.enter(GO, 0.5);
      p.press(GO, 1.55, () => api.click(GO), 0.6);
      p.leave(2.1);
      tl.call(() => api.cost(), [], 2.15);
      cam.to({ s: 1, on: '.oud-thread' }, 2.3, 1.4, 'power2.inOut');
      cam.to({ s: 0.985 }, 5.2, SETTLED - 5.2, 'sine.inOut');
      return tl;
    },
  },
  {
    // Approve. Approve the plan: three words go back, and the agent starts. About 4.5 s.
    start: OPENING,
    prep: [...TUNE, GO],
    endPrep: [...TUNE, GO, APPROVE],
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.93, rx: -7, ry: -7 }, 0);
      cam.to({ s: 1.04, on: APPROVE }, 0.05, 1.3, 'expo.out');
      p.enter(APPROVE, 0.6);
      p.press(APPROVE, 1.7, () => { api.click(APPROVE); api.cost(); }, 0.6);
      p.leave(2.3);
      cam.to({ s: 1, on: '.oud-thread' }, 2.4, 1.3, 'power2.inOut');
      cam.to({ s: 0.985 }, 4.6, SETTLED - 4.6, 'sine.inOut');
      return tl;
    },
  },
];
