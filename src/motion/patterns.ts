// Reusable GSAP moves. Call them inside useSectionMotion (a gsap.context), so
// every tween, ScrollTrigger and SplitText is reverted on unmount.
//
// Boundary rule: GSAP owns section wrappers and scroll-scrubbed motion. Magic UI
// (Motion) components are leaves: GSAP never targets them or their children.
//
// Only transform and opacity are animated, plus two cheap exceptions:
// clip-path masks and stroke-dashoffset on single SVG paths (DrawSVG).
import { gsap, ScrollTrigger, SplitText } from './gsap';
import { DUR, EASE, STAGGER } from './tokens';

type Target = gsap.TweenTarget;
type ST = ScrollTrigger.Vars;

const inView = (trigger: Element | string, extra?: ST): ST => ({ trigger, start: 'top 85%', once: true, ...extra });

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
      if (opts.timeline) return opts.timeline.from(parts, vars, opts.at ?? 0);
      if (opts.scrollTrigger !== false) vars.scrollTrigger = inView(el, opts.scrollTrigger || undefined);
      return gsap.from(parts, vars);
    },
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
