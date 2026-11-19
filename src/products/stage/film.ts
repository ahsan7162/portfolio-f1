// What the products' filmed scenes share: where a part sits in a demo's window, the camera that pushes in and
// tilts, and the drawn pointer that travels, presses and rings out a click. A demo marks its pointer's glow and
// click ring with `data-glow` and `data-click`.
import { gsap } from '../motion';

/** What the camera and the pointer need from a playing demo. */
export interface FilmApi {
  /** The drawn pointer. */
  hand: Element;
  /** The centre of the first element matching `sel`, in the window's own pixels. Aim while the camera is flat. */
  at: (sel: string) => { x: number; y: number };
  /** The window, and the camera that holds it. */
  win: HTMLElement;
  cam: HTMLElement;
  /** How far the camera moves: 1 on a wide screen, less on a phone. */
  amp: number;
}

export interface Box { x: number; y: number; w: number; h: number }

/** An element's box in the window's own pixels, from layout, so the camera and a card's lift never move it. */
export function box(el: Element, win: HTMLElement): Box {
  if (!(el instanceof HTMLElement)) {
    // SVG has no offsets: measure on screen and undo the camera's scale (it is flat whenever this runs)
    const w = win.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = w.width / win.offsetWidth || 1;
    return { x: (r.left - w.left) / k, y: (r.top - w.top) / k, w: r.width / k, h: r.height / k };
  }
  let [x, y] = [0, 0];
  for (let n: HTMLElement | null = el; n && n !== win; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const p = n.offsetParent as HTMLElement | null;
    if (p && p !== win) { x += p.clientLeft; y += p.clientTop; }
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
export const mid = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export interface Shot { s?: number; on?: string; rx?: number; ry?: number }

/**
 * The camera: scale, a slight tilt, and a push toward a part (`on`), which stays where it is while the frame
 * grows round it. Tilt only where nothing is measured: every aim and every change happens with it flat.
 */
export function camera(tl: gsap.core.Timeline, api: FilmApi) {
  const { cam, win } = api;
  const v = (sh: Shot) => {
    const s = 1 + ((sh.s ?? 1) - 1) * api.amp;
    const toward = (axis: 'x' | 'y') => () => {
      const el = sh.on ? win.querySelector(sh.on) : null;
      if (!el) return 0;
      const c = axis === 'x' ? cam.offsetWidth / 2 - win.offsetLeft : cam.offsetHeight / 2 - win.offsetTop;
      return (1 - s) * (mid(box(el, win))[axis] - c);
    };
    return { scale: s, x: toward('x'), y: toward('y'), rotationX: (sh.rx ?? 0) * api.amp, rotationY: (sh.ry ?? 0) * api.amp, transformPerspective: 2200 };
  };
  return {
    set: (sh: Shot, t: number) => tl.set(api.cam, v(sh), t),
    to: (sh: Shot, t: number, d: number, ease = 'power2.inOut') => tl.to(api.cam, { ...v(sh), duration: d, ease }, t),
  };
}

/** The pointer: it travels on a slight curve and leans as it goes; a press squeezes it and rings out a click. Times are absolute. */
export function pointer(tl: gsap.core.Timeline, api: FilmApi) {
  const glow = api.win.querySelector('[data-glow]');
  const click = api.win.querySelector('[data-click]');
  const both = glow ? [api.hand, glow] : [api.hand];
  const move = (sel: string, t: number, d: number) => {
    tl.to(both, { x: () => api.at(sel).x, duration: d, ease: 'power3.inOut' }, t)
      .to(both, { y: () => api.at(sel).y, duration: d, ease: 'sine.inOut' }, t)
      .to(api.hand, { rotation: -11, duration: d * 0.4, ease: 'power2.out' }, t)
      .to(api.hand, { rotation: 0, duration: d * 0.6, ease: 'back.out(2.2)' }, t + d * 0.4);
  };
  return {
    enter: (sel: string, t: number) => tl.fromTo(both, { x: () => api.at(sel).x + 70, y: () => api.at(sel).y + 90 }, { duration: 0.01, immediateRender: false }, t)
      .fromTo(api.hand, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, t),
    move,
    /** Arrive at `sel` by time `t`, press, and do what the press does. */
    press: (sel: string, t: number, run: () => void, d = 0.5) => {
      move(sel, t - d, d);
      tl.to(api.hand, { scale: 0.8, duration: 0.07, ease: 'power1.in', yoyo: true, repeat: 1 }, t);
      if (click) {
        tl.fromTo(click, { x: () => Number(gsap.getProperty(api.hand, 'x')), y: () => Number(gsap.getProperty(api.hand, 'y')), scale: 0.3, autoAlpha: 0.9 },
          { scale: 1.7, autoAlpha: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, t + 0.04);
      }
      tl.call(run, [], t + 0.07);
    },
    leave: (t: number) => tl.to(api.hand, { autoAlpha: 0, duration: 0.3 }, t),
  };
}
