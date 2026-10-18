// Reusable GSAP moves. Call them inside useSectionMotion (a gsap.context), so
// every tween, ScrollTrigger and SplitText is reverted on unmount.
//
// Only transform and opacity are animated, plus two cheap exceptions:
// clip-path masks and stroke-dashoffset on single SVG paths (DrawSVG).
import { PALETTE } from '@/art/palette';
import { gsap, ScrollTrigger, SplitText } from './gsap';
import { finePointer } from './prefs';
import { DUR, EASE, STAGGER } from './tokens';

type Target = gsap.TweenTarget;
type ST = ScrollTrigger.Vars;

/** Every trigger made by inView, so an anchor jump can finish them (finishRevealsAbove). */
const reveals = new WeakSet<ST>();

/**
 * One-off reveal trigger. `fastScrollEnd`: when a visitor flings past, the reveal
 * jumps to its end instead of being left half played behind them. It plays the first
 * time it is reached or passed, then does nothing (ScrollTrigger's default toggle
 * actions are just "play"). Not `once`: a once trigger kills itself as it fires, and on
 * a page that loads already scrolled down (a #link) that happens while ScrollTrigger is
 * still measuring the triggers made in the same tick (timelines measure a tick late), so
 * its list shrinks under it and it throws.
 */
export const inView = (trigger: Element | string, extra?: ST): ST => {
  const vars: ST = { trigger, start: 'top 85%', fastScrollEnd: true, ...extra };
  reveals.add(vars);
  return vars;
};

/**
 * SplitText's aria mode for an element. 'auto' moves the text into an aria-label and hides
 * the pieces, but ARIA allows aria-label only where there is a role to name (a heading here):
 * on a span, p or div screen readers skip it, and the text would be lost. Those split with
 * 'none', and their markup does the reading: a lines-only split keeps words whole and stays
 * readable; a word or letter split is aria-hidden, with a screen-reader copy beside it.
 */
export const splitAria = (el: Element) => (/^H[1-6]$/.test(el.tagName) ? 'auto' : 'none');

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
    aria: splitAria(el),
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
    aria: splitAria(el),
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
    if (t.start > limit) return;
    if (t.animation && reveals.has(t.vars)) t.animation.progress(1);
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

/**
 * Red bar line reveal (landonorris.com's highlight bar, in our one red): line by line,
 * the text wipes in from the left with a red bar over it, and the bar then retracts to
 * the right. Kept to a few labels and the hero lede. Plays once on view, or on
 * `timeline` at `at`; `delay` waits before the first line (the site it comes from parses
 * a delay and drops it).
 */
export function barReveal(el: HTMLElement | null, opts: { delay?: number; scrollTrigger?: ST | false; timeline?: gsap.core.Timeline; at?: gsap.Position } = {}) {
  if (!el) return;
  SplitText.create(el, {
    type: 'lines',
    linesClass: 'bar-line',
    autoSplit: true,
    // Lines only, so words stay whole and readable; no aria-label on a <p>, where it is not allowed.
    aria: 'none',
    onSplit(self) {
      const st = opts.timeline || opts.scrollTrigger === false ? undefined : inView(el, { start: 'top 90%', ...opts.scrollTrigger });
      const tl = gsap.timeline({ delay: opts.delay ?? 0, scrollTrigger: st });
      self.lines.forEach((line, i) => {
        const bar = document.createElement('span');
        bar.className = 'bar-line-bar';
        bar.setAttribute('aria-hidden', 'true');
        line.appendChild(bar);
        const at = i * STAGGER.line * 2;
        tl.fromTo(line, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.wipe, ease: EASE.out, clearProps: 'clipPath' }, at)
          .fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: DUR.wipe, ease: EASE.wipe }, at + DUR.split);
      });
      // Returned so SplitText can revert it on a re-split (fonts, resize) and keep its progress.
      if (opts.timeline) opts.timeline.add(tl, opts.at ?? 0);
      return tl;
    },
  });
}

/**
 * Elliptical colour curtain (landonorris.com's image reveal): the element opens downward
 * through a widening oval while a red panel over it drains away through a second oval,
 * so a red curve sweeps down and lifts off. The panel is removed when it is done.
 * Returns a cleanup for onRevert.
 */
export function curtainReveal(el: HTMLElement | null, opts: { trigger?: Element; scrollTrigger?: ST; color?: string } = {}) {
  if (!el) return;
  const panel = document.createElement('span');
  panel.setAttribute('aria-hidden', 'true');
  Object.assign(panel.style, { position: 'absolute', inset: '0', zIndex: '1', pointerEvents: 'none', background: opts.color ?? PALETTE.ac });
  el.appendChild(panel);
  gsap.timeline({ scrollTrigger: opts.scrollTrigger ?? inView(opts.trigger ?? el), onComplete: () => panel.remove() })
    .fromTo(el, { clipPath: 'ellipse(120% 0% at 50% 0%)' }, { clipPath: 'ellipse(120% 120% at 50% 0%)', duration: DUR.reveal, ease: EASE.wipe, clearProps: 'clipPath' }, 0)
    .fromTo(panel, { clipPath: 'ellipse(120% 120% at 50% 100%)' }, { clipPath: 'ellipse(120% 0% at 50% 100%)', duration: DUR.wipe, ease: EASE.wipe }, DUR.reveal - 0.4);
  return () => panel.remove();
}

