// Pieces every block uses: its numbered label, its motion setup, and small helpers.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { onReveal } from '../../arrive';
import { gsap, ScrollTrigger, useGSAP } from '../../motion';
import type { Block, BlockOf, Product } from '../../types';
import { bare } from '../../stop';

export type BlockProps<K extends Block['type']> = {
  block: BlockOf<K>;
  product: Product;
};

/** Must match the CSS query that turns a gallery from a swipe row into a pinned track. */
export const PIN_QUERY = '(min-width: 900px) and (pointer: fine)';

/** A section's name and rule; `aside` is a short tag at the rule's end (a demo's "Redrawn · sample data"). */
export function Label({ id, children, aside }: { id: string; children: ReactNode; aside?: string }) {
  return (
    <h2 className="dt-label pp-mono" id={id}>
      <span>{children}</span>
      <span className="dt-label-line" aria-hidden="true" />
      {aside && <span className="dt-label-aside pp-meta">{aside}</span>}
    </h2>
  );
}

/** The arrow on a link that leaves the site. */
export { IconOut as Out } from './icons';

/**
 * Keeps a showcase on one screen at any size: narrows its screen (`stage`, inside `root`) until everything from `top` to
 * `end` (the headline or ask, the screen, the tabs) fits the small viewport height. The screens size from their own
 * width, so a narrower one is a shorter one. It refits when the viewport changes, never when a demo's content does, so
 * a demo never shrinks under the reader. A screen only shrinks if it then fits while still readable (half its width, and
 * at least 320px): where it cannot (a phone held sideways), it stays whole and the page scrolls as it always did.
 */
export function useShowcaseFit(root: RefObject<HTMLElement | null>, { stage, top, end }: { stage: string; top: string; end: string }) {
  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    // the small viewport height (100svh): it holds still while a phone's address bar comes and goes
    const probe = document.createElement('div');
    probe.style.cssText = 'position: fixed; top: 0; width: 0; height: 100svh; visibility: hidden; pointer-events: none;';
    document.body.append(probe);
    let last = '';
    const fit = (force = false) => {
      const el = box.querySelector<HTMLElement>(stage), a = box.querySelector(top), b = box.querySelector(end);
      const room = probe.offsetHeight - 32, key = `${innerWidth} ${room}`;
      if (!el || !a || !b || (key === last && !force)) return;
      last = key;
      const before = el.style.maxWidth;
      el.style.maxWidth = '';
      // layout sizes, not the box on screen: an entrance may be scaling the screen while this measures
      const full = el.offsetWidth;
      const floor = Math.max(full / 2, Math.min(full, 320));
      for (let i = 0; i < 4; i++) {
        const over = b.getBoundingClientRect().bottom - a.getBoundingClientRect().top - room;
        if (over < 1) break;
        const width = el.offsetWidth, height = el.offsetHeight;
        const next = (width * (height - over)) / height;
        if (next < floor) { el.style.maxWidth = ''; break; }
        if (next >= width - 1) break;
        el.style.maxWidth = `${Math.floor(next)}px`;
      }
      if (el.style.maxWidth !== before) ScrollTrigger.refresh();
    };
    fit();
    let live = true;
    void document.fonts.ready.then(() => { if (live) fit(true); });
    const onResize = () => fit();
    addEventListener('resize', onResize);
    return () => { live = false; removeEventListener('resize', onResize); probe.remove(); };
  }, [root, stage, top, end]);
}

/** A caption with its `backticked` runs drawn as code, which keeps its own case inside an uppercase label; one sentence drops its full stop. */
export const Coded = ({ text }: { text: string }) => <>{bare(text).split('`').map((t, i) => (i % 2 ? <code key={t}>{t}</code> : t))}</>;

export type Motion = {
  /** True on a wide screen with a fine pointer: galleries pin. */
  pin: boolean;
  q: <T extends HTMLElement = HTMLElement>(s: string) => T | null;
  qa: <T extends HTMLElement = HTMLElement>(s: string) => T[];
  /**
   * A trigger that plays once as `el` enters. Scrolled past fast, or jumped over, it lands on its
   * end state: content is never left invisible or half-built behind the reader.
   */
  enter: (el: Element, start?: string) => ScrollTrigger.Vars;
};

const finish = (self: ScrollTrigger) => { self.animation?.progress(1); };

/**
 * A block's own motion, scoped to its root. `setup` runs only when motion is allowed, so with
 * reduced motion the block is simply its final state (no CSS hides anything; every tween is a
 * from/fromTo). It waits for the page to be revealed (the page-change curtain lifting), so a block
 * already in view does not play its entrance behind the curtain; blocks set up in page order, so
 * triggers after a pin are placed below it. It re-runs when the pin query flips. The label's rule
 * draws in for every block.
 */
