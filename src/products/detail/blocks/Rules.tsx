// A product's own rules, live: flip its inputs and the product redraws the result, with a big count beside it.
// The inputs, the rule and the drawing are a named set (stage/pieces.tsx); this block owns the controls and motion.
import { useId, useRef, useState } from 'react';
import { gsap } from '../../motion';
import { RULES } from '../../stage/pieces';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

/** `*starred*` words take the accent. */
export const Accented = ({ text }: { text: string }) => <>{text.split('*').map((t, i) => (i % 2 ? <em key={t}>{t}</em> : t))}</>;

export function Rules({ block, n }: BlockProps<'rules'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const set = RULES[block.set];
  const [v, setV] = useState(set.start);
  const count = set.count(v);
  const [w1, w2] = set.words(count);
  const choose = (i: number, o: number) => setV(x => x.map((y, j) => (j === i ? o : y)));

  useBlockMotion(root, ({ q, qa, enter }) => {
    const stage = q('.bv-rules-stage');
    if (!stage) return;
    gsap.timeline({ scrollTrigger: enter(stage, 'top 80%') })
      .from(q('.bv-rules-draw'), { y: 40, autoAlpha: 0, duration: 0.8, ease: 'expo.out' })
      .from(q('.bv-rules-count'), { x: 30, autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, 0.1)
      .from(qa('.bv-rules-in'), { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.25);
  });

  return (
    <section className="dt-block dt-sec pp-wrap bv-rules" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <p className="bv-rules-head pp-lede"><Accented text={block.head} /></p>}
      <div className="bv-rules-stage">
        <div className="bv-rules-draw prd" aria-live="polite">{set.draw(v)}</div>
        <p className="bv-rules-count" data-zero={count === 0 || undefined}>
          <b className="pp-display" key={count}>{count}</b><span className="pp-mono">{w1}<br />{w2}</span>
        </p>
      </div>
      <div className="bv-rules-ins">
        {set.inputs.map((inp, i) => {
          const isSwitch = inp.options.length === 2 && inp.options[0] === 'Off';
          return isSwitch ? (
            <button key={inp.label} type="button" className="bv-rules-in" aria-pressed={v[i] === 1} onClick={() => choose(i, 1 - v[i])}>
              <span className="pp-mono">{inp.label}</span><b>{inp.options[v[i]]}</b>
            </button>
          ) : (
            <div key={inp.label} className="bv-rules-in bv-rules-in--seg" role="radiogroup" aria-label={inp.label}>
              <span className="pp-mono" aria-hidden="true">{inp.label}</span>
              <span>{inp.options.map((o, j) => <button key={o} type="button" role="radio" aria-checked={v[i] === j} onClick={() => choose(i, j)}>{o}</button>)}</span>
            </div>
          );
        })}
      </div>
      {block.note && <p className="bc-note bv-rules-note">{block.note}</p>}
    </section>
  );
}
