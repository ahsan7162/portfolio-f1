// The film layer of the bb Dashboards demo: what a playing scene adds on top of the product so it reads
// as a short film. A camera, the program streaming in, the light line that checks it, parts that grow out
// of their lines, colour that ripples out from the click, a pulse from Send to the chart, the versions deck.
// Elements in, tweens out: the demo tracks every tween that touches the dashboard, so a take-over lands it.
import { gsap } from '../motion';
import { build } from './DashView';
import { box, mid } from './film';

const em = (win: HTMLElement) => parseFloat(getComputedStyle(win).fontSize) || 15;
const all = <T extends Element = HTMLElement>(el: ParentNode, s: string) => [...el.querySelectorAll<T>(s)];

/** Where a scene's program sits: centred on the empty panel (Build), or low on the trend chart (Change). */
export function place(code: HTMLElement, win: HTMLElement) {
  const e = em(win);
  const empty = win.querySelector('.dsd-empty');
  const trend = win.querySelector('.dsd-card[data-flip-id="t"]');
  if (code.dataset.for === 'build' && empty) {
    const b = box(empty, win);
    gsap.set(code, { left: b.x + Math.max(e, (b.w - code.offsetWidth) / 2), top: b.y + (b.h - code.offsetHeight) / 2 });
  } else if (trend) {
    const b = box(trend, win);
    gsap.set(code, { left: b.x + e, top: b.y + b.h - code.offsetHeight - e });
  }
}

/** The agent's program arrives: its panel, then each line typed out. Returns the time it is done. */
export function stream(tl: gsap.core.Timeline, code: HTMLElement, win: HTMLElement, t: number) {
  tl.call(() => place(code, win), [], t);
  tl.fromTo(all(code, '.dsd-code-bg, .dsd-code-title'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.06, immediateRender: false }, t);
  let at = t + 0.3;
  for (const line of all(code, '.dsd-line')) {
    const text = line.querySelector('.dsd-line-t');
    const n = text?.textContent.length ?? 20;
    const d = Math.min(0.6, n * 0.0095);
    tl.set(line, { autoAlpha: 1 }, at);
    if (text) tl.fromTo(text, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: d, ease: `steps(${Math.ceil(n / 2)})`, immediateRender: false }, at);
    at += d * 0.55;
  }
  return at + 0.3;
}

