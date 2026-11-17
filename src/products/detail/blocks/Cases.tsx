// One stage that rotates through cases: what was asked in a chat bubble, the screen that came of it, a tab per case.
import { useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { gsap, SplitText, useGSAP } from '../../motion';
import { Label, SwapLabel, usePreload, type BlockProps } from './shared';
import { MediaView } from './MediaView';
import { useRotate, type Rot } from './rotate';
import '../../styles/blocks-visual.css';

export const HOLD = 6;
/** A scene's hold: its timeline (stage/dashScenes.ts) runs up to about 7 s, then its end state holds a moment to be read. */
export const HOLD_SCENE = 8.5;

/** What the person typed. The words are real text for a reader; the split copy that types in is decoration. */
export function Ask({ text, i }: { text: string; i: number }) {
  return (
    <div className="bv-rot-ask-row" data-case={i}>
      <p className="bv-rot-ask">
        <span className="pp-sr">{text}</span>
        <span className="bv-rot-ask-t" aria-hidden="true">{text}</span>
      </p>
    </div>
  );
}

/** The tab pills: the active one fills as the clock runs. Arrow keys move between them. */
/** `controls` names the one panel every tab drives, when they share a stage; otherwise each tab drives its own `<id>-p<i>`. */
export function RotTabs({ tabs, r, id, keep, controls }: { tabs: string[]; r: Rot; id: string; keep?: boolean; controls?: string }) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const move = e.key === 'ArrowRight' ? 'next'
      : e.key === 'ArrowLeft' ? 'prev'
      : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (move === null) return;
    e.preventDefault();
    const to = move === 'next' ? (r.index + 1) % tabs.length : move === 'prev' ? (r.index + tabs.length - 1) % tabs.length : move;
    r.go(to, keep);
    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };
  return (
    <div className="bv-rot-tabs" role="tablist">
      {tabs.map((t, i) => (
        <button
          key={t} type="button" role="tab" id={`${id}-t${i}`} aria-controls={controls ?? `${id}-p${i}`}
          aria-selected={i === r.index} tabIndex={i === r.index ? 0 : -1}
          className="bv-rot-tab pp-mono" data-rot={i} data-on={i === r.index || undefined}
          onClick={() => r.go(i, keep)} onKeyDown={onKey}
        >
          <span className="bv-rot-fill" aria-hidden="true" />
          <span className="bv-rot-tab-t">{t}</span>
        </button>
      ))}
    </div>
  );
}

/** Pause, always in its place: after the reader takes over it keeps its room but goes quiet. */
export function PauseButton({ r }: { r: Rot }) {
  const off = !r.rotating;
  return (
    <button type="button" className="bv-rot-btn pp-mono" aria-pressed={r.paused} aria-label="Pause the rotation" onClick={r.toggle} data-off={off || undefined} disabled={off}>
      <SwapLabel on={r.paused} off="Pause" onText="Play" />
    </button>
  );
}

/**
 * When the active case changes: its words type in and, for a picture, the screen arrives in four bands
 * from the top. A live screen builds itself, so it is not wiped. The leaving case fades in CSS.
 */
export function useCaseMotion(root: RefObject<HTMLElement | null>, r: Rot) {
  const prev = useRef(r.index);
  useGSAP(() => {
    const was = prev.current;
    prev.current = r.index;
    if (!r.live || was === r.index) return;
    const at = `[data-case="${r.index}"]`;
    const tl = gsap.timeline();
    const text = root.current?.querySelector<HTMLElement>(`${at} .bv-rot-ask-t`);
    if (text) {
      const s = SplitText.create(text, { type: 'words,chars', aria: 'none' });
      tl.from(s.chars, { autoAlpha: 0, duration: 0.02, stagger: Math.min(0.025, 0.55 / s.chars.length), ease: 'none' }, 0.05);
    }
    const shot = root.current?.querySelector<HTMLElement>(`${at} .bv-cases-shot[data-img]`);
    if (shot) {
      tl.fromTo(shot, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'steps(4)', clearProps: 'clipPath' }, 0.3)
        .fromTo(shot, { scale: 1.02 }, { scale: 1, duration: 1.1, clearProps: 'transform' }, 0.3);
    }
  }, { scope: root, dependencies: [r.index, r.live], revertOnUpdate: true });
}

export function Cases({ block, product, n }: BlockProps<'cases'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const r = useRotate(root, { count: block.cases.length, hold: HOLD });
  usePreload(root);
  useCaseMotion(root, r);

  return (
    <section className="dt-block dt-sec pp-wrap bv-cases" ref={root} aria-labelledby={id} data-rot-state={r.rotating ? 'run' : 'off'}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <div className="bv-rot-stack bv-cases-stage">
        {block.cases.map((c, i) => {
          const on = i === r.index;
          return (
            <div key={c.tab} role="tabpanel" id={`${id}-p${i}`} aria-labelledby={`${id}-t${i}`} className="bv-rot-item" data-case={i} data-on={on || undefined} inert={!on}>
              {c.ask && <Ask text={c.ask} i={i} />}
              <div className="bv-cases-shot" data-img={'src' in c.media || undefined}>
                <MediaView media={c.media} product={product} active={on && r.inView} />
              </div>
              {c.caption && <p className="bv-rot-cap pp-mono pp-dim">{c.caption}</p>}
            </div>
          );
        })}
      </div>
      <div className="bv-rot-bar">
        <RotTabs tabs={block.cases.map(c => c.tab)} r={r} id={id} />
        <PauseButton r={r} />
      </div>
    </section>
  );
}
