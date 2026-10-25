import { useId, type ReactNode, type Ref } from 'react';
import { thousands } from '@/lib/format';
import { EASE } from '@/motion/tokens';

// What every project scene shares (the featured cards' in ProjectVisuals, the archive's in
// components/archive): one SVG on a fixed 320×200 grid over a dot grid, drawn in the site's
// palette, played by a GSAP timeline with these text helpers.

// The markup paints with the CSS variables, so prerendered scenes follow the livery (INK is the
// livery's accent text: gold in Barça). GSAP can't tween var(), so timelines tween PALETTE's values.
export const FG = 'var(--fg)', MUTE = 'var(--mute)', AC = 'var(--ac)', INK = 'var(--ac2)', CARBON = 'var(--carbon)', PANEL = 'var(--panel)';
export const DIM = '#2a2a2e', LINE = 'rgb(255 255 255 / 0.12)', GRID_DOT = 'rgb(255 255 255 / 0.14)';
export const t = (size: number, fill: string = FG, weight?: number) => ({ className: 'font-mono', fontSize: size, fill, fontWeight: weight });
export const label = (fill: string = MUTE) => ({ ...t(5.8, fill, 600), letterSpacing: 0.6 });

export type At = number | string;
/** Text helpers for a scene's timeline. Text is restored at time 0 on every replay. */
export type Fx = {
  tl: gsap.core.Timeline;
  q: <T extends Element = SVGGraphicsElement>(sel: string) => T;
  qa: (sel: string) => SVGGraphicsElement[];
  /** Text shown at time 0, before the scene changes it. */
  from: (el: Element, text: string) => void;
  /** Types the element's text (or `text`) out, starting from empty. */
  type: (el: Element, at: At, dur: number, text?: string) => void;
  /** Counts the number in the element's text up from `start`. */
  count: (el: Element, start: number, at: At, dur: number) => void;
  /** Scrambles from one string into another. */
  scramble: (el: Element, a: string, b: string, at: At, dur: number) => void;
  click: (cursor: Element, at: At) => void;
};

export const setText = (el: Element, s: string) => { const n = el.firstChild; if (n && n.nodeType === 3) n.nodeValue = s; else el.textContent = s; };
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789-/';

/**
 * The helpers for one scene. `keep` records an element's markup text (its last frame) the
 * first time it is touched; `resets` collects what puts the text back to time 0.
 */
export function makeFx(svg: SVGSVGElement, tl: gsap.core.Timeline, keep: (el: Element) => string, resets: (() => void)[]): Fx {
  const fx: Fx = {
    tl,
    q: sel => svg.querySelector(sel)!,
    qa: sel => [...svg.querySelectorAll<SVGGraphicsElement>(sel)],
    from: (el, text) => { keep(el); resets.push(() => setText(el, text)); },
    type: (el, at, dur, text) => {
      const full = text ?? keep(el);
      fx.from(el, '');
      const o = { n: 0 };
      tl.to(o, { n: full.length, duration: dur, ease: EASE.none, onUpdate: () => setText(el, full.slice(0, Math.round(o.n))) }, at);
    },
    count: (el, start, at, dur) => {
      const [, pre, num, post] = keep(el).match(/^(\D*)([\d,]+)(.*)$/)!;
      const end = parseInt(num.replace(/,/g, ''), 10), fmt = (n: number) => pre + thousands(n) + post;
      fx.from(el, fmt(start));
      const o = { n: start };
      tl.to(o, { n: end, duration: dur, ease: EASE.out, onUpdate: () => setText(el, fmt(o.n)) }, at);
    },
    scramble: (el, a, b, at, dur) => {
      keep(el);
      const o = { p: 0 };
      tl.to(o, { p: 1, duration: dur, ease: EASE.none, onUpdate: () => {
        const len = Math.round(a.length + (b.length - a.length) * o.p), k = Math.floor(b.length * o.p);
        let s = b.slice(0, k);
        for (let i = k; i < len; i++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        setText(el, o.p >= 1 ? b : s);
      } }, at);
    },
    click: (cursor, at) => { tl.to(cursor, { scale: 0.8, duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, at); },
  };
  return fx;
}

/** The scene's SVG: the 320×200 grid on a dot pattern, its drawing inset by .proj-scene. */
export function SceneSvg({ ref, className, children }: { ref?: Ref<SVGSVGElement>; className?: string; children: ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // The scene sits at 76% on a dot grid, so it reads as an illustration, apart from the card's own
  // text; phones draw it at 90% so its small UI text stays readable (see .proj-scene in index.css).
  return (
    <svg ref={ref} aria-hidden="true" viewBox="0 0 320 200" className={className ?? 'h-full w-full'} fill="none">
      <defs>
        <pattern id={`dots-${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.45" fill={GRID_DOT} />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#dots-${id})`} />
      <g className="proj-scene">{children}</g>
    </svg>
  );
}

export const Cursor = () => (
  // data-pointer, not data-cursor: that one sets the real cursor's state (Cursor.tsx).
  <g data-pointer opacity="0">
    <path d="M0 0 L0 11 L3 8.5 L5.5 13 L7.5 12 L5 7.5 L9 7.5 Z" fill={FG} stroke={CARBON} strokeWidth="0.8" strokeLinejoin="round" />
  </g>
);
