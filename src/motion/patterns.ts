// Reusable GSAP moves. Call them inside useSectionMotion (a gsap.context), so
// every tween, ScrollTrigger and SplitText is reverted on unmount.
//
// Only transform and opacity are animated, plus two cheap exceptions:
// clip-path masks and stroke-dashoffset on single SVG paths (DrawSVG).
import { gsap, ScrollTrigger, SplitText } from './gsap';
import { isTouch } from './prefs';
import { DUR, EASE, STAGGER } from './tokens';

type Target = gsap.TweenTarget;
type ST = ScrollTrigger.Vars;

/**
 * One-off reveal trigger. `fastScrollEnd`: when a visitor flings past, the reveal
 * jumps to its end instead of being left half played behind them.
 */
export const inView = (trigger: Element | string, extra?: ST): ST => ({ trigger, start: 'top 85%', once: true, fastScrollEnd: true, ...extra });

/**
 * Whether a pinned block's content fits on screen. Pinning content taller than
 * the viewport cuts it off (landscape phones), so sections pin only when it fits.
 * Measured from the first child's top to the last child's bottom, plus padding,
 * against the stable viewport height (not 100dvh, which moves with the URL bar).
 */
export function fitsViewport(el: HTMLElement, extra = 0) {
  const first = el.firstElementChild, last = el.lastElementChild;
  if (!first || !last) return true;
  const s = getComputedStyle(el);
  const content = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
  return content + parseFloat(s.paddingTop) + parseFloat(s.paddingBottom) + extra <= document.documentElement.clientHeight;
}

/** Masked rise of lines, words or chars (Lando's headline reveal). */
export function splitReveal(
  el: HTMLElement | null,
  opts: { type?: 'lines' | 'words' | 'chars'; stagger?: number; duration?: number; delay?: number; scrollTrigger?: ST | false; timeline?: gsap.core.Timeline; at?: gsap.Position } = {},
) {
  if (!el) return;
  const type = opts.type ?? 'lines';
  const stagger = opts.stagger ?? (type === 'chars' ? STAGGER.char : type === 'words' ? STAGGER.word : STAGGER.line);
  SplitText.create(el, {
    type: type === 'lines' ? 'lines' : `lines,${type}`,
    mask: 'lines',
    linesClass: 'split-mask',
    autoSplit: true,
    aria: 'auto',
    onSplit(self) {
      const parts = type === 'chars' ? self.chars : type === 'words' ? self.words : self.lines;
      const vars: gsap.TweenVars = { yPercent: 115, duration: opts.duration ?? DUR.reveal, ease: EASE.out, stagger, delay: opts.delay ?? 0 };
      // Return the tween, not the timeline: SplitText reverts whatever onSplit returns
      // when it re-splits (fonts, resize), and that must not take the whole timeline with it.
      if (opts.timeline) { const tw = gsap.from(parts, vars); opts.timeline.add(tw, opts.at ?? 0); return tw; }
      if (opts.scrollTrigger !== false) vars.scrollTrigger = inView(el, opts.scrollTrigger || undefined);
      return gsap.from(parts, vars);
    },
  });
}

/**
 * The site's signature heading entrance: each letter pulls into its grid slot
 * from the right (sliding in, leaning back, fading up), locked to the scroll so
 * it also plays backwards on the way up. Lines are masked as in splitReveal.
 * Each letter keeps an ease-out curve inside the scrub, so it reads as a launch.
 */
export function gridSlot(el: HTMLElement | null, opts: { start?: string; end?: string; scrub?: number } = {}) {
  if (!el) return;
  SplitText.create(el, {
    type: 'lines,words,chars', // words too (kept whole), so lines never break inside a word
    mask: 'lines',
    linesClass: 'split-mask',
    wordsClass: 'split-word',
    autoSplit: true,
    aria: 'auto',
    onSplit: self => gsap.fromTo(self.chars, { xPercent: 60, skewX: -18, autoAlpha: 0 }, {
      // A wide stagger (each letter spans about half the range) so the word builds left to right.
      xPercent: 0, skewX: 0, autoAlpha: 1, ease: 'power2.out', duration: 1, stagger: { amount: 0.9 },
      scrollTrigger: { trigger: el, start: opts.start ?? 'top 95%', end: opts.end ?? 'top 60%', scrub: opts.scrub ?? 0.6 },
    }),
  });
}