/** A light line runs down the program and ticks each line as it passes: checked. Returns the time it is done. */
export function scan(tl: gsap.core.Timeline, code: HTMLElement, t: number) {
  const lines = all(code, '.dsd-line');
  const light = code.querySelector('.dsd-scan');
  const d = 0.32 + lines.length * 0.14;
  if (light) {
    tl.fromTo(light, { autoAlpha: 1, y: () => (lines[0]?.offsetTop ?? 0) - 6 }, {
      y: () => { const l = lines.at(-1); return l ? l.offsetTop + l.offsetHeight + 4 : 0; }, duration: d, ease: 'power1.inOut', immediateRender: false,
    }, t).to(light, { autoAlpha: 0, duration: 0.2 }, t + d - 0.05);
  }
  lines.forEach((l, i) => {
    const at = t + (d * (i + 0.7)) / lines.length;
    tl.fromTo(l, { '--lit': 0 }, { '--lit': 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, at);
    const tick = l.querySelector('.dsd-line-ok');
    if (tick) tl.fromTo(tick, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2.6)', immediateRender: false }, at);
  });
  const ok = code.querySelector('.dsd-code-ok');
  if (ok) tl.fromTo(ok, { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, t + d);
  return t + d + 0.2;
}

/**
 * One line of the program becomes its part: the line flies to the part's corner, and the part grows out of
 * it (its clip from the line's box to the whole card), then fills in. A part with no card (the root, the
 * title) just takes the line in.
 */
function grow(win: HTMLElement, line: HTMLElement, part: HTMLElement, card: boolean) {
  const e = em(win);
  const L = box(line, win);
  const C = box(part, win);
  // first the line folds down to its statement's name, a small chip: that chip is what travels
  const name = line.querySelector<HTMLElement>('.dsd-line-t b');
  const cw = Math.min(L.w, name ? name.offsetLeft + name.offsetWidth + 0.6 * e : L.w);
  const r = (n: number) => `round ${(n * e).toFixed(1)}px`;
  const tl = gsap.timeline();
  tl.to(all(line, '.dsd-line-rest, .dsd-line-ok'), { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0)
    .fromTo(line, { clipPath: `inset(0px 0px 0px 0px ${r(0.4)})` }, { clipPath: `inset(0px ${L.w - cw}px 0px 0px ${r(0.4)})`, duration: 0.35, ease: 'power3.inOut' }, 0);
  if (!card) {
    // the root's chip goes into the title, which takes over from it
    return tl.to(line, { x: C.x - L.x, y: C.y + (C.h - L.h) / 2 - L.y, duration: 0.6, ease: 'power3.inOut' }, 0.2)
      .to(line, { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0.65)
      .fromTo(part, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'none' }, 0.7);
  }
  // the chip lands in the middle of its card, then the card opens out of the chip's box, lit, and fills in
  const [x, y] = [C.x + (C.w - cw) / 2, C.y + (C.h - L.h) / 2];
  // x and y on different curves, so each chip travels on an arc and chips that cross do not run together
  tl.to(line, { x: x - L.x, duration: 0.6, ease: 'power3.inOut' }, 0.2)
    .to(line, { y: y - L.y, duration: 0.6, ease: 'power2.in' }, 0.2)
    .to(line, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 0.85)
    .fromTo(part, { autoAlpha: 0, '--tint': 1, clipPath: `inset(${y - C.y}px ${C.x + C.w - x - cw}px ${C.y + C.h - y - L.h}px ${x - C.x}px ${r(0.4)})` },
      { autoAlpha: 1, duration: 0.05, ease: 'none' }, 0.78)
    .to(part, { clipPath: `inset(0px 0px 0px 0px ${r(0.7)})`, duration: 0.8, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.8)
    .to(part, { '--tint': 0, duration: 0.9, ease: 'power2.in' }, 1.3)
    .add(build(part, false), 1.15);
  return tl;
}

/** Build: every line of the program becomes the part it describes, and the filters arrive. About 2 s. */
export function assemble(win: HTMLElement) {
  const tl = gsap.timeline();
  const code = win.querySelector<HTMLElement>('.dsd-code[data-for="build"]');
  if (!code) return tl;
  tl.to(all(code, '.dsd-code-bg, .dsd-code-title, .dsd-code-ok'), { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, 0);
  all(code, '.dsd-line').forEach((line, i) => {
    const id = line.dataset.part;
    const part = win.querySelector<HTMLElement>(id ? `.dsd-card[data-flip-id="${id}"]` : '.dsd-head-title h3');
    if (part) tl.add(grow(win, line, part, !!id), 0.05 + i * 0.16);
  });
  const filters = win.querySelector('.dsd-filters');
  if (filters) tl.fromTo(filters, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'none' }, 0.9);
  return tl;
}

/**
 * Change: the new card grows out of its line, a light runs once round its border, and a glowing head
 * rides the leading edge of its line as it draws.
 */
export function arrive(win: HTMLElement, card: HTMLElement) {
  const tl = gsap.timeline();
  const code = win.querySelector<HTMLElement>('.dsd-code[data-for="change"]');
  const line = code?.querySelector<HTMLElement>('.dsd-line');
  if (code && line) {
    tl.to(all(code, '.dsd-code-bg, .dsd-code-title, .dsd-code-ok'), { autoAlpha: 0, duration: 0.35 }, 0);
    tl.add(grow(win, line, card, true), 0.1);
  } else {
    tl.add(build(card), 0.2);
  }
  const trace = card.querySelector<HTMLElement>('.dsd-trace');
  if (trace) tl.add(traceRound(trace, card.querySelector('.dsd-trace-dot'), card), 0.75);
  const head = card.querySelector<HTMLElement>('.dsd-ride');
  if (head) tl.add(ride(head, card), 0.9);
  return tl;
}

/** A light once round a card's border: a conic reveal of an accent outline, a bright dot at its tip. */
function traceRound(trace: HTMLElement, dot: Element | null, card: HTMLElement) {
  const [w, h] = [card.offsetWidth, card.offsetHeight];
  const o = { a: 0 };
  // the point where a ray from the centre at angle a (0 = up, clockwise) leaves the card
  const edge = (a: number) => {
    const [dx, dy] = [Math.sin((a * Math.PI) / 180), -Math.cos((a * Math.PI) / 180)];
    const t = Math.min(w / 2 / (Math.abs(dx) || 1e-6), h / 2 / (Math.abs(dy) || 1e-6));
    return { x: w / 2 + dx * t, y: h / 2 + dy * t };
  };
  return gsap.timeline()
    .set(trace, { autoAlpha: 1, '--a': '0deg' })
    .to(o, {
      a: 360, duration: 1.1, ease: 'power1.inOut',
      onUpdate: () => {
        trace.style.setProperty('--a', `${o.a}deg`);
        if (dot) { const p = edge(o.a); gsap.set(dot, { x: p.x, y: p.y, autoAlpha: o.a < 352 ? 1 : 0 }); }
      },
      onComplete: () => { if (dot) gsap.set(dot, { autoAlpha: 0 }); },
    })
    .to(trace, { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, '+=0.15');
}

/** A glowing head on the leading edge of a line as it draws: it reads the draw's own clip, so it never drifts from it. */
function ride(head: HTMLElement, card: HTMLElement) {
  const svg = card.querySelector<SVGSVGElement>('.dsd-svg.dsd-draw');
  const path = svg?.querySelector<SVGPathElement>('.dsd-stroke');
  const plot = card.querySelector<HTMLElement>('.dsd-plot');
  if (!svg || !path || !plot) return gsap.timeline();
  // y along the line for x from 0 to 100, in the plot's own units
  const len = path.getTotalLength();
  const pts = Array.from({ length: 81 }, (_, i) => path.getPointAtLength((len * i) / 80));
  const yAt = (x: number) => {
    const j = pts.findIndex((p) => p.x >= x);
    if (j <= 0) return (j === 0 ? pts[0] : pts.at(-1))?.y ?? 50;
    const [a, b] = [pts[j - 1], pts[j]];
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  };
  const [px, py, pw, ph] = [plot.offsetLeft, plot.offsetTop, plot.offsetWidth, plot.offsetHeight];
  const seen = () => {
    const m = /inset\(\S+ ([\d.]+)%/.exec(svg.style.clipPath);
    return m ? 1 - Number(m[1]) / 100 : 1;
  };
  let peak = 0;
  return gsap.timeline()
    .fromTo(head, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
    .to({}, {
      duration: 1.3,
      onUpdate: () => {
        peak = Math.max(peak, seen());
        gsap.set(head, { x: px + peak * pw, y: py + (yAt(peak * 100) / 100) * ph });
      },
    }, 0)
    .to(head, { autoAlpha: 0, scale: 2.2, duration: 0.45, ease: 'power2.in' }, 1.15);
}

/** Colour: the new colour ripples out from the click. Each part takes it as the ring reaches it (its delay is its distance). */
export function ripple(win: HTMLElement, from: Element, speed: number) {
  const W = win.getBoundingClientRect();
  const k = W.width / win.offsetWidth || 1;
  const o = (() => { const r = from.getBoundingClientRect(); return { x: (r.left + r.width / 2 - W.left) / k, y: (r.top + r.height / 2 - W.top) / k }; })();
  for (const p of all(win, '.dsd-tile, .dsd-card:not(.dsd-card--kpis), .dsd-hbar, .dsd-legend li, .dsd-col')) {
    const r = p.getBoundingClientRect();
    const [x0, y0, x1, y1] = [(r.left - W.left) / k, (r.top - W.top) / k, (r.right - W.left) / k, (r.bottom - W.top) / k];
    // the nearest point of the part to the click: colour arrives when the ring touches it
    const d = Math.hypot(Math.max(x0 - o.x, 0, o.x - x1), Math.max(y0 - o.y, 0, o.y - y1));
    (p as HTMLElement | SVGElement).style.setProperty('--rip', `${Math.round(d / speed)}ms`);
  }
  const wave = win.querySelector<HTMLElement>('.dsd-wave');
  if (!wave) return gsap.timeline();
  const R = Math.max(...[[0, 0], [win.offsetWidth, 0], [0, win.offsetHeight], [win.offsetWidth, win.offsetHeight]].map(([x, y]) => Math.hypot(x - o.x, y - o.y)));
  const d = R / speed / 1000;
  gsap.set(wave, { width: 2 * R, height: 2 * R, left: o.x - R, top: o.y - R });
  return gsap.timeline()
    .fromTo(wave, { autoAlpha: 1, scale: 0.002 }, { scale: 1, duration: d, ease: 'none' }, 0)
    .to(wave, { autoAlpha: 0, duration: d * 0.45, ease: 'power1.in' }, d * 0.55);
}

/** Edit: Send fires a pulse that travels from the button to the chart, and bursts there. */
export function pulse(win: HTMLElement, from: { x: number; y: number }, to: Element) {
  const [dot, tail, burst] = ['.dsd-pulse', '.dsd-pulse-tail', '.dsd-burst'].map((s) => win.querySelector<HTMLElement>(s));
  const tl = gsap.timeline();
  if (!dot || !tail || !burst) return tl;
  const b = mid(box(to, win));
  const [dx, dy] = [b.x - from.x, b.y - from.y];
  const dist = Math.hypot(dx, dy);
  gsap.set(tail, { width: dist, left: from.x, top: from.y, rotation: (Math.atan2(dy, dx) * 180) / Math.PI, transformOrigin: '0% 50%' });
  return tl
    .fromTo(dot, { autoAlpha: 1, x: from.x, y: from.y, scale: 0.5 }, { x: b.x, y: b.y, scale: 1, duration: 0.55, ease: 'power2.inOut' }, 0)
    .fromTo(tail, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: 'power2.inOut' }, 0)
    .set(tail, { transformOrigin: '100% 50%' }, 0.55)
    .to(tail, { scaleX: 0, duration: 0.35, ease: 'power2.out' }, 0.55)
    .to(dot, { autoAlpha: 0, scale: 2.6, duration: 0.4, ease: 'power2.out' }, 0.55)
    .fromTo(burst, { autoAlpha: 1, x: b.x, y: b.y, scale: 0.15 }, { scale: 1.2, autoAlpha: 0, duration: 0.8, ease: 'power2.out' }, 0.5);
}

/** A saved version joins the deck behind the window: every sheet moves up one place and the new one rises in. */
export function joinDeck(deck: HTMLElement, delay: number) {
  const sheets = all(deck, '.dsd-sheet');
  if (!sheets.length) return gsap.timeline();
  const step = parseFloat(getComputedStyle(deck).getPropertyValue('--step')) * em(deck);
  const newest = sheets.at(-1);
  const tl = gsap.timeline({ delay });
  tl.fromTo(sheets, { y: step }, { y: 0, duration: 0.8, ease: 'expo.out', clearProps: 'transform' }, 0);
  if (newest) tl.fromTo(newest, { '--glint': 1 }, { '--glint': 0, duration: 1.2, ease: 'power2.in' }, 0.2);
  return tl;
}

/** A light sweeps once across the window. */
export function sweep(tl: gsap.core.Timeline, win: HTMLElement, t: number) {
  const band = win.querySelector('.dsd-sweep');
  if (band) tl.fromTo(band, { autoAlpha: 1, xPercent: -130 }, { xPercent: 430, duration: 1.05, ease: 'power2.inOut', immediateRender: false }, t).set(band, { autoAlpha: 0 }, t + 1.05);
}

/** Every film layer back to its CSS rest: hidden, unmoved. Their styles are all GSAP's, so clearing them all is safe. */
export function rest(root: HTMLElement) {
  const layers = all(root, '.dsd-cam, .dsd-film, .dsd-film *, .dsd-glow, .dsd-hand, .dsd-ring, .dsd-click, .dsd-empty span, .dsd-trace, .dsd-trace-dot, .dsd-ride');
  gsap.killTweensOf(layers);
  gsap.set(layers, { clearProps: 'all' });
  for (const e of all<HTMLElement | SVGElement>(root, '[style*="--rip"]')) e.style.removeProperty('--rip');
  // one frame with no CSS transitions, so nothing eases back from the scene before
  root.classList.add('dsd-cut');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('dsd-cut')));
}
