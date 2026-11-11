// OpenUI Live Replies, playable: the agent's reply is a decision you tune, not a paragraph. Change a
// weight and the options re-rank; the button sends your pick back as your next message. "Source"
// shows the block the agent wrote, with your weights in it.
import { useRef, useState } from 'react';
import { Flip, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import { MAX, weighted } from './decision';
import '../styles/openui-demo.css';

const CRITERIA = ['Throughput', 'Ops cost', 'Delivery', 'Local dev'] as const;
const OPTIONS = [
  { name: 'Postgres queue', scores: [4, 5, 4, 4], pro: 'Runs on the database we already operate', con: 'Polling adds load at high volume' },
  { name: 'Redis queue', scores: [5, 2, 4, 4], pro: 'Fastest of the three', con: 'Needs a Redis with persistence' },
  { name: 'Managed queue', scores: [4, 3, 5, 2], pro: 'Nothing to run ourselves', con: 'Hard to run on a laptop' },
] as const;
const START = [3, 5, 4, 2];

export function OpenUiDemo({ active }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const before = useRef<Flip.FlipState | null>(null);
  const [weights, setWeights] = useState(START);
  const [source, setSource] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // Ties keep the order the options were written in, as a stable sort does.
  const ranked = OPTIONS.map(o => ({ ...o, share: weighted(o.scores, weights) })).sort((a, b) => b.share - a.share);
  const leader = ranked[0].name;
  const order = ranked.map(o => o.name).join();

  // The rows glide to their new places when the ranking changes.
  useGSAP(() => {
    if (before.current) Flip.from(before.current, { duration: 0.45, ease: 'power3.inOut' });
    before.current = null;
  }, { scope: root, dependencies: [order] });

  const bump = (i: number, by: number, from: Element) => {
    const rows = from.closest('.oud')?.querySelectorAll('.oud-row');
    if (rows && !reducedMotion()) before.current = Flip.getState(rows);
    setWeights(w => w.map((v, j) => (j === i ? Math.max(0, Math.min(MAX, v + by)) : v)));
    setSent(null);
  };
  const reset = () => { setWeights(START); setSent(null); setSource(false); };

  const program = [
    'root = Stack([d])',
    'd = Decision([',
    ...OPTIONS.map((o, i) => `  DecisionOption("${o.name}", [${o.scores.join(', ')}], ["${o.pro}"], ["${o.con}"])${i < OPTIONS.length - 1 ? ',' : ''}`),
    `], [${CRITERIA.map(c => `"${c}"`).join(', ')}], [${weights.join(', ')}])`,
  ].join('\n');

  return (
    <div className="oud" ref={root} data-active={active ? '' : undefined}>
      <div className="oud-win">
        <div className="oud-bar">
          <span>Thread</span>
          <span className="oud-bar-end">
            {(sent || weights.join() !== START.join()) && <button type="button" className="oud-reset" onClick={reset}>Reset</button>}
            <span className="oud-view" role="group" aria-label="Show the reply as">
              <button type="button" aria-pressed={!source} onClick={() => setSource(false)}>Reply</button>
              <button type="button" aria-pressed={source} onClick={() => setSource(true)}>Source</button>
            </span>
          </span>
        </div>

        <p className="oud-me">Which job queue should we use?</p>

        <div className="oud-reply">
          {/* Both views share one cell, so the reply keeps its height when they swap. */}
          <div className="oud-ui" inert={source} data-off={source ? '' : undefined}>
            <p className="oud-note">Weights: how much each criterion matters, 0 to {MAX}</p>
            <div className="oud-weights">
              {CRITERIA.map((c, i) => (
                <div className="oud-weight" key={c} role="group" aria-label={`${c} weight`}>
                  <span>{c}</span>
                  <button type="button" aria-label={`Lower ${c}`} disabled={weights[i] === 0} onClick={e => bump(i, -1, e.currentTarget)}>−</button>
                  <b aria-live="polite">{weights[i]}</b>
                  <button type="button" aria-label={`Raise ${c}`} disabled={weights[i] === MAX} onClick={e => bump(i, 1, e.currentTarget)}>+</button>
                </div>
              ))}
            </div>
            <ol className="oud-rows">
              {ranked.map((o, i) => (
                <li className="oud-row" key={o.name} data-flip-id={o.name} data-lead={i === 0 ? '' : undefined}>
                  <span className="oud-name">{o.name}{i === 0 && <small>leading</small>}</span>
                  <span className="oud-bar-track" aria-hidden="true"><i style={{ transform: `scaleX(${o.share / 100})` }} /></span>
                  <span className="oud-share">{o.share}%</span>
                </li>
              ))}
            </ol>
            <button type="button" className="oud-go" disabled={sent === leader} onClick={() => setSent(leader)}>Go with {leader}</button>
          </div>
          <pre className="oud-src" inert={!source} data-off={source ? undefined : ''}><code>{program}</code></pre>
        </div>

        {/* Always in the layout, so sending does not move the window. */}
        <p className="oud-me oud-sent" data-on={sent ? '' : undefined} aria-live="polite">{sent ? `Go with ${sent}` : ' '}</p>
      </div>
    </div>
  );
}
