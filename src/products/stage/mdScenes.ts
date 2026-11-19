// The four scenes the Markwright demo plays by itself: Tick it, Insert it, Draw it, Agents welcome. Each is a
// start state, an end state (what reduced motion shows), and a beat sheet in seconds that moves the camera and
// the pointer and makes the same changes the controls make (mdState.ts). The scenes follow on from each other.
// Every one ends inside the block's hold (HOLD_SCENE, 8.5 s).
import { gsap } from '../motion';
import { camera, pointer, type FilmApi } from './film';
import { grow } from './mdFilm';
import { add, agentWrites, FLOWCHART, keepMine, paragraphOf, save, STORY, tasksOf, tick, WARNING, type MdState } from './mdState';

export interface MdSceneApi extends FilmApi {
  /** Change the demo's state now (the DOM is updated before the next step). */
  act: (f: (s: MdState) => MdState) => void;
  /** Runs `make` and keeps the animation it returns, so a take-over lands it on its end. */
  fx: (make: () => gsap.core.Animation) => void;
  /** The scene's cost has landed: the block ticks its cost tag. */
  cost: () => void;
}

export interface MdScene { start: MdState; end: MdState; play: (api: MdSceneApi) => gsap.core.Timeline }


/** The `/` menu opened on the empty line after `slot` (null: the end). */
const slash = (slot: number | null) => (s: MdState): MdState => ({ ...s, slot, query: '', pick: 0 });
/** A filter typed into the open menu, one letter a beat. */
function type(tl: gsap.core.Timeline, api: MdSceneApi, word: string, t: number, per = 0.16) {
  word.split('').forEach((_, i) => tl.call(() => api.act((s) => ({ ...s, query: word.slice(0, i + 1), pick: 0 })), [], t + i * per));
  return t + word.length * per;
}

const [S0, S1, S2, S3, S4] = STORY;

/** When every scene's beats are done, inside the hold. */
const SETTLED = 8.1;

export const MD_SCENES: MdScene[] = [
  {
    // Tick it. The camera settles from a tilt; the pointer ticks "Load test"; autosave writes 800 ms later and
    // one line of the file lights; the camera eases over to the file. About 6 s.
    start: S0,
    end: S1,
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.9, rx: 10, ry: -9 }, 0);
      cam.to({ s: 1 }, 0.05, 1.5, 'expo.out');
      p.enter('.mwd-box[data-i="2"]', 0.5);
      p.press('.mwd-box[data-i="2"]', 1.6, () => api.act((s) => tick(s, tasksOf(s.doc), 2)), 0.7);
      tl.call(() => { api.act(save); api.cost(); }, [], 2.4);
      cam.to({ s: 1.07, on: '.mwd-file' }, 2.45, 1.4, 'power2.inOut');
      p.leave(3.1);
      cam.to({ s: 0.975 }, 4.8, SETTLED - 4.8, 'sine.inOut');
      return tl;
    },
  },
  {
    // Insert it. + beside the paragraph opens the menu on a new line; "warn" narrows it to one entry; Enter drops
    // in a Warning callout; autosave writes its three lines (the callout, its text, a blank line). About 6.5 s.
    start: S1,
    end: S2,
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.94, rx: -6, ry: 8 }, 0);
      cam.to({ s: 1 }, 0.05, 1.2, 'expo.out');
      const para = '.mwd-blk[data-kind="p"] .mwd-plus';
      p.enter(para, 0.35);
      p.press(para, 1.2, () => api.act((s) => slash(paragraphOf(s.doc))(s)), 0.6);
      const typed = type(tl, api, 'warn', 1.75);
      tl.call(() => api.act((s) => add(s, [{ t: 'quote', callout: 'WARNING', text: WARNING }])), [], typed + 0.35);
      p.leave(typed + 0.2);
      tl.call(() => { api.act(save); api.cost(); }, [], typed + 1.15);
      cam.to({ s: 1.06, on: '.mwd-file' }, typed + 1.2, 1.4, 'power2.inOut');
      cam.to({ s: 0.975 }, typed + 3, SETTLED - typed - 3, 'sine.inOut');
      return tl;
    },
  },
  {
    // Draw it. + Insert, "flow", Enter: a flowchart lands under Rollout with its source open, and the diagram
    // grows one piece for each line of source as it types. Done; autosave writes the fence. About 7.5 s.
    start: S2,
    end: S3,
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 0.93, rx: 7, ry: 7 }, 0);
      cam.to({ s: 1 }, 0.05, 1.2, 'expo.out');
      p.enter('[data-insert]', 0.3);
      p.press('[data-insert]', 1.05, () => api.act(slash(null)), 0.55);
      const typed = type(tl, api, 'flow', 1.5);
      tl.call(() => api.act((s) => {
        const next = add(s, FLOWCHART);
        return { ...next, editing: next.doc.next - 1 };
      }), [], typed + 0.3);
      p.leave(typed + 0.15);
      // the source types in line by line, and the diagram grows a piece for each line
      tl.call(() => api.fx(() => grow(api.win, 0.45)), [], typed + 0.45);
      cam.to({ s: 1.05, on: '.mwd-doc' }, typed + 0.4, 1.6, 'power2.inOut');
      const done = typed + 3.5;
      p.enter('[data-done]', done - 0.9);
      p.press('[data-done]', done, () => api.act((s) => ({ ...s, editing: null })), 0.55);
      tl.call(() => { api.act(save); api.cost(); }, [], done + 0.5);
      cam.to({ s: 1.04, on: '.mwd-file' }, done + 0.45, 1.2, 'power2.inOut');
      p.leave(done + 0.4);
      cam.to({ s: 0.985 }, done + 1.7, Math.max(0.4, SETTLED - done - 1.7), 'sine.inOut');
      return tl;
    },
  },
  {
    // Agents welcome. The agent adds a row while the editor is clean: it appears in place. Then the visitor ticks a
    // box and the agent writes again before autosave: the write is stopped (the file's hash no longer matches),
    // the banner comes up, Compare shows both versions, Keep mine. Nothing was overwritten silently. About 7.5 s.
    start: S3,
    end: S4,
    play: (api) => {
      const tl = gsap.timeline();
      const cam = camera(tl, api);
      const p = pointer(tl, api);
      cam.set({ s: 1.06, on: '.mwd-file' }, 0);
      tl.call(() => api.act(agentWrites), [], 0.7);
      cam.to({ s: 1 }, 1.1, 1, 'power2.inOut');
      p.enter('.mwd-box[data-i="3"]', 1.5);
      p.press('.mwd-box[data-i="3"]', 2.4, () => api.act((s) => tick(s, tasksOf(s.doc), 3)), 0.7);
      tl.call(() => api.act(agentWrites), [], 2.75);
      p.press('[data-compare]', 4.0, () => api.act((s) => ({ ...s, compare: true })), 0.8);
      p.press('[data-keep]', 6.0, () => { api.act(keepMine); api.cost(); }, 0.8);
      p.leave(6.5);
      cam.to({ s: 0.98 }, 6.4, SETTLED - 6.4, 'sine.inOut');
      return tl;
    },
  },
];
