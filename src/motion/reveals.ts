// One-off and scroll-linked reveals. Call them inside useSectionMotion (a gsap.context),
// so every tween and ScrollTrigger is reverted on unmount. Only transform, opacity, clip-path
// and single SVG strokes (DrawSVG) are animated.
import { gsap, ScrollTrigger } from './gsap';
import { DUR, EASE, STAGGER } from './tokens';

export type Target = gsap.TweenTarget;
export type ST = ScrollTrigger.Vars;

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

/** Staggered rise for groups of items as they enter. */
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
 * Elliptical curtain: the element opens downward through a widening oval while a red panel
 * over it drains away through a second one. Returns a cleanup for onRevert.
 */
export function curtainReveal(el: HTMLElement | null, opts: { trigger?: Element; scrollTrigger?: ST; timeline?: gsap.core.Timeline; at?: number } = {}) {
  if (!el) return;
  const panel = document.createElement('span');
  panel.setAttribute('aria-hidden', 'true');
  Object.assign(panel.style, { position: 'absolute', inset: '0', zIndex: '1', pointerEvents: 'none', background: 'var(--ac)' });
  el.appendChild(panel);
  // On its own scroll trigger, or inside a caller's timeline at `at` (a reveal the caller times).
  const at = opts.timeline ? (opts.at ?? 0) : 0, lift = at + DUR.reveal - 0.4;
  (opts.timeline ?? gsap.timeline({ scrollTrigger: opts.scrollTrigger ?? inView(opts.trigger ?? el) }))
    .fromTo(el, { clipPath: 'ellipse(120% 0% at 50% 0%)' }, { clipPath: 'ellipse(120% 120% at 50% 0%)', duration: DUR.reveal, ease: EASE.wipe, clearProps: 'clipPath' }, at)
    .fromTo(panel, { clipPath: 'ellipse(120% 120% at 50% 100%)' }, { clipPath: 'ellipse(120% 0% at 50% 100%)', duration: DUR.wipe, ease: EASE.wipe, onComplete: () => panel.remove() }, lift);
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

/** Draw an SVG stroke. */
export function drawPath(path: Target, opts: { scrollTrigger?: ST; duration?: number; timeline?: gsap.core.Timeline; at?: gsap.Position } = {}) {
  const from = { drawSVG: '0%' }, to = { drawSVG: '100%', duration: opts.duration ?? DUR.show, ease: EASE.wipe };
  if (opts.timeline) return opts.timeline.fromTo(path, from, to, opts.at);
  return gsap.fromTo(path, from, { ...to, scrollTrigger: opts.scrollTrigger, ease: opts.scrollTrigger?.scrub ? EASE.none : EASE.wipe });
}