export function useBlockMotion(scope: RefObject<HTMLElement | null>, setup?: (m: Motion) => void | (() => void)) {
  useGSAP(() => {
    const root = scope.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', pin: PIN_QUERY }, ctx => {
      const { motion, pin: wide } = ctx.conditions as { motion: boolean; pin: boolean };
      // the system page's block frame (html.sy-view) never scrolls, so nothing pins there: a pin could not move
      const pin = wide && !document.documentElement.classList.contains('sy-view');
      if (!motion) return;
      const m: Motion = {
        pin,
        q: <T extends HTMLElement>(s: string) => root.querySelector<T>(s),
        qa: <T extends HTMLElement>(s: string) => [...root.querySelectorAll<T>(s)],
        enter: (el, start = 'top 88%') => ({ trigger: el, start, once: true, fastScrollEnd: true, onLeave: finish, onEnterBack: finish }),
      };
      let undo: void | (() => void);
      // Run inside the matchMedia context even though it starts later, so mm.revert() undoes it.
      const run = ctx.add('reveal', () => {
        for (const line of m.qa('.dt-label-line')) {
          gsap.from(line, { scaleX: 0, duration: 0.7, ease: 'expo.out', scrollTrigger: m.enter(line, 'top 94%') });
        }
        undo = setup?.(m);
      });
      const cancel = onReveal(() => run());
      return () => { cancel(); if (undo) undo(); };
    });
    return () => mm.revert();
  }, { scope });
}

/**
 * Counts the plain number written in `el` up from 0, on the trigger in `vars`. Returns an undo that
 * puts the number back, or null when the text is not a plain number ("<1", "2×").
 */
export function countUp(el: HTMLElement, vars: gsap.TweenVars) {
  const text = el.textContent;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const dp = text.split('.')[1]?.length ?? 0;
  const v = { n: 0 };
  el.textContent = v.n.toFixed(dp);
  gsap.to(v, { n: Number(text), duration: 0.9, ease: 'power3.out', ...vars, onUpdate: () => { el.textContent = v.n.toFixed(dp); } });
  return () => { el.textContent = text; };
}

/** Copies text, and says "Copied" for 2 s. Fails quietly: the text stays on screen to select. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard (insecure context, denied) */ }
  }
  return [copied, (text: string) => void copy(text)] as const;
}

/**
 * A label that slides to its other text (Copy → Copied): both texts share one grid cell, so the
 * button keeps its width, and the swap is a quick transform, not an instant jump.
 */
export const SwapLabel = ({ on, off, onText }: { on: boolean; off: string; onText: string }) => (
  <span className={`dt-swap${on ? ' dt-swap--on' : ''}`}>
    <span className="dt-swap-a" aria-hidden={on}>{off}</span>
    <span className="dt-swap-b" aria-hidden={!on}>{onText}</span>
  </span>
);

/**
 * The picked option's fill, sliding to the next pick instead of jumping. It goes first inside the group, beside the
 * options (buttons with aria-pressed or aria-checked), and follows whichever is on; the first placing does not slide.
 * The group must be positioned. With Reduce Motion it simply sits under the pick.
 */
export function Slide() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const m = ref.current, group = m?.parentElement;
    if (!m || !group) return;
    const place = () => {
      const on = group.querySelector<HTMLElement>(':scope > [aria-pressed="true"], :scope > [aria-checked="true"]');
      m.hidden = !on?.offsetWidth;
      if (!on || m.hidden) return;
      m.style.cssText = `width: ${on.offsetWidth}px; height: ${on.offsetHeight}px; transform: translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
      requestAnimationFrame(() => m.setAttribute('data-ready', ''));
    };
    place();
    // a new pick, or the group changing size without one (it wraps, or shows only on a wide screen)
    const mo = new MutationObserver(place);
    mo.observe(group, { attributes: true, subtree: true, attributeFilter: ['aria-pressed', 'aria-checked'] });
    const ro = new ResizeObserver(place);
    ro.observe(group);
    return () => { mo.disconnect(); ro.disconnect(); };
  }, []);
  return <span className="pp-slide" ref={ref} aria-hidden="true" />;
}

/**
 * Starts loading and decoding the lazy images inside `ref` when it is within about one and a half
 * screens, so they are ready before a pin or an entrance moves them.
 */
export function usePreload(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      for (const img of el.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) {
        img.loading = 'eager';
        img.decode().catch(() => { /* a broken image still shows its alt; nothing to wait for */ });
      }
    }, { rootMargin: '150% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

export const CopyStatus = ({ copied, text = 'Install command copied' }: { copied: boolean; text?: string }) => (
  <span className="pp-sr" role="status">{copied ? text : ''}</span>
);

/** Store buttons. shortcut: the data has no store URLs yet, so they are disabled; link them once `get` carries hrefs. */
export const StoreButtons = ({ className }: { className: string }) => ['App Store', 'Google Play'].map(s => (
  <button key={s} type="button" className={className} disabled>{s}</button>
));
