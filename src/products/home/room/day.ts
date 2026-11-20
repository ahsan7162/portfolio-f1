// The day in the room: one GSAP timeline of four days, a different game each night, on a loop.
// Every tween moves a number in one state object; render() turns that object into the drawing.
import { gsap } from '../../motion';
import { CODE, CODE_STEP } from './Scene';

export type Act = 'sleep' | 'eat' | 'code' | 'watch' | 'play';
export const ACTS: { id: Act; name: string }[] = [
  { id: 'sleep', name: 'Sleep' }, { id: 'eat', name: 'Eat' }, { id: 'code', name: 'Code' }, { id: 'watch', name: 'Watch' }, { id: 'play', name: 'Play' },
];

const START = {
  // me. Angles are degrees, 0 hanging straight down; x, y is my hip.
  x: 262, y: 446, rot: -90, face: 1, walk: 0,
  spine: 0, head: -8, thighN: 0, shinN: 0, footN: 0, thighF: 0, shinF: 0, footF: 0,
  uarmN: 0, farmN: 0, uarmF: 0, farmF: 0,
  type: 0, chew: 0, sway: 0, sleep: 0, spoon: 0, pad: 0, phone: 1, headset: 0,
  // the cat: where its feet are, which way it faces, and its pose (0 sit, 1 walk, 2 loaf, 3 curled up)
  cx: 395, cy: 468, cface: 1, cpose: 3, chang: 0, hop: 0, heart: 0, meow: 0,
  // the room: daylight, the sun and moon across the window, lamps, screens
  day: 0, sun: 0, moon: 0.35, dawn: 0, blanket: 0, alarm: 0, rice: 1,
  mon: 0, mMode: 1, code: 0, tv: 0, tMode: 0, tT: 0, wheel: 0, flash: 0, lampF: 0, lampB: 0,
  // where the pointer is, in the drawing's units (the cat watches it)
  px: 800, py: 300,
};
export type State = typeof START;
type Pose = Partial<State>;
export const initialState = (): State => ({ ...START });

// Arms are placed by where the hands should be: a two-bone solve from the shoulder.
const UPPER = 46, FORE = 42;
function reach(p: Pose, near: [number, number], far: [number, number]): Pose {
  const sp = p.spine ?? 0, r = (sp * Math.PI) / 180;
  const solve = (sx: number, sy: number, [tx, ty]: [number, number]) => {
    const ox = p.x! + sx * Math.cos(r) - sy * Math.sin(r), oy = p.y! + sx * Math.sin(r) + sy * Math.cos(r);
    const dx = tx - ox, dy = ty - oy;
    const d = Math.min(Math.max(Math.hypot(dx, dy), 8), UPPER + FORE - 0.5);
    const deg = (v: number) => (v * 180) / Math.PI;
    const dir = deg(Math.atan2(-dx, dy));
    const atShoulder = deg(Math.acos((UPPER ** 2 + d ** 2 - FORE ** 2) / (2 * UPPER * d)));
    const atElbow = deg(Math.acos((UPPER ** 2 + FORE ** 2 - d ** 2) / (2 * UPPER * FORE)));
    return [dir + atShoulder - sp, atElbow - 180];
  };
  const [uarmN, farmN] = solve(2, -92, near), [uarmF, farmF] = solve(0, -92, far);
  return { ...p, uarmN, farmN, uarmF, farmF };
}

const SIT = { thighN: -88, shinN: 90, footN: -2, thighF: -84, shinF: 82, footF: 2 };
const COUCH = { thighN: -86, shinN: 86, footN: 0, thighF: -82, shinF: 80, footF: 2 };
const STILL_LEGS = { thighN: 0, shinN: 0, footN: 0, thighF: 0, shinF: 0, footF: 0 };
const STAND: Pose = { rot: 0, y: 426, spine: 0, head: 0, ...STILL_LEGS, uarmN: 0, farmN: -8, uarmF: 0, farmF: -8 };

