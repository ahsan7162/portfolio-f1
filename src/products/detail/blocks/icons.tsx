// The controls' icons, drawn in BackToTop's stroke: a 24 grid, 2 wide, round ends, in the text's colour.
// Hidden from screen readers: the button around one carries the words (its aria-label, or its text).
import type { ReactNode } from 'react';

const Svg = ({ k, children }: { k: string; children: ReactNode }) => (
  <svg className={`pp-icon pp-icon--${k}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export const IconPrev = () => <Svg k="prev"><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconNext = () => <Svg k="next"><path d="M9 5l7 7-7 7" /></Svg>;
export const IconBack = () => <Svg k="back"><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const IconCaret = () => <Svg k="caret"><path d="M6 9l6 6 6-6" /></Svg>;
export const IconOut = () => <Svg k="out"><path d="M7 17L17 7M9 7h8v8" /></Svg>;
export const IconClose = () => <Svg k="close"><path d="M6 6l12 12M18 6L6 18" /></Svg>;
/** Round once more: it turns a full circle when pressed (`data-spin` on its button, set by spin()). */
export const IconReplay = () => <Svg k="replay"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4v4.5H9" /></Svg>;

/** Copy, and once copied a tick that draws itself in where the sheets were. */
export const IconCopy = ({ done }: { done: boolean }) => (
  <Svg k="copy">
    <g className="pp-icon-a" data-on={!done || undefined}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
    </g>
    <path className="pp-icon-b pp-icon-tick" data-on={done || undefined} pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

const PLAY = 'M8 6v12a1 1 0 0 0 1.5.86l9.5-6a1 1 0 0 0 0-1.72l-9.5-6A1 1 0 0 0 8 6z';
export const IconPlay = () => <Svg k="play"><path fill="currentColor" strokeWidth="1.5" d={PLAY} /></Svg>;

/** What a press does: pause while it plays, play while paused. The two trade places with a quarter turn. */
export const IconPlayPause = ({ paused }: { paused: boolean }) => (
  <Svg k="pp">
    <g className="pp-icon-a" data-on={!paused || undefined} fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" />
    </g>
    <path className="pp-icon-b" data-on={paused || undefined} fill="currentColor" strokeWidth="1.5" d={PLAY} />
  </Svg>
);

/** Turns a replay icon inside `el` one full circle: restarting the animation needs the attribute off for a frame. */
export function spin(el: HTMLElement) {
  el.removeAttribute('data-spin');
  void el.offsetWidth;
  el.setAttribute('data-spin', '');
}
