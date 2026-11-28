// The product's live demo playing itself through named scenes, a tab per scene; the reader can take it over at any point.
// Each scene lands its headline and its cost tag; the demo says when the cost is spent (a bubbling `scene-cost` event).
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { gsap, reducedMotion, SplitText, useGSAP } from '../../motion';
import { Stage, tallyWords } from '../../stage/Stage';
import { Ask, HOLD_SCENE, PauseButton, RotRoot, RotTabs } from './Cases';
import { IconReplay } from './icons';
import { useRotate } from './rotate';
import { Coded, Label, useShowcaseFit, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';
import { Stop } from '../../stop';

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
          .fromTo(tag, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' })
          .fromTo(tag.querySelector('.bv-odo-col'), { yPercent: (-100 * n) / (n + 1) }, { yPercent: 0, duration: 0.75, ease: 'power3.inOut' }, 0.05);
      } else {
        gsap.fromTo(tag, { scale: 1.08 }, { scale: 1, duration: 0.4, ease: 'power3.out' });
      }
      gsap.fromTo(tag, { '--flash': 1 }, { '--flash': 0, duration: 1.3, ease: 'power2.in' });
    });
    el.addEventListener('scene-cost', spend);
    return () => el.removeEventListener('scene-cost', spend);
  }, { scope: root, dependencies: [scene], revertOnUpdate: true });
}

/** Your turn: the goals, ticked as the demo reports them, with the keys and clicks it took. Listens only while it is the tab showing. */
function Turn({ goals, live, root }: { goals: NonNullable<BlockProps<'scenes'>['block']['turn']>['goals']; live: boolean; root: RefObject<HTMLElement | null> }) {
  const [done, setDone] = useState<string[]>([]);
  const [keys, setKeys] = useState(0);
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!live || !el) return;
    const goal = (e: Event) => { const g = (e as CustomEvent<string>).detail; setDone((d) => (d.includes(g) || !goals.some((x) => x.id === g) ? d : [...d, g])); };
    const key = () => setKeys((k) => k + 1);
    const click = (e: Event) => { if (e.target instanceof Element && e.target.closest('.bv-scenes-stage')) setClicks((c) => c + 1); };
    el.addEventListener('scene-goal', goal);
    el.addEventListener('scene-input', key);
    el.addEventListener('click', click, true);
    return () => { el.removeEventListener('scene-goal', goal); el.removeEventListener('scene-input', key); el.removeEventListener('click', click, true); };
  }, [live, root, goals]);
  const all = done.length === goals.length;
  return (
    <div className="bv-turn">
      <ol className="bv-turn-goals">
        {goals.map((g, i) => (
          <li key={g.id} data-done={done.includes(g.id) || undefined}>
            <i aria-hidden="true">{done.includes(g.id) ? '✓' : i + 1}</i>
            <span>{g.text}{g.keys && <small className="pp-mono">{g.keys}</small>}</span>
            <span className="pp-sr">{done.includes(g.id) ? 'done' : 'to do'}</span>
          </li>
        ))}
      </ol>
      <p className="bv-turn-meter pp-mono" aria-live="polite">
        {all ? <span className="bv-turn-win">All {goals.length}, in {keys} {keys === 1 ? 'key' : 'keys'} and {clicks} {clicks === 1 ? 'click' : 'clicks'}.</span>
          : <><span><b>{keys}</b> {keys === 1 ? 'key' : 'keys'}</span><span><b>{clicks}</b> {clicks === 1 ? 'click' : 'clicks'}</span><span>{done.length} of {goals.length}</span></>}
      </p>
    </div>
  );
}