const LIE: Pose = { x: 262, y: 446, rot: -90, spine: 0, head: -8, ...STILL_LEGS, uarmN: 4, farmN: -6, uarmF: 2, farmF: -4 };
const LIE_PHONE: Pose = { ...LIE, ...pick(reach({ x: 0, y: 0, spine: 0 }, [46, -138], [10, -40]), 'uarmN', 'farmN', 'uarmF', 'farmF') };
const SIT_UP: Pose = { x: 262, y: 458, rot: 0, spine: 4, head: 0, thighN: -90, shinN: 0, footN: 0, thighF: -88, shinF: 0, footF: 0, uarmN: -20, farmN: -30, uarmF: -16, farmF: -30 };
const STRETCH: Pose = { ...SIT_UP, spine: -2, head: -14, uarmN: -172, farmN: -8, uarmF: -166, farmF: -12 };
const TABLE = reach({ x: 612, y: 488, rot: 0, spine: 6, head: 2, ...SIT }, [700, 422], [690, 427]);
const BITE = reach({ ...TABLE, spine: 6 }, [650, 372], [690, 427]);
const GIVE = reach({ ...TABLE, spine: 24, head: 10 }, [728, 420], [690, 427]);
const DESK = reach({ x: 892, y: 488, rot: 0, spine: 6, head: -2, ...SIT }, [975, 420], [962, 422]);
const DESK_BACK = reach({ ...DESK, spine: -6, head: -6 }, [930, 472], [922, 474]);
const DESK_UP: Pose = { ...DESK, spine: -8, head: -14, uarmN: -165, farmN: -18, uarmF: -160, farmF: -22 };
const RACE = reach({ ...DESK, spine: 8, head: 0 }, [962, 380], [958, 410]);
const PC = reach({ ...DESK, spine: 14, head: 4 }, [996, 421], [960, 422]);
const SOFA = reach({ x: 1300, y: 486, rot: 0, spine: -10, head: 4, ...COUCH }, [1342, 474], [1334, 476]);
const SOFA_UP = reach({ ...SOFA, spine: 2, head: -3 }, [1342, 474], [1334, 476]);
const PAD = reach({ ...SOFA, spine: 6, head: 2 }, [1352, 436], [1346, 440]);
const PAD_LEAN = reach({ ...SOFA, spine: 14, head: 6 }, [1360, 440], [1354, 444]);
const CHEER: Pose = { ...SOFA, spine: -4, head: -12, uarmN: -165, farmN: -20, uarmF: -158, farmF: -26 };

function pick(p: Pose, ...keys: (keyof State)[]): Pose {
  return Object.fromEntries(keys.map(k => [k, p[k]]));
}

/** The four nights' games, in order: where each is played and what the bar says. */
const GAMES = [
  { couch: true, doing: 'Playing football' },
  { couch: false, doing: 'Racing' },
  { couch: false, doing: 'Playing on the PC' },
  { couch: true, doing: 'Playing a platformer' },
];

export type Loop = {
  tl: gsap.core.Timeline;
  length: number;
  /** [time, minutes since midnight] */
  clock: [number, number][];
  /** [time, part of the day, what the bar says] */
  doing: [number, Act, string][];
  /** [time, part of the day]: where a skip to that part lands */
  marks: [number, Act][];
};

export function buildLoop(S: State): Loop {
  const tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'power2.inOut' } });
  const loop: Loop = { tl, length: 0, clock: [], doing: [], marks: [] };
  let t = 0;
  GAMES.forEach((game, n) => { t = day(tl, loop, S, t, game, n === GAMES.length - 1); });
  loop.length = t;
  return loop;
}

