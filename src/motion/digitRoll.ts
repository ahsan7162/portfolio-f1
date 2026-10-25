import { gsap } from './gsap';
import { inView, type ST } from './reveals';
import { DUR, EASE } from './tokens';

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
