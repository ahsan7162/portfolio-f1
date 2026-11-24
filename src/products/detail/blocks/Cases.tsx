// One stage that rotates through cases: what was asked in a chat bubble, the screen that came of it, a tab per case.
import { useId, useRef, type ComponentProps, type RefObject } from 'react';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
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

/**
 * The block's section as the root of its RotTabs: arrow keys, Home and End select through it.
 * Tabs, not each pill, own the selection, so the list and the panels can sit anywhere inside.
 */
export function RotRoot({ r, keep, root, ...props }: { r: Rot; keep?: boolean; root: RefObject<HTMLElement | null> } & Omit<ComponentProps<'section'>, 'defaultValue' | 'ref'>) {
  return <Tabs value={String(r.index)} onValueChange={(v) => r.go(Number(v), keep)} render={<section ref={root} />} {...props} />;
}

/** The tab pills: the active one fills as the clock runs. */
/** `controls` names the one panel every tab drives, when they share a stage; otherwise each tab drives its own `<id>-p<i>`. */
export function RotTabs({ tabs, r, id, keep, controls }: { tabs: string[]; r: Rot; id: string; keep?: boolean; controls?: string }) {
  return (
    <TabsList className="bv-rot-tabs">
      {tabs.map((t, i) => (
        <TabsTab
          key={t} value={String(i)} id={`${id}-t${i}`} aria-controls={controls ?? `${id}-p${i}`}
          className="bv-rot-tab pp-mono" data-rot={i} data-on={i === r.index || undefined}
          // onValueChange skips the tab already selected, and choosing it still has to stop the clock
          onClick={() => r.go(i, keep)}
        >
          <span className="bv-rot-fill" aria-hidden="true" />
          <span className="bv-rot-tab-t">{t}</span>
        </TabsTab>
      ))}
    </TabsList>
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
    <RotRoot r={r} root={root} className="dt-block dt-sec pp-wrap bv-cases" aria-labelledby={id} data-rot-state={r.rotating ? 'run' : 'off'}>
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
    </RotRoot>
  );
}