export function Scenes({ block, product }: BlockProps<'scenes'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [tally, setTally] = useState<number | null>(null);
  const turnAt = block.turn ? block.scenes.length : -1;
  const all = block.turn ? [...block.scenes, { tab: block.turn.tab, head: block.turn.head, caption: block.turn.caption, cost: undefined, ask: undefined }] : block.scenes;
  const r = useRotate(root, { count: all.length, hold: HOLD_SCENE });
  useShowcaseFit(root, { stage: '.dt-stage', top: '.bv-scenes-top', end: '.bv-rot-bar' });
  const playing = !r.stopped;
  const onTurn = r.index === turnAt;
  const scene = playing && r.inView && !onTurn ? r.index : undefined;
  useSceneMotion(root, r.live ? (scene ?? (onTurn ? turnAt : undefined)) : undefined);
  // Reaching Your turn stops the clock: from here the visitor drives. Each visit starts its count afresh.
  useEffect(() => { if (onTurn && r.rotating) r.take(); });
  const [visit, setVisit] = useState(0);
  const [wasOn, setWasOn] = useState(false);
  if (onTurn !== wasOn) { setWasOn(onTurn); if (onTurn) setVisit((v) => v + 1); }
  // While the reel plays, the demo is only to watch: a click meant for one of its buttons would cut a scene off half
  // built. A layer over it takes the click (or a tap, or Enter) and hands the demo over, whole, without passing it on;
  // from then the reader drives, until Play again.
  const demo = useRef<HTMLDivElement>(null);
  const takeOver = () => { r.take(); requestAnimationFrame(() => demo.current?.focus({ preventScroll: true })); };
  // A demo that hears keys on the whole page says so with a bubbling `scene-take`, since those keys never pass through the stage.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const taken = () => { if (playing) r.take(); };
    el.addEventListener('scene-take', taken);
    return () => el.removeEventListener('scene-take', taken);
  });
  // Each row of the block keeps one item per scene in a single cell, so it never changes height.
  const items = (render: (s: (typeof all)[number], i: number) => ReactNode) => all.map((s, i) => (
    <div key={s.tab} className="bv-rot-item" data-scene={i} data-on={i === r.index || undefined} inert={i !== r.index}>{render(s, i)}</div>
  ));

  return (
    <RotRoot r={r} keep root={root} className="dt-block dt-sec pp-wrap bv-scenes" aria-labelledby={id} data-rot-state={r.rotating ? 'run' : 'off'}>
      <Label id={id} aside="Redrawn · sample data · try it">{block.label}</Label>
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <div className="bv-scenes-top">
        <div className="bv-rot-stack bv-scenes-heads">
          {items((s) => <>
            {s.head && <h3 className="bv-scenes-head"><span className="pp-sr">{s.head}</span><span className="bv-scenes-head-t" aria-hidden="true"><Stop text={s.head} /></span></h3>}
            {s.cost && <Cost text={s.cost} />}
          </>)}
        </div>
        <div className="bv-rot-stack bv-scenes-asks">
          {items((s, i) => (i === turnAt && block.turn ? <Turn key={visit} goals={block.turn.goals} live={onTurn} root={root} /> : s.ask && <Ask text={s.ask} i={i} />))}
        </div>
      </div>
      <div className="bv-scenes-stage" role="tabpanel" id={`${id}-stage`} aria-labelledby={`${id}-t${r.index}`}>
        <div className={`dt-stage dt-stage--${product.stage}`}>
          <div className="bv-scenes-demo" ref={demo} tabIndex={-1} inert={r.rotating}>
            <Stage product={product} active={r.inView} onTally={setTally} scene={scene} />
          </div>
          {r.rotating && <button type="button" className="bv-scenes-try" data-cursor="Try it" aria-label={`Try ${product.name} yourself (stops the scenes)`} onClick={takeOver} />}
        </div>
      </div>
      {/* the controls sit right under the screen they drive; the words about it come after */}
      <div className="bv-rot-bar">
        <RotTabs tabs={all.map(s => s.tab)} r={r} id={id} keep controls={`${id}-stage`} />
        {/* One slot for both, so the row never changes size when the reader takes over. */}
        <div className="bv-rot-slot">
          <PauseButton r={r} />
          <button type="button" className="bv-rot-btn pp-ib" aria-label="Play the scenes again" data-tip="Play again" onClick={r.restart} data-off={!r.stopped || undefined} disabled={!r.stopped}><IconReplay /></button>
        </div>
      </div>
      <div className="bv-rot-stack bv-scenes-caps">
        {items((s) => s.caption && <p className="bv-rot-cap pp-cap"><Coded text={s.caption} /></p>)}
      </div>
      <p className="dt-hint pp-cap">
        <span className="dt-live" aria-hidden="true" />
        {product.hint}
        {tally !== null && tallyWords(product.stage, tally) && <span className="dt-tally" aria-live="polite">{tally} {tallyWords(product.stage, tally)?.join(' ')}</span>}
      </p>
    </RotRoot>
  );
}