function day(tl: gsap.core.Timeline, loop: Loop, S: State, t0: number, game: (typeof GAMES)[number], last: boolean) {
  const a = (t: number) => t0 + t;
  const to = (vars: Pose, at: number, duration = 0.5, ease?: string) => { tl.to(S, { ...vars, duration, ...(ease && { ease }) }, at); };
  const set = (vars: Pose, at: number) => { tl.set(S, vars, at); };
  const clock = (at: number, h: number, m: number) => { loop.clock.push([at, h * 60 + m]); };
  const doing = (at: number, act: Act, text: string) => { loop.doing.push([at, act, text]); };
  const mark = (at: number, act: Act) => { loop.marks.push([at, act]); };

  let me = 262;
  const walk = (x: number, at: number, speed = 120) => {
    const d = Math.abs(x - me) / speed;
    set({ face: x >= me ? 1 : -1 }, at);
    to({ walk: 1 }, at, 0.2);
    tl.to(S, { x, duration: d, ease: 'none' }, at);
    to({ walk: 0 }, at + d - 0.2, 0.2);
    me = x;
    return at + d;
  };
  let cat = { x: 395, y: 468 };
  const catWalk = (x: number, at: number, speed = 150) => {
    const d = Math.abs(x - cat.x) / speed;
    set({ cpose: 1, cface: x >= cat.x ? 1 : -1 }, at);
    tl.to(S, { cx: x, duration: d, ease: 'none' }, at);
    cat = { ...cat, x };
    return at + d;
  };
  const catJump = (x: number, y: number, at: number, d = 0.45) => {
    set({ cpose: 1, cface: x >= cat.x ? 1 : -1 }, at);
    tl.to(S, { cx: x, duration: d, ease: 'none' }, at);
    tl.to(S, { cy: Math.min(cat.y, y) - 30, duration: d / 2, ease: 'power2.out' }, at);
    tl.to(S, { cy: y, duration: d / 2, ease: 'power2.in' }, at + d / 2);
    cat = { x, y };
    return at + d;
  };

  // Night: the phone, then sleep. The moon crosses the window; dawn comes up at six.
  clock(a(0), 1, 30);
  doing(a(0), 'sleep', 'Asleep');
  mark(a(0.2), 'sleep');
  to(LIE, a(1.6), 0.7);
  to({ phone: 0 }, a(1.8), 0.3);
  set({ sleep: 1 }, a(2.1));
  to({ moon: 1 }, a(0), 6.6, 'none');
  set({ sun: 0 }, a(0));
  to({ dawn: 1 }, a(5.4), 1.4);
  to({ day: 1 }, a(6), 2.2, 'sine.inOut');
  to({ dawn: 0 }, a(7.2), 1.6);
  to({ sun: 0.12 }, a(6), 2.4, 'none');
  to({ sun: 1 }, a(8.4), 21.6, 'none');
  clock(a(6), 5, 45);
  to({ alarm: 1 }, a(7.7), 0.1);
  set({ sleep: 0 }, a(7.9));
  clock(a(8), 8, 0);
  to({ alarm: 0 }, a(8.5), 0.2);

  // Up.
  doing(a(8.4), 'sleep', 'Waking up');
  to(SIT_UP, a(8.4), 0.6, 'back.out(1.2)');
  to({ blanket: 1 }, a(10), 0.4);
  to(STRETCH, a(9.05), 0.5, 'back.out(1.4)');
  to(SIT_UP, a(9.7), 0.4);
  set({ cpose: 0 }, a(8.9));
  to({ ...STAND, x: 445 }, a(10.1), 0.5, 'power2.out');
  me = 445;
  let c = catJump(452, 560, a(10.2));
  c = catWalk(806, c + 0.1);
  c = catJump(806, 498, c + 0.05);
  set({ cpose: 0, cface: -1 }, c);

  // Breakfast is biryani. Three bites, and one for the cat.
  doing(a(10.6), 'eat', 'Off to breakfast');
  const sat = walk(612, a(10.6));
  set({ face: 1 }, sat);
  to(TABLE, sat, 0.45);
  set({ spoon: 1 }, sat + 0.2);
  clock(a(12.4), 8, 30);
  doing(a(12.4), 'eat', 'Eating biryani');
  mark(a(12.4), 'eat');
  for (let i = 0; i < 3; i++) {
    const b = a(12.6 + i * 1.25);
    to(BITE, b, 0.4);
    to({ rice: 1 - (i + 1) * 0.22 }, b + 0.35, 0.2);
    to({ chew: 1 }, b + 0.4, 0.1);
    to(TABLE, b + 0.75, 0.4);
    to({ chew: 0 }, b + 1.1, 0.1);
  }
  c = catJump(762, 428, a(16));
  set({ cpose: 0, cface: -1 }, c);
  to(GIVE, a(16.4), 0.5);
  to({ heart: 1 }, a(16.9), 0.3, 'back.out(2)');
  to({ heart: 0 }, a(17.8), 0.3);
  to(TABLE, a(17), 0.4);
  set({ spoon: 0 }, a(17.3));
  clock(a(17.4), 9, 15);

  // The desk. The cat walks across the keyboard, then takes the monitor.
  doing(a(17.6), 'code', 'Off to the desk');
  to({ ...STAND, x: 612 }, a(17.6), 0.4);
  const desk = walk(892, a(18));
  c = catJump(800, 560, a(17.9));
  c = catWalk(992, c + 0.1);
  c = catJump(1042, 430, c + 0.05);
  set({ cpose: 0, cface: -1 }, c);
  set({ face: 1 }, desk);
  to(DESK, desk, 0.45);
  to({ mon: 1 }, a(20.6), 0.4);
  set({ mMode: 1 }, a(20.6));
  clock(a(20.8), 9, 30);
  doing(a(20.8), 'code', 'Coding');
  mark(a(20.8), 'code');
  to({ type: 1 }, a(20.8), 0.2);
  tl.fromTo(S, { code: 0 }, { code: 0.42, duration: 1.9, ease: 'none' }, a(20.8));
  catWalk(948, a(22.6), 70);
  to({ type: 0 }, a(22.8), 0.2);
  set({ mMode: 2 }, a(22.9));
  to(DESK_BACK, a(22.9), 0.4);
  c = catJump(1078, 308, a(24), 0.55);
  set({ cpose: 2, cface: -1, chang: 1 }, c);
  to(DESK, a(24.6), 0.4);
  set({ mMode: 1 }, a(24.9));
  to({ type: 1 }, a(24.8), 0.2);
  to({ code: 1 }, a(24.9), 4, 'none');
  to({ head: 6 }, a(25.3), 0.4);
  to({ head: -2 }, a(26.5), 0.5);
  to({ dawn: 0.8 }, a(27.4), 1.4);
  to({ day: 0.25 }, a(27.6), 2.6, 'sine.inOut');
  to({ dawn: 0 }, a(29), 1.6);
  to({ type: 0 }, a(28.9), 0.2);
  set({ mMode: 3 }, a(29));
  to(DESK_UP, a(29.1), 0.5, 'back.out(1.4)');
  to(DESK, a(30.1), 0.4);
  clock(a(31), 18, 30);

  // The couch. The show, the next episode, and the question.
  doing(a(31), 'watch', 'Off to the couch');
  to({ ...STAND, x: 892 }, a(31), 0.4);
  to({ mon: 0 }, a(31.8), 0.6);
  to({ day: 0 }, a(31), 2);
  set({ sun: 0, moon: 0 }, a(31.6));
  const sofa = walk(1300, a(31.4));
  to({ lampF: 1 }, a(34), 0.3);
  c = catJump(1060, 430, a(33), 0.4);
  set({ chang: 0 }, a(33));
  c = catJump(1120, 560, c + 0.1);
  c = catWalk(1400, c + 0.1);
  c = catJump(1410, 496, c + 0.05);
  set({ cpose: 3, cface: -1 }, c);
  set({ face: 1 }, sofa);
  to(SOFA, sofa, 0.5);
  clock(a(35.4), 19, 30);
  doing(a(35.4), 'watch', 'Watching Netflix');
  mark(a(35.4), 'watch');
  to({ tv: 1 }, a(35.4), 0.4);
  set({ tMode: 1, tT: 0 }, a(35.4));
  to({ tT: 1 }, a(35.5), 1.2, 'none');
  set({ tMode: 2, tT: 0 }, a(36.8));
  to({ tT: 0.94 }, a(36.8), 3.2, 'none');
  set({ tMode: 3, tT: 0 }, a(40));
  to({ tT: 1 }, a(40), 1, 'none');
  set({ tMode: 2, tT: 0 }, a(41));
  to({ tT: 0.2 }, a(41), 0.6, 'none');
  set({ tMode: 4 }, a(41.6));
  to(SOFA_UP, a(41.7), 0.4);
  clock(a(42.4), 22, 30);

  // A game: a different one each night.
  doing(a(42.4), 'play', game.doing);
  let end: number;
  if (game.couch) {
    const lean = game === GAMES[0] ? PAD_LEAN : PAD;
    set({ pad: 1 }, a(42.5));
    to(lean, a(42.5), 0.4);
    set({ tMode: game === GAMES[0] ? 5 : 6 }, a(42.7));
    mark(a(42.7), 'play');
    to({ type: 1 }, a(42.9), 0.2);
    set({ cpose: 0, cface: 1 }, a(43.6));
    to({ type: 0 }, a(46.9), 0.1);
    to({ flash: 1 }, a(47), 0.2);
    to(CHEER, a(47), 0.35, 'back.out(1.6)');
    to(lean, a(47.8), 0.4);
    to({ flash: 0 }, a(48), 0.3);
    to({ type: 1 }, a(48.1), 0.2);
    to({ type: 0 }, a(49.4), 0.2);
    to({ tv: 0 }, a(49.6), 0.4);
    set({ pad: 0 }, a(49.8));
    set({ cpose: 3, cface: -1 }, a(49.8));
    end = a(49.8);
  } else {
    const racing = game === GAMES[1];
    const pose = racing ? RACE : PC;
    to({ tv: 0 }, a(42.6), 0.4);
    to({ ...SOFA, ...STAND, x: 1300 }, a(42.7), 0.4);
    const back = walk(892, a(43.1));
    set({ face: 1 }, back);
    to(pose, back, 0.45);
    to({ mon: 1 }, back, 0.4);
    set({ mMode: racing ? 4 : 5 }, back + 0.1);
    to(racing ? { wheel: 1 } : { headset: 1 }, back, 0.35, 'back.out(1.7)');
    mark(back + 0.1, 'play');
    to(racing ? { sway: 1 } : { type: 1 }, back + 0.4, 0.4);
    to({ sway: 0, type: 0 }, back + 4.3, 0.2);
    to({ flash: 1 }, back + 4.5, 0.2);
    to({ ...DESK_UP, x: 892 }, back + 4.5, 0.35, 'back.out(1.6)');
    to(pose, back + 5.3, 0.4);
    to({ flash: 0 }, back + 5.5, 0.3);
    to(racing ? { sway: 1 } : { type: 1 }, back + 5.6, 0.3);
    to({ sway: 0, type: 0 }, back + 6.6, 0.2);
    to({ mon: 0, wheel: 0, headset: 0 }, back + 6.9, 0.4);
    end = back + 7.1;
  }
  clock(end, 0, 50);

  // Bed. The phone, again.
  doing(end, 'sleep', 'Off to bed');
  to({ ...STAND, x: me }, end, 0.45);
  to({ head: -12 }, end + 0.1, 0.3);
  to({ head: 0 }, end + 0.5, 0.3);
  const atBed = walk(445, end + 0.5, 140);
  to({ lampF: 0 }, end + 1.4, 0.4);
  to({ lampB: 1 }, atBed - 0.8, 0.3);
  set({ face: 1 }, atBed);
  to(LIE_PHONE, atBed, 0.7);
  to({ blanket: 0 }, atBed + 0.3, 0.5);
  set({ phone: 1 }, atBed + 0.6);
  to({ lampB: 0 }, atBed + 1.4, 0.4);
  to({ rice: 1 }, atBed + 1, 0.6);
  c = catJump(cat.x + 30, 560, end + 1);
  c = catWalk(452, c + 0.1, 190);
  c = catJump(395, 468, c + 0.05);
  set({ cpose: 3, cface: 1 }, c);
  const finish = Math.max(atBed + 2, c + 0.6);
  to({ moon: 0.35 }, a(31.6), finish - a(31.6), 'none');
  if (last) clock(finish, 1, 30);
  return finish;
}

