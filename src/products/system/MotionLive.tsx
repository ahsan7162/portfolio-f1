// The motion language on real pieces of the page, each with Replay: how an entrance lands, how a press gives and
// springs back, a label swapping, a number counting up, the display width stretching, a list reordering with
// Flip, and the curtain between pages. Each uses the same tokens and calls the blocks use.
import { useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { countUp, SwapLabel } from '../detail/blocks/shared';
import { Flip, gsap, MOTION, reducedMotion, useGSAP } from '../motion';

const CARDS = ['Ask', 'Draft', 'Check', 'Ship'];
const CHIPS = ['Markdown', 'Git', 'bb', 'VS Code', 'Any agent', 'Jira'];

export function MotionLive({ brand }: { brand: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [swapped, setSwapped] = useState(false);
  const [chips, setChips] = useState(CHIPS);
  const still = reducedMotion();
  const { contextSafe } = useGSAP({ scope: root });

  const enter = contextSafe(() => {
    gsap.fromTo('.sy-m-card', { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: MOTION.enter, stagger: MOTION.stagger, ease: MOTION.ease, overwrite: true });
  });
  const count = contextSafe((fig: HTMLElement) => {
    for (const el of fig.querySelectorAll<HTMLElement>('.sy-m-num b')) countUp(el, {});
  });
  const stretch = contextSafe(() => {
    gsap.fromTo('.sy-m-word', { '--wdth': 64 }, { '--wdth': 125, duration: 0.8, ease: 'expo.inOut', yoyo: true, repeat: 1, overwrite: true });
  });
  const shuffle = contextSafe((fig: HTMLElement) => {
    const list = fig.querySelector('.sy-m-chips');
    const state = list ? Flip.getState(list.children) : null;
    flushSync(() => setChips(c => [...c.slice(1), ...c.slice(0, 1)].reverse()));
    if (state) Flip.from(state, { duration: MOTION.enter, ease: 'power3.inOut', stagger: 0.02 });
  });
  const curtain = contextSafe(() => {
    gsap.timeline({ defaults: { overwrite: true } })
      .fromTo('.sy-m-curtain', { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' })
      .to('.sy-m-curtain', { yPercent: -100, duration: 0.55, ease: 'power3.inOut' }, '+=0.25');
  });
  const swap = () => { setSwapped(true); setTimeout(() => setSwapped(false), 1600); };

  return (
    <div className="sy-motion-live" ref={root}>
      {still && <p className="pp-cap">Your system asks for less motion, so every piece here shows its final state, as the pages do.</p>}
      <Demo name="Entrance" spec={`y 28 → 0, fade in · ${MOTION.enter}s, ${MOTION.ease}, ${MOTION.stagger}s apart`} onPlay={enter} still={still}>
        <ul className="sy-m-cards">{CARDS.map(c => <li key={c} className="sy-m-card"><span className="pp-mono">{c}</span><i /><i /></li>)}</ul>
      </Demo>
      <Demo name="Press" spec="dips to 97% at once (--t-70), springs back over 160 ms (--ease)">
        <div className="sy-row-of"><button type="button" className="pp-btn">Press and hold</button><button type="button" className="pp-btn pp-btn--ghost">Ghost</button></div>
      </Demo>
      <Demo name="Label swap" spec="both labels share one cell, so the button keeps its width; the text slides" onPlay={swap} still={still} play="Copy">
        <button type="button" className="pp-btn" onClick={swap}><SwapLabel on={swapped} off="Copy install command" onText="Copied" /></button>
      </Demo>
      <Demo name="Count up" spec="from 0 to the number written · 0.9s, power3.out" onPlay={count} still={still}>
        <div className="sy-m-nums">
          <p className="sy-m-num"><b className="pp-display">142</b><span className="pp-meta">tokens</span></p>
          <p className="sy-m-num"><b className="pp-display">38</b><span className="pp-meta">blocks</span></p>
        </div>
      </Demo>
      <Demo name="Width" spec="--wdth 64 → 125 → 64, a registered number, so it tweens · expo.inOut" onPlay={stretch} still={still}>
        <p className="pp-display sy-m-word">Stretch</p>
      </Demo>
      <Demo name="Layout change" spec="Flip: capture, change the list, then move each piece from where it was" onPlay={shuffle} still={still} play="Shuffle">
        <ul className="sy-m-chips">{chips.map(c => <li key={c} className="bc-chip">{c}</li>)}</ul>
      </Demo>
      <Demo name="Page change" spec="the curtain rises over 0.45s and lifts over 0.55s, power3.inOut, in a deep shade of the next product's colour" onPlay={curtain} still={still}>
        <div className="sy-m-stage">
          <p className="pp-cap">The page you leave</p>
          <div className="sy-m-curtain" style={{ '--brand': brand } as CSSProperties} aria-hidden="true"><span className="pp-display">Next product</span></div>
        </div>
      </Demo>
    </div>
  );
}

/** One demo; its Replay hands the demo's own figure to the player, which finds its pieces inside it. */
function Demo({ name, spec, onPlay, still, play = 'Replay', children }: { name: string; spec: string; onPlay?: (fig: HTMLElement) => void; still?: boolean; play?: string; children: React.ReactNode }) {
  return (
    <figure className="sy-m">
      <div className="sy-m-show">{children}</div>
      <figcaption>
        <b>{name}</b>
        <span className="sy-dim">{spec}</span>
        {onPlay && !still && <button type="button" className="pp-btn pp-btn--ghost sy-m-play" onClick={e => { const fig = e.currentTarget.closest('figure'); if (fig) onPlay(fig); }}>{play}</button>}
      </figcaption>
    </figure>
  );
}
