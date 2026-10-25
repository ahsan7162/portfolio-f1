// Text reveals on SplitText: the pieces are re-split when the fonts or the width change.
import { gsap, SplitText } from './gsap';
import { inView, type ST } from './reveals';
import { DUR, EASE, STAGGER } from './tokens';

/**
 * SplitText's aria mode for an element. 'auto' moves the text into an aria-label and hides
 * the pieces, but ARIA allows aria-label only where there is a role to name (a heading here):
 * on a span, p or div screen readers skip it, and the text would be lost. Those split with
 * 'none', and their markup does the reading: a lines-only split keeps words whole and stays
 * readable; a word or letter split is aria-hidden, with a screen-reader copy beside it.
 */
export const splitAria = (el: Element) => (/^H[1-6]$/.test(el.tagName) ? 'auto' : 'none');

/** Masked rise of lines, words or chars. */
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

/**
 * Red bar line reveal: line by line, the text wipes in from the left under a red bar, which
 * then retracts to the right. Plays once on view, or on `timeline` at `at`; `delay` waits
 * before the first line.
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
