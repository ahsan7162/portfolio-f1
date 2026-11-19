// What a playing Jira Board scene adds over the product: Jira tabs crushed into bb's rail, the giant keycap that
// presses each key, and a note the camera points at. rest() puts every film layer back to its CSS state when the
// visitor takes over. Elements in, tweens out: the demo keeps every tween, so a take-over lands it on its end.
import { gsap } from '../motion';

const FILM = '.jbd-cam, .jbd-hand, [data-glow], [data-click], .jbf-tabs, .jbf-tab, .jbf-count, .jbf-railglow, .jbf-note, .jbf-key, .jbf-keylog, .jbd-list-in, .jbd-list .jbd-sec';

/** Every film layer at its CSS rest, the camera flat: the demo is whole the moment the visitor takes over. */
export function rest(root: Element) {
  gsap.set(root.querySelectorAll(FILM), { clearProps: 'all' });
  root.querySelector('.jbf-keylog')?.replaceChildren();
  for (const el of root.querySelectorAll('.jbf-key b, .jbf-key small')) el.textContent = '';
  const n = root.querySelector('.jbf-count b');
  if (n) n.textContent = String(root.querySelectorAll('.jbf-tab').length);
  const word = root.querySelector('.jbf-count span');
  if (word) word.textContent = 'tabs';
}

/**
 * Scene 1: the tab strip covers the panel's top; from `t0` its tabs close one by one from the rail's side, faster
 * and faster, while the count falls to 1 and the rail's My Tickets glows. Then the strip goes and the list drops in.
 * Returns when the list has landed.
 */
export function crush(tl: gsap.core.Timeline, root: Element, t0: number) {
  const strip = root.querySelector('.jbf-tabs');
  const tabs = [...root.querySelectorAll<HTMLElement>('.jbf-tab')];
  const count = root.querySelector('.jbf-count');
  const n = count?.querySelector('b');
  const word = count?.querySelector('span');
  const glow = root.querySelector('.jbf-railglow');
  const list = root.querySelector('.jbd-list-in');
  if (!strip || !count || !n || !glow || !list) return t0;
  tl.set([strip, count], { autoAlpha: 1 }, 0);
  // the list waits behind the tabs, out of focus, and sharpens as they close
  tl.set(list, { filter: 'blur(9px)', autoAlpha: 0.3, scale: 0.985, transformOrigin: '50% 0%' }, 0);
  tl.fromTo(count, { scale: 0.85 }, { scale: 1, duration: 0.6, ease: 'back.out(2)' }, 0.2);
  tl.fromTo(tabs, { yPercent: 105 }, { yPercent: 0, stagger: 0.04, duration: 0.4, ease: 'power3.out' }, 0.1);
  tl.fromTo(glow, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, t0 - 0.2);
  let t = t0;
  let gap = 0.4;
  tabs.forEach((tab, i) => {
    tl.to(tab, { width: 0, paddingInline: 0, marginRight: '-0.3em', autoAlpha: 0, x: '-1.5em', duration: Math.max(0.14, gap * 0.9), ease: 'power2.in' }, t);
    tl.call(() => { const left = Math.max(1, tabs.length - i - 1); n.textContent = String(left); if (word) word.textContent = left === 1 ? 'tab' : 'tabs'; }, [], t + 0.08);
    tl.fromTo(glow, { scale: 1.25 }, { scale: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, t + Math.max(0.14, gap * 0.9));
    t += gap;
    gap = Math.max(0.12, gap * 0.8);
  });
  tl.to(strip, { yPercent: -100, autoAlpha: 0, duration: 0.45, ease: 'power3.in' }, t);
  tl.to(count, { autoAlpha: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' }, t + 0.2);
  tl.to(list, { filter: 'blur(0px)', autoAlpha: 1, scale: 1, duration: t - t0 + 0.5, ease: 'power2.in' }, t0);
  tl.from(list.querySelectorAll(':scope > .jbd-sec'), { y: -18, stagger: 0.1, duration: 0.6, ease: 'power3.out' }, t + 0.2);
  tl.to(glow, { autoAlpha: 0, duration: 0.8 }, t + 1.3);
  return t + 0.9;
}

export interface Press { at: number; key: string; says: string }
/** The giant keycap beside the panel: it pops in, then each key presses it, its face and caption change, and the log under it fills. */
export function keycap(tl: gsap.core.Timeline, root: Element, keys: Press[], t0: number) {
  const cap = root.querySelector('.jbf-key');
  const face = cap?.querySelector('b');
  const say = cap?.querySelector('small');
  const log = root.querySelector('.jbf-keylog');
  if (!cap || !face || !say || !log) return;
  const spans = keys.map((k) => Object.assign(document.createElement('span'), { textContent: k.key }));
  log.replaceChildren(...spans);
  tl.call(() => { face.textContent = keys[0].key; say.textContent = keys[0].says; }, [], t0);
  tl.fromTo(cap, { autoAlpha: 0, scale: 0.7, rotation: -8 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.8)' }, t0);
  tl.fromTo(log, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t0 + 0.15);
  keys.forEach((k, i) => {
    tl.call(() => {
      face.textContent = k.key;
      say.textContent = k.says;
      spans.forEach((s, j) => { s.dataset.k = j < i ? 'done' : j === i ? 'now' : ''; });
    }, [], k.at - 0.05);
    tl.to(cap, { y: '0.3em', scale: 0.97, duration: 0.06, ease: 'power2.in', yoyo: true, repeat: 1 }, k.at - 0.05);
  });
}

/** A note beside what the camera points at, with its left edge just past the element's right edge. */
export function note(tl: gsap.core.Timeline, root: Element, win: HTMLElement, sel: string, t: number, until: number) {
  const el = root.querySelector('.jbf-note');
  if (!el) return;
  const spot = () => {
    const box = win.getBoundingClientRect();
    const k = box.width / win.offsetWidth || 1;
    const r = win.querySelector(sel)?.getBoundingClientRect();
    return r ? { x: (r.right - box.left) / k + 14, y: (r.top - box.top) / k - 2 } : { x: 0, y: 0 };
  };
  tl.fromTo(el, { x: () => spot().x, y: () => spot().y, autoAlpha: 0, scale: 0.9, transformOrigin: '0% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, t);
  tl.to(el, { autoAlpha: 0, duration: 0.3 }, until);
}
