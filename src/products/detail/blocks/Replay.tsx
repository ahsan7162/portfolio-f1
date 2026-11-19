// A stretch of time replayed fast: events arrive on one side, and the product's own surfaces show what reached
// you on the other. Flip a setting and it replays with what the product makes of the events then (`runs`).
// It plays once as it enters; Replay plays it again. With reduced motion it shows the end.
import { useId, useRef, useState } from 'react';
import { gsap, reducedMotion, useGSAP } from '../../motion';
import { SURFACES } from '../../stage/pieces';
import { Accented } from './Rules';
import { Label, useBlockMotion, useCopy, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
/** How long the whole stretch takes to play. */
const PLAY = 9;

export function Replay({ block, n }: BlockProps<'replay'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [from, to] = [minutes(block.from), minutes(block.to)];
  const [now, setNow] = useState(() => (reducedMotion() ? to : from));
  const [on, setOn] = useState<Record<string, string>>(() => Object.fromEntries(block.settings.map(s => [s.id, s.now])));
  const [last, setLast] = useState(block.settings[0].id);
  const run = block.runs[block.settings.filter(s => s.run).map(s => on[s.id]).join('|')];
  const fired = run.checks.filter(c => minutes(c.at) <= now && c.alerts.length);
  const tl = useRef<gsap.core.Tween | null>(null);
  const [copied, copy] = useCopy();
  const { contextSafe } = useGSAP({ scope: root });

  const play = () => contextSafe(() => {
    tl.current?.kill();
    if (reducedMotion()) { setNow(to); return; }
    const t = { m: from };
    tl.current = gsap.to(t, { m: to, duration: PLAY, ease: 'none', onUpdate: () => setNow(Math.floor(t.m)) });
  })();
  useBlockMotion(root, ({ q, enter }) => {
    const rep = q('.bv-rep');
    if (!rep) return;
    gsap.from(rep, { y: 30, autoAlpha: 0, duration: 0.7, ease: 'expo.out', scrollTrigger: { ...enter(rep, 'top 75%'), onEnter: () => play() } });
  });

  const set = (sid: string, v: string) => { setOn(o => ({ ...o, [sid]: v })); setLast(sid); play(); };
  const lastSet = block.settings.find(s => s.id === last)!;
  const v = on[last];
  const line = lastSet.line.replace('{}', v === 'On' ? 'true' : v === 'Off' ? 'false' : v || '""');
  const checksSoFar = run.checks.filter(c => minutes(c.at) <= now).length;

  return (
    <section className="dt-block dt-sec pp-wrap bv-replay" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <p className="bv-rules-head pp-lede"><Accented text={block.head} /></p>}
      <div className="bv-rep">
        <ol className="bv-rep-feed" aria-label="What happens">
          <li className="bv-rep-ev" data-on=""><span className="pp-mono">{block.from}</span><span><b>First check:</b> where things stand is recorded, nothing alerts</span></li>
          {block.events.map((e, i) => {
            const shown = minutes(e.at) <= now;
            const checked = run.checks.some(c => minutes(c.at) >= minutes(e.at) && minutes(c.at) <= now);
            const skip = checked ? run.skipped[i] : undefined;
            return (
              <li key={e.at} className="bv-rep-ev" data-on={shown || undefined} data-skip={skip ? '' : undefined}>
                <span className="pp-mono">{e.at}</span>
                <span><b>{e.who}</b> {e.what}{skip && <em className="pp-mono">skipped · {skip}</em>}</span>
              </li>
            );
          })}
        </ol>
        <div className="bv-rep-clock" aria-hidden="true">
          <b className="pp-display">{hhmm(now)}</b>
          <span className="pp-mono">{checksSoFar} {checksSoFar === 1 ? 'check' : 'checks'} · {fired.reduce((k, c) => k + c.alerts.length, 0)} alerts</span>
        </div>
        <div className="bv-rep-reach">{SURFACES[block.surfaces]({ fired, on, clock: hhmm(now) })}</div>
      </div>
      <div className="bv-rep-sets">
        {block.settings.map(s => (s.options.length === 2 && s.options[0] === 'Off' ? (
          <button key={s.id} type="button" className="bv-rep-set" aria-pressed={on[s.id] === 'On'} onClick={() => set(s.id, on[s.id] === 'On' ? 'Off' : 'On')}><i />{s.label}</button>
        ) : (
          <span key={s.id} className="bv-rep-set bv-rep-set--seg" role="radiogroup" aria-label={s.label}>
            {s.label}{s.options.map(o => <button key={o} type="button" role="radio" aria-checked={on[s.id] === o} onClick={() => set(s.id, o)}>{o || 'none'}</button>)}
          </span>
        )))}
        <button type="button" className="pp-btn pp-btn--ghost bv-rep-again" onClick={() => play()}>Replay</button>
      </div>
      <p className="bv-rep-cmd pp-mono"><code>{line}</code><button type="button" onClick={() => copy(line)}>{copied ? 'Copied' : 'Copy'}</button></p>
      {block.note && <p className="bc-note bv-rules-note">{block.note}</p>}
    </section>
  );
}
