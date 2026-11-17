// The product's live demo playing itself through named scenes, a tab per scene; the reader can take it over at any point.
// Each scene lands its headline and its cost tag; the demo says when the cost is spent (a bubbling `scene-cost` event).
import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { gsap, reducedMotion, SplitText, useGSAP } from '../../motion';
import { Stage, TALLY } from '../../stage/Stage';
import { Ask, HOLD_SCENE, PauseButton, RotTabs } from './Cases';
import { useRotate } from './rotate';
import { Label, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

/** A cost as its number and the words after it: "1 model call" is 1 and " model call". */
function costOf(text: string) {
  const m = /^(\d+)(.*)$/.exec(text);
  return m ? { n: Number(m[1]), rest: m[2] } : { n: 0, rest: text };
}

/** What a scene costs. The words are real text; the number's odometer column is decoration. */
function Cost({ text }: { text: string }) {
  const { n, rest } = costOf(text);
  return (
    <p className="bv-scenes-cost pp-mono" data-n={n}>
      <span className="pp-sr">{text}</span>
      <span aria-hidden="true">
        <span className="bv-odo"><span className="bv-odo-col">{Array.from({ length: n + 1 }, (_, i) => <span key={n - i}>{n - i}</span>)}</span></span>{rest}
      </span>
    </p>
  );
}

/**
 * When a scene starts playing: its headline lands, the words in the bubble type in, and the cost tag waits for
 * the demo to spend its model call, then rolls in (a free scene's tag is there from the start and pulses).
 */
function useSceneMotion(root: RefObject<HTMLElement | null>, scene: number | undefined) {
  useGSAP((_, contextSafe) => {
    const el = root.current;
    if (scene === undefined || !el || !contextSafe || reducedMotion()) return;
    const tl = gsap.timeline();
    const head = el.querySelector<HTMLElement>(`[data-scene="${scene}"] .bv-scenes-head-t`);
    if (head) {
      const h = SplitText.create(head, { type: 'chars', aria: 'none' });
      tl.from(h.chars, { yPercent: 120, rotation: 8, duration: 1, stagger: 0.034, ease: 'expo.out', transformOrigin: '0% 100%' }, 0);
    }
    const ask = el.querySelector<HTMLElement>(`[data-case="${scene}"] .bv-rot-ask-t`);
    if (ask) {
      const a = SplitText.create(ask, { type: 'words,chars', aria: 'none' });
      tl.from(a.chars, { autoAlpha: 0, duration: 0.02, stagger: Math.min(0.025, 0.55 / a.chars.length), ease: 'none' }, 0.3);
    }
    const tag = el.querySelector<HTMLElement>(`[data-scene="${scene}"] .bv-scenes-cost`);
    if (!tag) return;
    const n = Number(tag.dataset.n);
    if (n > 0) gsap.set(tag, { autoAlpha: 0 });
    else tl.from(tag, { autoAlpha: 0, x: -12, duration: 0.6, ease: 'power3.out' }, 0.55);
    const spend = contextSafe(() => {
      if (n > 0) {
        gsap.timeline()
          .fromTo(tag, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2.2)' })
          .fromTo(tag.querySelector('.bv-odo-col'), { yPercent: (-100 * n) / (n + 1) }, { yPercent: 0, duration: 0.75, ease: 'power3.inOut' }, 0.05);
      } else {
        gsap.fromTo(tag, { scale: 1.14 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.45)' });
      }
      gsap.fromTo(tag, { '--flash': 1 }, { '--flash': 0, duration: 1.3, ease: 'power2.in' });
    });
    el.addEventListener('scene-cost', spend);
    return () => el.removeEventListener('scene-cost', spend);
  }, { scope: root, dependencies: [scene], revertOnUpdate: true });
}

export function Scenes({ block, product, n }: BlockProps<'scenes'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [tally, setTally] = useState<number | null>(null);
  const counts = TALLY[product.stage];
  const r = useRotate(root, { count: block.scenes.length, hold: HOLD_SCENE });
  const playing = !r.stopped;
  const scene = playing && r.inView ? r.index : undefined;
  useSceneMotion(root, r.live ? scene : undefined);
  // Using the demo itself is taking over: the scene stops being driven, the reader drives.
  // A click, not a pointer down: a finger scrolling the page across the demo must not count.
  const take = () => { if (playing) r.take(); };
  // Each row of the block keeps one item per scene in a single cell, so it never changes height.
  const items = (render: (s: (typeof block.scenes)[number], i: number) => ReactNode) => block.scenes.map((s, i) => (
    <div key={s.tab} className="bv-rot-item" data-scene={i} data-on={i === r.index || undefined} inert={i !== r.index}>{render(s, i)}</div>
  ));

  return (
    <section className="dt-block dt-sec pp-wrap bv-scenes" ref={root} aria-labelledby={id} data-rot-state={r.rotating ? 'run' : 'off'}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <div className="bv-scenes-top">
        <div className="bv-rot-stack bv-scenes-heads">
          {items((s) => <>
            {s.head && <h3 className="bv-scenes-head"><span className="pp-sr">{s.head}</span><span className="bv-scenes-head-t" aria-hidden="true">{s.head}</span></h3>}
            {s.cost && <Cost text={s.cost} />}
          </>)}
        </div>
        <div className="bv-rot-stack bv-scenes-asks">
          {items((s, i) => s.ask && <Ask text={s.ask} i={i} />)}
        </div>
      </div>
      <div className="bv-scenes-stage" role="tabpanel" id={`${id}-stage`} aria-labelledby={`${id}-t${r.index}`} onClickCapture={take} onKeyDownCapture={take}>
        <div className={`dt-stage dt-stage--${product.stage}`}>
          <Stage product={product} active={r.inView} onTally={setTally} scene={scene} />
        </div>
      </div>
      <div className="bv-rot-stack bv-scenes-caps">
        {items((s) => s.caption && <p className="bv-rot-cap pp-mono pp-dim">{s.caption}</p>)}
      </div>
      <p className="dt-hint pp-mono">
        <span className="dt-live" aria-hidden="true" />
        {product.hint}
        {counts && tally !== null && <span className="dt-tally" aria-live="polite">{tally} {counts.join(' ')}</span>}
      </p>
      <div className="bv-rot-bar">
        <RotTabs tabs={block.scenes.map(s => s.tab)} r={r} id={id} keep controls={`${id}-stage`} />
        {/* One slot for both, so the row never changes size when the reader takes over. */}
        <div className="bv-rot-slot">
          <PauseButton r={r} />
          <button type="button" className="bv-rot-btn pp-mono" onClick={r.restart} data-off={!r.stopped || undefined} disabled={!r.stopped}>Play again</button>
        </div>
      </div>
    </section>
  );
}
