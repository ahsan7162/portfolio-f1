// The four scenes the demo plays by itself: Build, Change, Colour, Edit. Each is a start state, an end
// state (what reduced motion shows), and a timeline: a beat sheet in seconds that moves the camera and the
// pointer and calls the same state changes the controls make. The demo draws what follows; the film layer
// (dashFilm.ts) adds the program streaming in, its check, the ripples and the pulse.
import { gsap } from '../motion';
import { FIRST, HAND, save, send, type DemoState, type Spec } from './dash';
import { pulse, scan, stream, sweep } from './dashFilm';
import { camera, pointer, type FilmApi } from './film';

export interface SceneApi extends FilmApi {
  /** Change the demo's state now (the DOM is updated before the next step). */
  act: (f: (s: DemoState) => DemoState) => void;
  /** Runs `make` and keeps the animation it returns, so a take-over lands it on its end. */
  fx: (make: () => gsap.core.Animation) => void;
  /** The scene's cost has landed (its model call, or proof that there was none): the block ticks its cost tag. */
  cost: () => void;
  /** How fast the next colour ripple travels, in window pixels a millisecond. */
  speed: (v: number) => void;
}

export interface Scene { start: DemoState; end: DemoState; play: (api: SceneApi) => gsap.core.Timeline }

/** A line of the program the agent writes, trimmed with "…" (the page's code block has it in full); `part` is the card it becomes. */
export interface CodeLine { text: string; part?: string; n?: number }
export const BUILD_CODE: CodeLine[] = [
  { text: 'root = Dashboard([lead, trends, breakdown])' },
  { text: 'lead = Section("", [Kpis([Kpi("Revenue", revenue), …])])', part: 'k' },
  { text: 'trends = Section("Trend", [Card("Revenue by week", [TimeSeries(…)])])', part: 't' },
  { text: 'breakdown = Section("", [Card("Revenue by product", [Bars(…)])])', part: 'b' },
];
export const CHANGE_CODE: CodeLine[] = [{ text: 'weekly = Card("Orders by week", [TimeSeries(weeks, …)])', n: 5 }];

const withOrders = (x: Spec): Spec => ({ ...x, orders: true });
const V1: DemoState = { ...HAND, calls: 1 };
const V2: DemoState = { ...V1, versions: [FIRST, withOrders(FIRST)], calls: 2 };
const EDITING: DemoState = { ...V2, editing: true, picked: true, request: 0 };

/** When every act's timeline is done, inside the block's hold (HOLD_SCENE, 8.5 s). */
const SETTLED = 8.1;
/** The end of every act: the camera drifts slowly back, flat, while the end state holds. */
const settle = (cam: ReturnType<typeof camera>, t: number) => cam.to({ s: 0.975 }, t, Math.max(1.2, SETTLED - t), 'sine.inOut');

const pickAccent = (i: number) => (s: DemoState): DemoState => ({ ...s, accent: i });
// Teal, Amber, Pink: three far-apart swatches in the plugin's list, and far from the product's own violet.
const PICKS = [1, 3, 6];
const code = (api: SceneApi, which: string) => api.win.querySelector<HTMLElement>(`.dsd-code[data-for="${which}"]`);