/** Staggered rise for groups of items as they enter (replaces one-off observers). */
export function batchReveal(targets: string | Element[], opts: { y?: number; stagger?: number } = {}) {
  const els = gsap.utils.toArray<HTMLElement>(targets);
  if (!els.length) return;
  gsap.set(els, { autoAlpha: 0, y: opts.y ?? 32 });
  ScrollTrigger.batch(els, {
    start: 'top 88%',
    once: true,
    onEnter: batch => gsap.to(batch, { autoAlpha: 1, y: 0, stagger: opts.stagger ?? STAGGER.card, duration: DUR.reveal, ease: EASE.out, overwrite: true }),
  }).forEach(t => batchTriggers.add(t));
}

const batchTriggers = new WeakSet<ScrollTrigger>();

/**
 * Finish every one-off reveal that starts above `y` (plus what will be on
 * screen on landing), so a menu or anchor jump lands on a fully drawn section
 * instead of watching its reveals play after arriving.
 */
export function finishRevealsAbove(y: number) {
  const limit = y + window.innerHeight * 0.2;
  ScrollTrigger.getAll().forEach(t => {
    if (!t.vars.once || t.start > limit) return;
    if (t.animation) t.animation.progress(1);
    else if (batchTriggers.has(t)) { gsap.set(t.trigger!, { autoAlpha: 1, y: 0, overwrite: true }); t.kill(); }
  });
}

/** Wipe an element in with a clip-path, bottom to top by default. */
export function clipReveal(el: Target, opts: { from?: string; trigger?: Element; scrollTrigger?: ST; duration?: number } = {}) {
  return gsap.fromTo(el,
    { clipPath: opts.from ?? 'inset(100% 0% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: opts.duration ?? DUR.reveal, ease: EASE.wipe,
      scrollTrigger: opts.scrollTrigger ?? (opts.trigger ? inView(opts.trigger) : undefined) });
}

/** Scroll-linked drift. `scrub: true` keeps it locked to the page. */
export function scrubParallax(el: Target, trigger: Element, opts: { from?: gsap.TweenVars; to: gsap.TweenVars; start?: string; end?: string; scrub?: boolean | number }) {
  return gsap.fromTo(el, { ...opts.from }, {
    ...opts.to, ease: EASE.none,
    scrollTrigger: { trigger, start: opts.start ?? 'top bottom', end: opts.end ?? 'bottom top', scrub: opts.scrub ?? true },
  });
}

/** Slot-machine digits: each digit strip rolls up to its value. Keeps an aria-label. */
export function digitRoll(el: HTMLElement | null, opts: { delay?: number; timeline?: gsap.core.Timeline; at?: gsap.Position; scrollTrigger?: ST } = {}) {
  if (!el) return;
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const strips: { strip: HTMLElement; to: number }[] = [];
  for (const ch of text) {
    const win = document.createElement('span');
    win.setAttribute('aria-hidden', 'true');
    win.style.cssText = 'display:inline-block;overflow:hidden;height:1em;line-height:1;vertical-align:top;';
    if (ch >= '0' && ch <= '9') {
      const strip = document.createElement('span');
      strip.style.cssText = 'display:block;';
      for (let r = 0; r < 2; r++) for (let d = 0; d <= 9; d++) {
        const g = document.createElement('span');
        g.style.cssText = 'display:block;height:1em;line-height:1;';
        g.textContent = String(d);
        strip.appendChild(g);
      }
      win.appendChild(strip);
      strips.push({ strip, to: 10 + Number(ch) });
    } else {
      win.textContent = ch;
    }
    el.appendChild(win);
  }
  const vars = (i: number): gsap.TweenVars => ({ yPercent: -(strips[i].to * 100) / 20, duration: DUR.reveal, ease: EASE.out });
  if (opts.timeline) {
    strips.forEach((s, i) => opts.timeline!.to(s.strip, vars(i), typeof opts.at === 'number' ? opts.at + i * 0.08 : opts.at));
    return;
  }
  const tl = gsap.timeline({ delay: opts.delay ?? 0, scrollTrigger: opts.scrollTrigger ?? inView(el) });
  strips.forEach((s, i) => tl.to(s.strip, vars(i), i * 0.08));
  // restore plain text on revert so SSR markup and HMR stay clean
  return () => { el.textContent = text; };
}

