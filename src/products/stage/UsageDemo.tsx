// Usage Explorer, playable: the plugin's limits screen drawn in code over a sample week (usageWeek.ts). Every window is
// read and worded by the plugin's own rules (usageRules.ts), and the headline is the worst window's verdict, as on the
// plugin. When it first comes into view the week plays to four moments and holds on each; dragging the week takes over,
// and Play carries on from where it is (from Monday once it has reached Thursday night). With reduced motion nothing
// plays by itself, and Play steps to the next moment.
import { useEffect, useId, useRef, useState } from 'react';
import { gsap, reducedMotion } from '../motion';
import type { DemoProps } from '../types';
import { fmtDuration, leadOf, projectionOf, readWindow, verdictOf, type WindowRead } from './usageRules';
import { BEATS, clockAt, momentAt, nowAt, REST, WEEK_MINUTES } from './usageWeek';
import '../styles/usage-demo.css';

// The plugin's money formats (app.tsx).
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCost = (v: number) => (v > 0 && v < 0.01 ? '<$0.01' : usd.format(v));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Where a play from the start begins: Monday, before the first work. */
const START = 7 * 60;

function Tile({ r, blockCost }: { r: WindowRead; blockCost: number | null }) {
  const projection = projectionOf(r);
  return (
    <div className="ued-tile" data-state={r.state}>
      <div className="ued-lb">{r.w.label}</div>
      <div className="ued-n">{Math.round(r.leftPct)}%</div>
      <div className="ued-v">{verdictOf(r)}</div>
      {projection && <div className="ued-p">{projection}</div>}
      {blockCost !== null && <div className="ued-p">{fmtCost(blockCost)} so far this block</div>}
      {r.leftMs !== null && <div className="ued-r">Resets in {fmtDuration(r.leftMs)}</div>}
    </div>
  );
}

export function UsageDemo({ active }: DemoProps) {
  const id = useId();
  const [minute, setMinute] = useState(REST);
  const [playing, setPlaying] = useState(false);
  const run = useRef<gsap.core.Timeline | null>(null);
  const at = useRef(REST);
  const played = useRef(false);

  const stop = () => { run.current?.kill(); run.current = null; setPlaying(false); };
  const go = (m: number) => { at.current = m; setMinute(m); };

  /** Glide on through the moments still ahead, holding on each (from the start of the week once past them all). */
  const play = () => {
    stop();
    let from = at.current;
    if (from >= REST) { from = START; go(START); }
    if (reducedMotion()) { go(BEATS.find(b => b > from) ?? BEATS[0]); return; }
    const clock = { m: from };
    const tl = gsap.timeline({ onComplete: () => { run.current = null; setPlaying(false); } });
    for (const beat of BEATS.filter(b => b > from + 1)) {
      tl.to(clock, { m: beat, duration: Math.min(1.6, 0.7 + (beat - clock.m) / 2400), ease: 'power2.inOut', onUpdate: () => go(clock.m) })
        .to({}, { duration: beat === REST ? 0 : 2.2 });
      clock.m = beat;
    }
    clock.m = from;
    run.current = tl;
    setPlaying(true);
  };

  // The first time it is on screen, the week plays by itself; off screen it waits. (Through a ref: only `active` reruns it.)
  const first = useRef(play);
  useEffect(() => { first.current = () => { played.current = true; go(START); play(); }; });
  useEffect(() => {
    if (active && !played.current && !reducedMotion()) first.current();
    if (!active) run.current?.pause(); else run.current?.resume();
  }, [active]);
  // Unmounting (or React's test remount) stops the week and lets a fresh mount play it again.
  useEffect(() => () => { run.current?.kill(); run.current = null; played.current = false; }, []);

  const mo = momentAt(minute);
  const reads = mo.windows.map(w => readWindow(w, nowAt(minute)));
  const head = verdictOf(leadOf(reads));
  const chips = [mo.burn !== null ? `${usd.format(mo.burn)}/h right now` : 'Idle right now', `${fmtCost(mo.today)} today`, `${fmtCost(mo.week)} this week`];

  return (
    <div className="ued">
      <div className="ued-win">
        <div className="ued-bar" aria-hidden="true"><i />Usage Explorer</div>
        <div className="ued-pg">
          <div className="ued-top" aria-hidden="true"><span>Usage Explorer</span><span className="ued-seg">All providers · Today · 7 days · <b>30 days</b> · Cost</span></div>
          <h3 className="ued-head" key={head} aria-live="polite">{head}</h3>
          <p className="ued-plan">Claude Max (5x)</p>
          <div className="ued-tiles">
            {reads.map((r, i) => <Tile key={`${r.w.label}:${r.state}`} r={r} blockCost={i === 0 && mo.burn !== null ? mo.blockCost : null} />)}
          </div>
          <ul className="ued-chips" aria-label="Spend at a glance">{chips.map(c => <li key={c}>{c}</li>)}</ul>
        </div>
      </div>
      <div className="ued-week">
        <div className="ued-when">
          <label className="ued-clock" htmlFor={id}>{clockAt(minute)}</label>
          <button type="button" className="pp-btn pp-btn--ghost ued-play" onClick={() => (playing ? stop() : play())}>{playing ? 'Pause' : 'Play the week'}</button>
        </div>
        <input
          id={id} className="ued-range" type="range" min={0} max={WEEK_MINUTES - 1} step={15} value={Math.round(minute)}
          aria-label="Time in the sample week" aria-valuetext={clockAt(minute)}
          onPointerDown={stop} onKeyDown={stop} onChange={e => { stop(); go(Number(e.target.value)); }}
        />
        <div className="ued-days" aria-hidden="true">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
      </div>
    </div>
  );
}
