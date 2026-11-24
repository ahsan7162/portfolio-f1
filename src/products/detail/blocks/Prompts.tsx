// A prompt bar with suggested asks. Pick one: it types into the bar and goes, and the reply streams in under it,
// its words first and then its screen building itself. It plays the first ask once by itself when it comes into view.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Toggle } from '@ui-sdk/react/toggle';
import { reducedMotion, ScrollTrigger } from '../../motion';
import { Shot } from '../../stage/Frames';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

const TYPE_MS = 24; // a letter of the ask
const WORDS_PER_S = 95; // characters of the reply's words

/** `text` as it arrives, a few characters a frame from when `go` turns true; whole with reduced motion. */
function useArriving(text: string, go: boolean, perSecond: number) {
  const [t, setT] = useState({ text: '', n: 0 });
  useEffect(() => {
    if (!go || reducedMotion()) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick() {
      const n = Math.floor(((performance.now() - t0) / 1000) * perSecond);
      setT({ text, n });
      if (n < text.length) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [text, go, perSecond]);
  if (!go) return '';
  return reducedMotion() ? text : text.slice(0, t.text === text ? t.n : 0);
}

export function Prompts({ block, product, n }: BlockProps<'prompts'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [typed, setTyped] = useState('');
  // With reduced motion nothing plays by itself, so the first reply is simply there.
  const [on, setOn] = useState<{ i: number; run: number } | null>(() => (reducedMotion() ? { i: 0, run: 0 } : null));
  const timers = useRef<number[]>([]);
  const picked = useRef(false);
  const p = on ? block.prompts[on.i] : null;
  const words = useArriving(p?.reply ?? '', !!p, WORDS_PER_S);
  const shown = !!p && words.length === p.reply.length;

  const pick = (i: number) => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    const ask = block.prompts[i].ask;
    setOn(null);
    if (reducedMotion()) { setTyped(''); setOn({ i, run: Date.now() }); return; }
    for (let k = 1; k <= ask.length; k++) timers.current.push(window.setTimeout(() => setTyped(ask.slice(0, k)), k * TYPE_MS));
    timers.current.push(window.setTimeout(() => { setTyped(''); setOn({ i, run: Date.now() }); }, ask.length * TYPE_MS + 380));
  };
  const pickRef = useRef(pick);
  useLayoutEffect(() => { pickRef.current = pick; });
  useEffect(() => () => { for (const t of timers.current) clearTimeout(t); }, []);

  // The first ask plays by itself once the block is in view, unless the reader picked one first.
  useBlockMotion(root, ({ q }) => {
    const bar = q('.bv-prompts-bar');
    if (!bar) return;
    const st = ScrollTrigger.create({ trigger: bar, start: 'top 70%', once: true, onEnter: () => { if (!picked.current) pickRef.current(0); } });
    return () => st.kill();
  });

  return (
    <section className="dt-block dt-sec pp-wrap bv-prompts" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <p className="bv-prompts-head pp-lede">{block.head}</p>}
      <div className="bv-prompts-bar">
        <p className="bv-prompts-input" data-empty={!typed || undefined} aria-hidden="true">{typed || 'Ask your agent anything'}<i /></p>
        <span className="bv-prompts-send" aria-hidden="true">↑</span>
      </div>
      <div className="bv-prompts-chips" role="group" aria-label="Ask">
        {block.prompts.map((x, i) => (
          <Toggle key={x.chip} className="bv-prompts-chip" pressed={on?.i === i} onPressedChange={() => { picked.current = true; pick(i); }}>
            {x.chip}
          </Toggle>
        ))}
      </div>
      <div className="bv-prompts-thread" aria-live="polite">
        {p && on ? (
          <>
            <p className="bv-prompts-me">{p.ask}</p>
            <p className="bv-prompts-words">{words}</p>
            <div className="bv-prompts-screen" data-on={shown || undefined}>
              {shown && <Shot key={on.run} media={p.media} kind={product.kind} active />}
            </div>
          </>
        ) : (
          <div className="bv-prompts-screen bv-prompts-wait"><span className="pp-mono pp-dim">The reply arrives here</span></div>
        )}
      </div>
      {block.note && <p className="bc-note">{block.note}</p>}
    </section>
  );
}