/** Draw an SVG stroke (Lando's scribble lines). */
export function drawPath(path: Target, opts: { scrollTrigger?: ST; duration?: number; timeline?: gsap.core.Timeline; at?: gsap.Position } = {}) {
  const from = { drawSVG: '0%' }, to = { drawSVG: '100%', duration: opts.duration ?? DUR.show, ease: EASE.wipe };
  if (opts.timeline) return opts.timeline.fromTo(path, from, to, opts.at);
  return gsap.fromTo(path, from, { ...to, scrollTrigger: opts.scrollTrigger, ease: opts.scrollTrigger?.scrub ? EASE.none : EASE.wipe });
}

/**
 * Magnetic arrow: while the pointer is over `host`, `target` leans toward it
 * (quickTo, DUR.split) and settles back on leave. Fine pointers only.
 * Returns a cleanup for onRevert.
 */
export function magnet(host: HTMLElement | null, target: HTMLElement | null, pull = 0.35) {
  if (!host || !target || isTouch() || !window.matchMedia('(pointer: fine)').matches) return;
  const v = { duration: DUR.split, ease: EASE.out };
  const xTo = gsap.quickTo(target, 'x', v), yTo = gsap.quickTo(target, 'y', v);
  const move = (e: PointerEvent) => {
    const r = target.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * pull);
    yTo((e.clientY - (r.top + r.height / 2)) * pull);
  };
  const leave = () => { xTo(0); yTo(0); };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  return () => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); gsap.set(target, { clearProps: 'x,y' }); };
}

/**
 * Pointer proximity on split display type: letters near the cursor lean, part
 * slightly and warm to red, then settle when it leaves. Transforms and colour
 * only; letter centres are measured on enter (and again after scrolling), not
 * per move. Desktop, fine pointer only. Returns a cleanup.
 */
export function proximityChars(host: HTMLElement | null, lines: HTMLElement[], opts: { radius?: number; skew?: number; spread?: number; active?: () => boolean } = {}) {
  if (!host || isTouch() || !window.matchMedia('(pointer: fine)').matches) return;
  const { radius = 220, skew = -12, spread = 10, active } = opts;
  const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#f4f4ed';
  const ac = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#ff2438';
  const mix = gsap.utils.interpolate(fg, ac);
  type C = { el: HTMLElement; cx: number; cy: number; skew: (v: number) => void; x: (v: number) => void; heat: (v: number) => void };
  let chars: C[] = [], measuredAt = -1;
  const v = { duration: DUR.wipe, ease: EASE.out };
  const collect = () => {
    // SplitText may have re-split (fonts, resize): the leaves are the current letters.
    const els = lines.flatMap(l => [...l.querySelectorAll<HTMLElement>('*')].filter(n => !n.children.length && n.textContent?.trim()));
    if (els.length !== chars.length || els.some((el, i) => chars[i].el !== el)) {
      chars = els.map(el => {
        const h = { v: 0 };
        return { el, cx: 0, cy: 0, skew: gsap.quickTo(el, 'skewX', v), x: gsap.quickTo(el, 'x', v),
          heat: gsap.quickTo(h, 'v', { ...v, onUpdate: () => { el.style.color = h.v > 0.01 ? mix(h.v) : ''; } }) };
      });
      measuredAt = -1;
    }
    if (measuredAt !== scrollY) {
      chars.forEach(c => { const r = c.el.getBoundingClientRect(); c.cx = r.left + r.width / 2 - (gsap.getProperty(c.el, 'x') as number); c.cy = r.top + r.height / 2 + scrollY; });
      measuredAt = scrollY;
    }
  };
  const leave = () => chars.forEach(c => { c.skew(0); c.x(0); c.heat(0); });
  let hot = false;
  const move = (e: PointerEvent) => {
    // Paused (e.g. while the hero scrolls away): settle once, then ignore the pointer.
    if (active && !active()) { if (hot) { hot = false; leave(); } return; }
    hot = true;
    collect();
    const py = e.clientY + scrollY;
    chars.forEach(c => {
      const dx = c.cx - e.clientX, d = Math.hypot(dx, c.cy - py);
      const k = Math.max(0, 1 - d / radius), heat = k * k * (3 - 2 * k); // smoothstep
      c.skew(skew * heat);
      c.x(Math.sign(dx) * spread * heat);
      c.heat(heat);
    });
  };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  return () => {
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', leave);
    chars.forEach(c => { gsap.set(c.el, { clearProps: 'x,skewX,color' }); });
  };
}