/** Scroll-linked drift. `scrub: true` keeps it locked to the page. */
export function scrubParallax(el: Target, trigger: Element, opts: { from?: gsap.TweenVars; to: gsap.TweenVars; start?: string; end?: string; scrub?: boolean | number }) {
  return gsap.fromTo(el, { ...opts.from }, {
    ...opts.to, ease: EASE.none,
    scrollTrigger: { trigger, start: opts.start ?? 'top bottom', end: opts.end ?? 'bottom top', scrub: opts.scrub ?? true },
  });
}

/**
 * Slot-machine digits: each digit strip rolls up to its value. Screen readers get a
 * plain copy of the text (an aria-label on a span isn't announced). Returns a restore
 * for onRevert in every mode; the original text is kept on the element, so a second
 * run (StrictMode, a rebuild) rolls the stat again instead of the strips.
 */
export function digitRoll(el: HTMLElement | null, opts: { delay?: number; timeline?: gsap.core.Timeline; at?: gsap.Position; scrollTrigger?: ST } = {}) {
  if (!el) return;
  const text = el.dataset.rollText ?? el.textContent ?? '';
  el.dataset.rollText = text;
  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  el.appendChild(sr);
  // restore plain text on revert so SSR markup and HMR stay clean
  const restore = () => { el.textContent = text; delete el.dataset.rollText; };
  const strips: { strip: HTMLElement; to: number }[] = [];
  for (const ch of text) {
    const win = document.createElement('span');
    win.setAttribute('aria-hidden', 'true');
    win.style.cssText = 'display:inline-block;overflow:hidden;height:1em;line-height:1;vertical-align:top;';
    if (ch >= '0' && ch <= '9') {
      // The window is as wide as its own final digit (a hidden copy sets it), not the
      // widest digit in the strip, so a narrow "1" doesn't leave a gap after it.
      win.style.position = 'relative';
      const size = document.createElement('span');
      size.style.visibility = 'hidden';
      size.textContent = ch;
      win.appendChild(size);
      const strip = document.createElement('span');
      strip.style.cssText = 'position:absolute;left:50%;top:0;translate:-50% 0;text-align:center;';
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
    return restore;
  }
  const tl = gsap.timeline({ delay: opts.delay ?? 0, scrollTrigger: opts.scrollTrigger ?? inView(el) });
  strips.forEach((s, i) => tl.to(s.strip, vars(i), i * 0.08));
  return restore;
}

/**
 * One-off reveals inside a scroll container (the dialogs). Not ScrollTrigger: it
 * keeps every scroller it has ever seen (each closed dialog would stay in memory)
 * and updates every page trigger on the container's scroll. `onEnter` gets each
 * batch that came into view, in page order, plus any target above it that a jump
 * or a fling skipped (so nothing stays hidden behind you); the top margin clears
 * the sticky dialog header. Returns a stop.
 */
export function revealWithin(root: HTMLElement, targets: Element[], onEnter: (batch: Element[]) => void, margin = '-64px 0px -8% 0px') {
  const pending = [...targets];
  const io = new IntersectionObserver(entries => {
    const seen = entries.filter(e => e.isIntersecting).map(e => pending.indexOf(e.target)).filter(i => i >= 0);
    if (!seen.length) return;
    const batch = pending.splice(0, Math.max(...seen) + 1);
    batch.forEach(t => io.unobserve(t));
    onEnter(batch);
  }, { root, rootMargin: margin });
  targets.forEach(t => io.observe(t));
  return () => io.disconnect();
}

/** Draw an SVG stroke (Lando's scribble lines). */
export function drawPath(path: Target, opts: { scrollTrigger?: ST; duration?: number; timeline?: gsap.core.Timeline; at?: gsap.Position } = {}) {
  const from = { drawSVG: '0%' }, to = { drawSVG: '100%', duration: opts.duration ?? DUR.show, ease: EASE.wipe };
  if (opts.timeline) return opts.timeline.fromTo(path, from, to, opts.at);
  return gsap.fromTo(path, from, { ...to, scrollTrigger: opts.scrollTrigger, ease: opts.scrollTrigger?.scrub ? EASE.none : EASE.wipe });
}

/**
 * Magnetic arrow: while the pointer is over `host`, `target` leans toward it
 * (quickTo, DUR.split) and settles back on leave. Fine pointers only. `pull`
 * defaults to the host's data-cursor-pull, so the cursor ring (Cursor.tsx)
 * and the arrow move as one. Returns a cleanup for onRevert.
 */
export function magnet(host: HTMLElement | null, target: HTMLElement | null, pull = Number(host?.dataset.cursorPull ?? 0.35)) {
  if (!host || !target || !finePointer()) return;
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
  if (!host || !finePointer()) return;
  const { radius = 220, skew = -12, spread = 10, active } = opts;
  const mix = gsap.utils.interpolate(PALETTE.fg, PALETTE.ac);
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