/** Minutes since midnight at a point in the loop. */
function clockAt(loop: Loop, local: number) {
  const k = loop.clock;
  let i = 0;
  while (i < k.length - 1 && k[i + 1][0] <= local) i++;
  const [t1, m1] = k[i], [t2, m2] = k[i + 1] ?? [loop.length, 90];
  const m2n = m2 < m1 ? m2 + 1440 : m2;
  return (m1 + (m2n - m1) * Math.min(1, (local - t1) / (t2 - t1 || 1))) % 1440;
}

function doingAt(loop: Loop, local: number) {
  let found = loop.doing[0];
  for (const d of loop.doing) { if (d[0] <= local) found = d; else break; }
  return found;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

/** Where the timeline next lands on a part of the day, after `now` (in total time). */
export function nextMark(loop: Loop, act: Act, now: number) {
  const base = now - (now % loop.length);
  const times = loop.marks.filter(m => m[1] === act).flatMap(([t]) => [base + t, base + t + loop.length]);
  return Math.min(...times.filter(t => t > now + 0.3));
}

export type Ui = { root: HTMLElement; time: HTMLElement; doing: HTMLElement; acts: HTMLElement[]; narrow: { on: boolean } };

/** The drawing, from the state. Writes only what changed. */
export function makeRender(svg: SVGSVGElement, S: State, loop: Loop, ui: Ui) {
  const R: Record<string, SVGElement> = {};
  svg.querySelectorAll<SVGElement>('[data-r]').forEach(el => { R[el.dataset.r!] = el; });
  const joints = Array.from(svg.querySelectorAll<SVGGElement>('[data-j]'), g => {
    const [ax, ay] = g.dataset.at!.split(',').map(Number);
    return { g, k: g.dataset.j!, ax, ay };
  });
  const lines = Array.from(svg.querySelectorAll<SVGRectElement>('[data-code]'), r => ({ r, w: Number(r.dataset.code), i: Math.round((Number(r.getAttribute('y')) - 321) / CODE_STEP) }));
  const zs = Array.from(svg.querySelectorAll<SVGTextElement>('[data-z]'));
  const players = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-p]'));

  const seen = new WeakMap<Element, Record<string, string>>();
  const put = (el: Element | undefined, attr: string, v: string) => {
    if (!el) return;
    let s = seen.get(el);
    if (!s) seen.set(el, (s = {}));
    if (s[attr] === v) return;
    s[attr] = v;
    el.setAttribute(attr, v);
  };
  const n2 = (v: number) => v.toFixed(2);
  const op = (el: Element | undefined, v: number | boolean) => { const n = Number(v); put(el, 'opacity', n <= 0.002 ? '0' : n >= 0.998 ? '1' : n.toFixed(3)); };
  const tr = (el: Element | undefined, v: string) => put(el, 'transform', v);
  const text = (el: Element | undefined, v: string) => { if (el && el.textContent !== v) el.textContent = v; };

  let lit = -1, code = -1, cam = -1, shown = '';
  const angle: Record<string, number> = {};

  return function render() {
    const T = loop.tl.totalTime(), t = T;
    const local = T % loop.length;

    // daylight: one number, every colour follows (room.css)
    if (Math.abs(S.day - lit) > 0.002) { lit = S.day; ui.root.style.setProperty('--day', lit.toFixed(3)); }

    // the window
    const sunX = 110 + S.sun * 250, sunY = 345 - Math.sin(Math.PI * S.sun) * 175;
    const moonX = 110 + S.moon * 250, moonY = 330 - Math.sin(Math.PI * S.moon) * 150;
    tr(R.sun, `translate(${n2(sunX)} ${n2(sunY)})`);
    tr(R.moon, `translate(${n2(moonX)} ${n2(moonY)})`);
    op(R.stars, 1 - S.day); op(R.lit, 1 - S.day); op(R.dawn, S.dawn);
    const sunLight = S.day * Math.sin(Math.PI * S.sun), moonLight = (1 - S.day) * Math.sin(Math.PI * S.moon) * 0.8;
    const shift = (235 - (sunLight > moonLight ? sunX : moonX)) * 0.9;
    put(R.beam, 'd', `M146 366 L334 366 L${n2(334 + shift)} 560 L${n2(146 + shift)} 560 Z`);
    op(R.beam, Math.max(sunLight, moonLight));

    // clocks
    const min = clockAt(loop, local), now = hhmm(min);
    tr(R.hourHand, `rotate(${n2((min * 0.5) % 360)} 470 214)`);
    tr(R.minHand, `rotate(${n2((min % 60) * 6)} 470 214)`);
    text(R.digits, now);
    tr(R.alarm, S.alarm > 0.01 ? `rotate(${n2(S.alarm * 7 * Math.sin(t * 55))} 484 467)` : 'rotate(0)');
    op(R.ring, S.alarm);

    // bed, table, desk
    op(R.blanketOn, 1 - S.blanket); op(R.blanketOff, S.blanket);
    tr(R.blanketOn, `translate(0 ${n2(Math.sin(t * 1.4) * 0.8)})`);
    tr(R.rice, `translate(0 ${n2(424 * (1 - S.rice))}) scale(1 ${n2(S.rice)})`);
    const s1 = (t * 0.6) % 1, s2 = (t * 0.6 + 0.5) % 1;
    tr(R.steamA, `translate(0 ${n2(-s1 * 8)})`); op(R.steamA, Math.sin(Math.PI * s1) * 0.8 * Math.min(1, S.rice * 2 - 0.6));
    tr(R.steamB, `translate(0 ${n2(-s2 * 8)})`); op(R.steamB, Math.sin(Math.PI * s2) * 0.7);
    const fan = (t * 400) % 360;
    tr(R.fanA, `rotate(${n2(fan)} 1151 478)`); tr(R.fanB, `rotate(${n2(-fan)} 1151 520)`);
    op(R.wheel, S.wheel);
    tr(R.wheel, `translate(962 420) scale(${n2(0.6 + 0.4 * S.wheel)}) translate(-962 -420)`);

    // light
    op(R.monGlow, S.mon * (1 - 0.65 * S.day));
    const tm = Math.round(S.tMode);
    const flicker = tm === 2 || tm >= 5 ? 0.82 + 0.18 * Math.sin(t * 7.3) * Math.sin(t * 2.9) : 1;
    op(R.tvGlow, S.tv * flicker * (1 - 0.6 * S.day));
    op(R.pcGlow, (0.3 + 0.5 * S.mon) * (1 - 0.6 * S.day));
    op(R.floorGlow, S.lampF); op(R.floorBulb, S.lampF); op(R.bedGlow, S.lampB);

    // the monitor
    op(R.monOn, S.mon);
    const mm = Math.round(S.mMode);
    op(R.mCode, mm === 1); op(R.mJunk, mm === 2); op(R.mPass, mm === 3); op(R.mRace, mm === 4); op(R.mAim, mm === 5);
    const typed = S.code * CODE.length, step = Math.floor(typed * 8);
    if (step !== code) {
      code = step;
      const whole = Math.floor(typed);
      for (const l of lines) put(l.r, 'width', n2(l.i < whole ? l.w : l.i === whole ? l.w * (typed % 1) : 0));
      tr(R.code, `translate(0 ${n2(-Math.max(0, whole - 10) * CODE_STEP)})`);
    }
    if (mm === 4) { tr(R.raceDash, `translate(0 ${n2((t * 40) % 12)})`); op(R.raceWin, 0.45 + 0.55 * S.flash); }
    if (mm === 5) { tr(R.cross, `translate(${n2(1077 + 30 * Math.sin(t * 1.7))} ${n2(344 + 8 * Math.sin(t * 2.3))})`); op(R.aimWin, S.flash); }

    // the TV
    op(R.tvOn, S.tv);
    op(R.tMenu, tm === 1); op(R.tShow, tm === 2); op(R.tNext, tm === 3); op(R.tStill, tm === 4); op(R.tBall, tm === 5); op(R.tJump, tm === 6);
    if (tm === 1) put(R.tSel, 'x', String(1477.5 + Math.min(3, Math.floor(S.tT * 4)) * 25));
    if (tm === 2) { put(R.tProg, 'width', n2(98 * S.tT)); tr(R.tFig, `translate(${n2(Math.sin(t * 1.3) * 6)} 0)`); }
    if (tm === 3) text(R.tCount, String(Math.max(0, Math.ceil(5 * (1 - S.tT)))));
    if (tm === 5) {
      players.forEach((p, i) => {
        put(p, 'cx', n2((i < 3 ? 1500 : 1554) + (i % 3) * 6 + Math.sin(t * 1.1 + i) * 10));
        put(p, 'cy', n2(314 + (i % 3) * 17 + Math.cos(t * 0.9 + i * 1.7) * 6));
      });
      const goal = S.flash;
      put(R.tBallDot, 'cx', n2((1527 + Math.sin(t * 1.6) * 36) * (1 - goal) + 1572 * goal));
      put(R.tBallDot, 'cy', n2(332 + Math.sin(t * 2.7) * 14 * (1 - goal)));
      op(R.tGoal, S.flash);
    }
    if (tm === 6) {
      tr(R.tBlocks, `translate(${n2(-((t * 22) % 48))} 0)`);
      tr(R.tHero, `translate(0 ${n2(-Math.abs(Math.sin(t * 3.2)) * 16)})`);
      op(R.tClear, S.flash);
    }

    // me: the pose, blended into a walk cycle as I walk (the stride follows the distance, so feet don't slide)
    const w = S.walk, ph = (S.x * S.face) / 22, sn = Math.sin(ph), cs = Math.cos(ph);
    const stride: Partial<Record<string, number>> = {
      thighN: -24 * sn, shinN: 6 + 26 * Math.max(0, cs), thighF: 24 * sn, shinF: 6 + 26 * Math.max(0, -cs),
      uarmN: 16 * sn, farmN: -14, uarmF: -16 * sn, farmF: -14, spine: 3,
    };
    for (const { k } of joints) angle[k] = S[k as keyof State] * (1 - w) + (stride[k] ?? 0) * w;
    angle.spine += Math.sin(t * 1.7) * 0.8 + S.sway * 5 * Math.sin(t * 1.4);
    angle.head += S.chew * 2.5 * Math.sin(t * 13) - S.sway * 3 * Math.sin(t * 1.4 + 0.6);
    angle.farmN += S.type * 5 * Math.sin(t * 23);
    angle.farmF += S.type * 5 * Math.sin(t * 19 + 1.3);
    // hands stay level, so the spoon and the controller don't tip with the arm
    angle.handN = -(angle.spine + angle.uarmN + angle.farmN);
    angle.handF = -(angle.spine + angle.uarmF + angle.farmF);
    const bob = -2.5 * (1 - Math.abs(sn)) * w;
    tr(R.me, `translate(${n2(S.x)} ${n2(S.y + bob)}) rotate(${n2(S.rot)}) scale(${S.face} 1)`);
    for (const j of joints) tr(j.g, `translate(${j.ax} ${j.ay}) rotate(${n2(angle[j.k])})`);
    put(R.eye, 'ry', S.sleep > 0.5 || t % 3.9 < 0.12 ? '0.4' : '1.9');
    op(R.spoon, S.spoon); op(R.pad, S.pad); op(R.phone, S.phone); op(R.headset, S.headset);
    zs.forEach((z, i) => {
      const p = (t * 0.45 + i / 3) % 1;
      put(z, 'x', n2(150 + p * 26 + i * 4)); put(z, 'y', n2(410 - p * 46));
      op(z, S.sleep * Math.sin(Math.PI * p) * 0.8);
    });

    // the cat
    const cp = Math.round(S.cpose);
    tr(R.cat, `translate(${n2(S.cx)} ${n2(S.cy - Math.sin(Math.PI * S.hop) * 14)}) scale(${S.cface} 1)`);
    op(R.catSit, cp === 0); op(R.catWalk, cp === 1); op(R.catLoaf, cp === 2); op(R.catCurl, cp === 3);
    const frame = Math.floor(Math.abs(S.cx) / 9) % 2;
    op(R.legsA, frame === 0); op(R.legsB, frame === 1);
    tr(R.tailSit, `rotate(${n2(8 * Math.sin(t * 2.1))} -14 -4)`);
    tr(R.tailWalk, `rotate(${n2(6 * Math.sin(t * 5))} -24 -24)`);
    tr(R.tailHang, `rotate(${n2(4 * Math.sin(t * 1.6))} -38 -6)`);
    op(R.tailHang, S.chang); op(R.tailWrap, 1 - S.chang);
    const head = cp === 2 ? [31, -21] : [8, -44];
    const dx = (S.px - (S.cx + head[0] * S.cface)) * S.cface, dy = S.py - (S.cy + head[1]);
    const len = Math.hypot(dx, dy) || 1, look = Math.min(1.3, len / 60);
    const eyes = `translate(${n2((dx / len) * look)} ${n2((dy / len) * look * 0.6)})`;
    tr(R.pupS, eyes); tr(R.pupL, eyes);
    tr(R.heart, `translate(${n2(S.cx - 6 * S.cface)} ${n2(S.cy - 62 - S.heart * 10)})`); op(R.heart, S.heart);
    put(R.meow, 'x', n2(S.cx)); put(R.meow, 'y', n2(S.cy - (cp === 0 ? 70 : cp === 2 ? 48 : 38) - S.meow * 6)); op(R.meow, S.meow);

    // phones: the camera follows me across the room
    if (ui.narrow.on) {
      const target = Math.min(1000, Math.max(0, S.x - 300));
      // eases after me as I walk; jumps when I'm far off (a skip, or the first frame)
      cam = cam < 0 || Math.abs(target - cam) > 150 ? target : cam + (target - cam) * 0.12;
      put(svg, 'viewBox', `${n2(cam)} 150 600 430`);
    } else if (cam >= 0) { cam = -1; put(svg, 'viewBox', '0 120 1600 460'); }

    // the bar under the room
    const [, act, says] = doingAt(loop, local);
    const status = `${now.slice(0, 4)}0|${act}|${says}`;
    if (status !== shown) {
      shown = status;
      text(ui.time, `${now.slice(0, 4)}0`);
      text(ui.doing, says);
      ui.acts.forEach(b => b.setAttribute('aria-current', String(b.dataset.act === act)));
    }
  };
}
