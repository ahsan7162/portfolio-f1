import { useEffect } from 'react';
import { ensureGsap, gsap, SplitText } from './gsap';
import { finePointer, motionEnabled } from './prefs';
import { DUR, EASE, STAGGER } from './tokens';

type Prepared = { chars: Element[]; undo: () => void };

/**
 * Letter roll on links and buttons (landonorris.com's hover): the label's letters roll
 * up one after another and an identical copy rolls in from below. The copy is each
 * letter's own text-shadow, one line down, clipped by `.roll` (index.css), so there is
 * no second set of letters to keep in sync.
 *
 * Mark the label with `data-letter-roll`; it must hold plain text only. It is split on
 * its first hover, into an sr-only copy (so accessible names never change) and an
 * aria-hidden visible copy. A label whose text changes needs a React `key` tied to the text, so it
 * remounts unsplit. Mouse only: one delegated listener covers the menu and dialogs too.
 */
export function useLetterRoll() {
  useEffect(() => {
    ensureGsap();
    if (!motionEnabled() || !finePointer() || !CSS.supports('height', '1lh')) return;
    const root = document.documentElement;
    root.classList.add('has-roll');
    const prepared = new Map<HTMLElement, Prepared>();
    let current: HTMLElement | null = null;

    const prepare = (label: HTMLElement) => {
      const done = prepared.get(label);
      if (done) return done;
      // Drop labels that have left the page (a closed dialog, a swapped label).
      prepared.forEach((_, el) => { if (!el.isConnected) prepared.delete(el); });
      const text = label.textContent ?? '';
      const original = [...label.childNodes];
      const sr = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: text });
      const vis = Object.assign(document.createElement('span'), { className: 'roll', textContent: text });
      vis.setAttribute('aria-hidden', 'true');
      label.replaceChildren(sr, vis);
      const split = SplitText.create(vis, { type: 'words,chars', tag: 'span', charsClass: 'roll-char', aria: 'none' });
      const p: Prepared = {
        chars: split.chars,
        undo: () => { gsap.killTweensOf(split.chars); split.revert(); if (label.isConnected) label.replaceChildren(...original); },
      };
      prepared.set(label, p);
      return p;
    };

    // Leaving is quicker than arriving, as everywhere on the page.
    const roll = (label: HTMLElement | null) => {
      if (label === current) return;
      const prev = current && prepared.get(current);
      if (prev) gsap.to(prev.chars, { yPercent: 0, duration: DUR.split, ease: EASE.out, stagger: STAGGER.char, overwrite: true });
      current = label;
      if (label) gsap.to(prepare(label).chars, { yPercent: -100, duration: DUR.wipe, ease: EASE.out, stagger: STAGGER.char, overwrite: true });
    };
    const labelOf = (t: EventTarget | null) =>
      (t instanceof Element ? t.closest('a, button')?.querySelector<HTMLElement>('[data-letter-roll]') ?? null : null);
    const over = (e: PointerEvent) => { if (e.pointerType === 'mouse') roll(labelOf(e.target)); };
    const out = (e: PointerEvent) => { if (e.pointerType === 'mouse' && !e.relatedTarget) roll(null); };
    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerout', out, { passive: true });
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      prepared.forEach(p => p.undo());
      prepared.clear();
      root.classList.remove('has-roll');
    };
  }, []);
}