export const SCENES: Scene[] = [
  {
    // Build. The camera settles from a tilt; the program streams in (0.8 to 2.5 s), a light line checks it
    // (to 3.6 s), the save (3.8 s) turns each line into its card; light sweeps, version 1 joins the deck. About 7 s.
    start: { ...HAND, versions: [] },
    end: save({ ...HAND, versions: [] }, () => FIRST),
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      cam.set({ s: 0.88, rx: 11, ry: -10 }, 0);
      cam.to({ s: 1 }, 0.05, 1.6, 'expo.out');
      tl.to(api.win.querySelectorAll('.dsd-empty span'), { autoAlpha: 0, duration: 0.35 }, 0.55);
      const c = code(api, 'build');
      if (!c) return tl;
      const typed = stream(tl, c, api.win, 0.75);
      cam.to({ s: 1.13, on: '.dsd-code[data-for="build"]' }, 1.7, Math.max(0.8, typed - 1.6), 'sine.inOut');
      const checked = scan(tl, c, typed + 0.05);
      const saved = checked + 0.15;
      tl.call(() => { api.act((s) => save(s, () => FIRST)); api.cost(); }, [], saved);
      cam.to({ s: 1 }, saved, 1.5, 'power3.inOut');
      sweep(tl, api.win, saved + 2.1);
      settle(cam, saved + 2.2);
      return tl;
    },
  },
  {
    // Change. A new line is written over the trend and checked (to 2.2 s); the camera has pushed in where the
    // chart will go; the save (2.3 s) parts the cards and the line grows into the new card, a light runs round
    // its border and rides its line as it draws. Version 2 joins the deck; the camera pulls back. About 6.5 s.
    start: V1,
    end: save(V1, withOrders),
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      cam.set({ s: 0.92, rx: 8, ry: 9 }, 0);
      cam.to({ s: 1 }, 0.05, 1.2, 'expo.out');
      const c = code(api, 'change');
      if (!c) return tl;
      const typed = stream(tl, c, api.win, 0.55);
      cam.to({ s: 1.08, on: '.dsd-code[data-for="change"]' }, 1.25, 1.3, 'sine.inOut');
      const saved = scan(tl, c, typed + 0.05) + 0.1;
      tl.call(() => { api.act((s) => save(s, withOrders)); api.cost(); }, [], saved);
      cam.to({ s: 1 }, saved + 1.7, 1.4, 'power3.inOut');
      sweep(tl, api.win, saved + 3.1);
      settle(cam, saved + 3.2);
      return tl;
    },
  },
  {
    // Colour. Colours opens; three accents are picked, each one rippling out from the swatch, quicker each time;
    // the camera pulls back from the button to the whole dashboard. No model call. About 5.5 s.
    start: V2,
    end: { ...V2, accent: PICKS[PICKS.length - 1] },
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 1.07, on: '[data-colours]' }, 0);
      p.enter('[data-colours]', 0.15);
      p.press('[data-colours]', 0.85, () => api.act((s) => ({ ...s, open: 'colours' })), 0.6);
      const at = [1.55, 2.95, 3.95];
      const speeds = [1.2, 2, 3.3];
      PICKS.forEach((i, k) => {
        tl.call(() => api.speed(speeds[k]), [], at[k] - 0.3);
        p.press(`[data-sw="${i}"]`, at[k], () => api.act(pickAccent(i)), k ? 0.4 : 0.45);
      });
      tl.call(() => api.cost(), [], at[0] + 0.15);
      cam.to({ s: 1 }, at[0] + 0.05, 1.5, 'power2.inOut');
      tl.call(() => api.act((s) => ({ ...s, open: null })), [], 4.85);
      p.leave(4.95);
      sweep(tl, api.win, 5.05);
      settle(cam, 5.15);
      return tl;
    },
  },
  {
    // Edit. Edit dims the room and lifts the trend chart into the light while the outline travels to it; the
    // camera pushes in, the request is typed, Send fires a pulse to the chart and the line turns into bars.
    // Version 3 joins the deck; the camera pulls back to the whole dashboard. About 6.5 s.
    start: V2,
    end: send(EDITING),
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 1.05, on: '[data-edit]' }, 0);
      p.enter('[data-edit]', 0.15);
      p.press('[data-edit]', 0.85, () => api.act((s) => ({ ...s, editing: true, open: null })), 0.6);
      cam.to({ s: 1 }, 0.9, 1.1, 'power2.inOut');
      p.press('.dsd-spot', 2.2, () => api.act((s) => ({ ...s, picked: true })), 0.6);
      cam.to({ s: 1.08, on: '.dsd-card[data-flip-id="t"]' }, 2.3, 1.3, 'power2.inOut');
      p.move('.dsd-ask', 2.8, 0.45);
      tl.call(() => api.act((s) => ({ ...s, request: 0 })), [], 3.3);
      p.press('.dsd-send', 4.55, () => {
        const from = api.at('.dsd-send');
        api.act(send);
        const plot = api.win.querySelector('.dsd-card[data-flip-id="t"] .dsd-plot');
        if (plot) api.fx(() => pulse(api.win, from, plot));
        api.cost();
      }, 0.45);
      cam.to({ s: 1 }, 4.95, 1.4, 'power3.inOut');
      p.leave(5.3);
      sweep(tl, api.win, 6.0);
      settle(cam, 6.35);
      return tl;
    },
  },
];
