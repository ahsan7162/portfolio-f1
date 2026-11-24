// The plugin's Time and planning, and Inputs and learning, groups drawn. The ones that answer back (Plan,
// Decision, Choice, Quiz, FollowUps) send the same words the plugin sends; the maths is the plugin's own.
import { useEffect, useRef, useState } from 'react';
import { Toggle } from '@ui-sdk/react/toggle';
import { Radio, RadioGroup } from '@ui-sdk/react/radio';
import { Flip, reducedMotion, useGSAP } from '../../motion';
import { Btn, els, fmt, list, Md, num, nums, rec, Sendbar, State, str, strs, useOui, type Draw, type Tone } from './kit';
import type { El } from './lang';
import { clock, quizScore } from './plugin/inputs';
import { dayOf, humanize, monthGrid, monthOf, monthTitle, ordered, pert, rank, shiftMonth, shortDate, totals, weightedScore } from './plugin/planning';

/** "Today" for drawings dated around the page's invented release: a fixed day, so the page never goes stale. */
export const TODAY = dayOf('2026-11-12')!;

// ---------------------------------------------------------------- planning

function Timeline({ e }: { e: El }) {
  return (
    <ol className="oui-timeline">{els(e.props.items).map((it, i) => (
      // oxlint-disable-next-line react/no-array-index-key -- events can repeat a title; their place is their identity
      <li key={`${i}-${str(it.props.title)}`} data-t={str(it.props.tone) || undefined}>
        <time>{str(it.props.time)}</time><b>{str(it.props.title)}</b>{it.props.detail != null && <p>{str(it.props.detail)}</p>}
      </li>
    ))}</ol>
  );
}

function Calendar({ e }: { e: El }) {
  const events = els(e.props.events).map((ev) => ({ day: dayOf(str(ev.props.date)), title: str(ev.props.title), t: str(ev.props.tone) }));
  const first = monthOf(str(e.props.month)) ?? monthOf(str(els(e.props.events)[0]?.props.date)) ?? monthOf('2026-11')!;
  const [month, setMonth] = useState(first);
  return (
    <div className="oui-calendar">
      <p className="oui-cal-head"><button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button><b>{monthTitle(month)}</b><button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button></p>
      <div className="oui-cal-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="oui-label">{d}</span>)}
        {monthGrid(month).flat().map((d, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- grid cells, by position
          <div key={i} className="oui-cal-day" data-blank={d === null || undefined}>
            {d !== null && <><time>{new Date(d * 864e5).getUTCDate()}</time>{events.filter((ev) => ev.day === d).slice(0, 2).map((ev) => <span key={ev.title} data-t={ev.t || undefined}>{ev.title}</span>)}
              {events.filter((ev) => ev.day === d).length > 2 && <small>+{events.filter((ev) => ev.day === d).length - 2} more</small>}</>}
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, Tone> = { done: 'good', active: 'accent', planned: 'neutral', 'at-risk': 'warn', blocked: 'bad' };

function Roadmap({ e }: { e: El }) {
  const items = els(e.props.items).map((it) => ({
    title: str(it.props.title), start: dayOf(str(it.props.start)) ?? TODAY, end: dayOf(str(it.props.end)) ?? TODAY,
    lane: str(it.props.lane, 'Work'), status: str(it.props.status, 'planned'), milestone: it.props.milestone === true,
  }));
  if (!items.length) return null;
  const lo = Math.min(...items.map((i) => i.start)) - 2;
  const hi = Math.max(...items.map((i) => i.end)) + 3;
  const x = (d: number) => ((d - lo) / (hi - lo)) * 100;
  const lanes = ordered(items.map((i) => i.lane));
  const marks = [lo + 2, ...Array.from({ length: 4 }, (_, k) => lo + 2 + Math.round(((k + 1) * (hi - lo - 5)) / 4))];
  return (
    <div className="oui-roadmap" role="img" aria-label={`Roadmap of ${items.length} items in ${lanes.length} lanes`}>
      <div className="oui-rm-axis">{marks.map((m) => <span key={m} style={{ left: `${x(m)}%` }}>{shortDate(m)}</span>)}</div>
      {lanes.map((lane) => (
        <div key={lane} className="oui-rm-lane">
          <span className="oui-label">{lane}</span>
          <div className="oui-rm-rows">
            {items.filter((i) => i.lane === lane).map((i) => i.milestone
              ? <span key={i.title} className="oui-rm-ms" style={{ left: `${x(i.start)}%` }}><i />{i.title}</span>
              : <span key={i.title} className="oui-rm-bar oui-grow-x" data-t={STATUS_TONE[i.status]} style={{ left: `${x(i.start)}%`, width: `${Math.max(2, x(i.end) - x(i.start))}%` }}>{i.title}</span>)}
          </div>
        </div>
      ))}
      <i className="oui-rm-today" style={{ left: `calc(var(--rm-lane) + (100% - var(--rm-lane)) * ${x(TODAY) / 100})` }}><span>Today</span></i>
    </div>
  );
}

function Board({ e }: { e: El }) {
  const items = els(e.props.items);
  const cols = strs(e.props.columns).length ? strs(e.props.columns) : ordered(items.map((i) => str(i.props.status)));
  return (
    <div className="oui-board" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(8em, 1fr))` }}>
      {cols.map((c) => {
        const cards = items.filter((i) => str(i.props.status) === c);
        return (
          <section key={c}><h5>{c}<span>{cards.length}</span></h5>
            {cards.map((k) => (
              <article key={str(k.props.title)}><b>{str(k.props.title)}</b>{k.props.detail != null && <p>{str(k.props.detail)}</p>}
                <footer>{k.props.owner != null && <span>{str(k.props.owner)}</span>}{strs(k.props.tags).map((t) => <span key={t} className="oui-tag">{t}</span>)}</footer>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

const HEALTH: Record<string, [Tone, string]> = { 'on-track': ['good', 'On track'], 'at-risk': ['warn', 'At risk'], 'off-track': ['bad', 'Off track'], done: ['neutral', 'Done'] };

function Status({ e }: { e: El }) {
  return (
    <ul className="oui-status">{els(e.props.items).map((it) => {
      const [t, word] = HEALTH[str(it.props.status)] ?? ['neutral', humanize(str(it.props.status))];
      const p = num(it.props.progress);
      const due = dayOf(str(it.props.due));
      return (
        <li key={str(it.props.name)}>
          <b>{str(it.props.name)}</b><State t={t}>{word}</State>
          {p !== undefined && <span className="oui-bar" data-t={t}><i className="oui-grow-x" style={{ transform: `scaleX(${p / 100})` }} /></span>}
          <span className="oui-label">{[str(it.props.owner), due !== null ? `due ${shortDate(due)}` : ''].filter(Boolean).join(', ')}</span>
          {it.props.note != null && <p>{str(it.props.note)}</p>}
        </li>
      );
    })}</ul>
  );
}

function Plan({ e }: { e: El }) {
  const steps = els(e.props.steps).filter((s) => str(s.props.title));
  if (!steps.length) return null;
  const high = steps.filter((s) => s.props.risk === 'high').length;
  return (
    <section className="oui-plan" aria-label="Plan">
      <p className="oui-label">{steps.length} step{steps.length === 1 ? '' : 's'}{high ? `, ${high} high risk` : ''}</p>
      <ol>{steps.map((s, i) => (
        <li key={str(s.props.title)} className="oui-plan-step">
          <span className="oui-plan-n" aria-hidden="true">{i + 1}</span>
          <b>{str(s.props.title)}</b>
          {s.props.detail != null && <p className="oui-label">{str(s.props.detail)}</p>}
          {strs(s.props.files).length > 0 && <ul className="oui-files">{strs(s.props.files).map((f) => <li key={f}>{f}</li>)}</ul>}
          <span className="oui-plan-meta">
            {s.props.risk === 'high' ? <State t="warn">High risk</State> : s.props.risk != null && <span className="oui-label">{humanize(str(s.props.risk))} risk</span>}
            {s.props.estimate != null && <span className="oui-label">{str(s.props.estimate)}</span>}
          </span>
        </li>
      ))}</ol>
      <Sendbar actions={[
        { label: 'Approve the plan', text: 'Approve the plan', primary: true },
        { label: 'Change something', text: 'I want to change something in the plan before you start.' },
      ]} />
    </section>
  );
}

const MAX_WEIGHT = 5;
/** What Go with sends, word for word as the plugin writes it (planning.tsx, Decision). */
export const decisionMessage = (name: string, criteria: string[], weights: number[]) =>
  `Go with ${name} (weights: ${criteria.map((c, i) => `${c} ${weights[i]}`).join(', ')})`;

function Decision({ e }: { e: El }) {
  const { ask, streaming } = useOui();
  const options = els(e.props.options).map((o) => ({ name: str(o.props.name), scores: nums(o.props.scores), pros: strs(o.props.pros), cons: strs(o.props.cons) })).filter((o) => o.name);
  const criteria = strs(e.props.criteria);
  const initial = nums(e.props.weights);
  const [tuned, setTuned] = useState<number[] | null>(null);
  const [sent, setSent] = useState(false);
  const weights = criteria.map((_, i) => tuned?.[i] ?? initial[i] ?? 3);
  const order = rank(options, weights);
  const leader = options[order[0]];
  const root = useRef<HTMLElement>(null);
  const before = useRef<Flip.FlipState | null>(null);
  useGSAP(() => {
    if (before.current) Flip.from(before.current, { duration: 0.45, ease: 'power3.inOut' });
    before.current = null;
  }, { scope: root, dependencies: [order.join()] });
  const setWeight = (i: number, w: number) => {
    if (!reducedMotion() && root.current) before.current = Flip.getState(root.current.querySelectorAll('.oui-dec-row'));
    setTuned(weights.map((old, j) => (j === i ? Math.min(MAX_WEIGHT, Math.max(0, w)) : old)));
  };
  return (
    <section className="oui-decision" aria-label="Decision" ref={root}>
      <fieldset className="oui-weights" disabled={streaming}>
        <legend className="oui-label">Weights: how much each criterion matters, 0 to {MAX_WEIGHT}</legend>
        {criteria.map((c, i) => (
          <span key={c} className="oui-weight">
            <span>{c}</span>
            <button type="button" aria-label={`Less weight on ${c}`} disabled={weights[i] <= 0 || sent} onClick={() => setWeight(i, weights[i] - 1)}>−</button>
            <output aria-live="polite" aria-label={`${c} weight`}>{weights[i]}</output>
            <button type="button" aria-label={`More weight on ${c}`} disabled={weights[i] >= MAX_WEIGHT || sent} onClick={() => setWeight(i, weights[i] + 1)}>+</button>
          </span>
        ))}
      </fieldset>
      <ol className="oui-dec-rows">{order.map((k, i) => {
        const o = options[k];
        const share = weightedScore(o.scores, weights);
        return (
          <li key={o.name} className="oui-dec-row" data-flip-id={o.name} data-lead={i === 0 || undefined}>
            <b>{o.name}{i === 0 && <small>Leading</small>}</b>
            <span className="oui-bar"><i style={{ transform: `scaleX(${share})` }} /></span>
            <output>{Math.round(share * 100)}%</output>
            <p className="oui-label">{[o.pros[0], o.cons[0]].filter(Boolean).join('. ')}</p>
          </li>
        );
      })}</ol>
      {leader && (
        <div className="oui-actions">
          <Btn primary sent={sent} disabled={sent} onClick={() => { setSent(true); ask(decisionMessage(leader.name, criteria, weights)); }}>{sent ? 'Sent' : `Go with ${leader.name}`}</Btn>
        </div>
      )}
    </section>
  );
}

function Choice({ e }: { e: El }) {
  const { ask, streaming } = useOui();
  const options = els(e.props.options);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const o = options[Math.min(at, options.length - 1)];
  if (!o) return null;
  const title = str(o.props.title);
  return (
    <section className="oui-choice" aria-label="Choice">
      {e.props.question != null && <p className="oui-text" data-size="large-heavy">{str(e.props.question)}</p>}
      <article>
        <div className="oui-noimg" aria-hidden="true"><span>preview image</span></div>
        <h5>{title}{o.props.recommended === true && <span className="oui-tag" data-t="success">Recommended</span>}</h5>
        <ul>{strs(o.props.points).map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="oui-tags">{strs(o.props.tags).map((t) => <span key={t} className="oui-tag">{t}</span>)}</p>
        <Btn primary sent={picked === title} disabled={picked !== null || streaming} onClick={() => { setPicked(title); ask(`Go with ${title}`); }}>Go with {title}</Btn>
      </article>
      <p className="oui-dots">
        <button type="button" aria-label="Previous option" onClick={() => setAt((at + options.length - 1) % options.length)}>‹</button>
        {options.map((x, i) => <i key={str(x.props.title)} data-on={i === at || undefined} />)}
        <button type="button" aria-label="Next option" onClick={() => setAt((at + 1) % options.length)}>›</button>
      </p>
    </section>
  );
}

function Estimate({ e }: { e: El }) {
  const tasks = els(e.props.tasks).map((t) => ({ title: str(t.props.title), low: num(t.props.low) ?? 0, high: num(t.props.high) ?? 0, likely: num(t.props.likely) }));
  if (!tasks.length) return null;
  const unit = str(e.props.unit);
  const hi = Math.max(...tasks.map((t) => t.high));
  const all = totals(tasks);
  return (
    <section className="oui-estimate" aria-label="Estimate">
      <ul>{tasks.map((t) => {
        const p = pert(t.low, t.high, t.likely);
        return (
          <li key={t.title}><span>{t.title}</span>
            <span className="oui-range"><i className="oui-grow-x" style={{ left: `${(t.low / hi) * 100}%`, width: `${((t.high - t.low) / hi) * 100}%` }} /><b style={{ left: `${(p.mean / hi) * 100}%` }} /></span>
            <span className="oui-label">{fmt(t.low)} to {fmt(t.high)} {unit}</span>
          </li>
        );
      })}</ul>
      <p className="oui-est-total"><span>Total</span><b>{fmt(all.p50, { decimals: 1 })} {unit}</b><span className="oui-label">likely (P50)</span><b>{fmt(all.p90, { decimals: 1 })} {unit}</b><span className="oui-label">to be safe (P90)</span></p>
    </section>
  );
}

const CRIT: Record<string, Tone> = { passed: 'good', failed: 'bad', blocked: 'warn', untested: 'neutral', claimed: 'info' };

function Acceptance({ e }: { e: El }) {
  const columns = strs(e.props.columns);
  const rows = els(e.props.criteria).map((c) => ({ name: str(c.props.name), status: str(c.props.status), note: str(c.props.note), evidence: str(c.props.evidence), cells: strs(c.props.cells) }));
  const overall = (r: (typeof rows)[number]) => r.status || r.cells[r.cells.length - 1] || 'untested';
  const counts = ordered(rows.map(overall)).map((s) => `${rows.filter((r) => overall(r) === s).length} ${s}`);
  return (
    <section className="oui-accept" aria-label="Acceptance">
      <p className="oui-label">{counts.join(', ')}</p>
      <table className="oui-table">
        <thead><tr><th>Criterion</th>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.name}><td><b>{r.name}</b>{(r.note || r.evidence) && <span className="oui-label">{r.note}{r.evidence && <code>{r.evidence}</code>}</span>}</td>
            {(columns.length ? r.cells : [overall(r)]).map((c, i) => <td key={columns[i] ?? i}><State t={CRIT[c] ?? 'neutral'}>{humanize(c)}</State></td>)}
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

// ---------------------------------------------------------------- inputs and learning

function Stepper({ e }: { e: El }) {
  const [v, setV] = useState(num(e.props.value) ?? num(e.props.min) ?? 0);
  const step = num(e.props.step) ?? 1;
  const [lo, hi] = [num(e.props.min) ?? -Infinity, num(e.props.max) ?? Infinity];
  return (
    <label className="oui-stepper"><span>{str(e.props.label, str(e.props.name))}</span>
      <span><button type="button" aria-label="Less" disabled={v - step < lo} onClick={() => setV(v - step)}>−</button><output>{v}</output><button type="button" aria-label="More" disabled={v + step > hi} onClick={() => setV(v + step)}>+</button></span>
    </label>
  );
}

function Rating({ e }: { e: El }) {
  const max = num(e.props.max) ?? 5;
  const [v, setV] = useState(num(e.props.value) ?? 0);
  return (
    <RadioGroup className="oui-rating" aria-label={str(e.props.label, 'Rating')} value={v ? String(v) : null} onValueChange={(x) => setV(Number(x))}>
      {e.props.label != null && <span>{str(e.props.label)}</span>}
      {Array.from({ length: max }, (_, i) => <Radio key={i} value={String(i + 1)} aria-label={`${i + 1} of ${max}`} data-on={i < v || undefined}>★</Radio>)}
    </RadioGroup>
  );
}

function ListEditor({ e }: { e: El }) {
  const [items, setItems] = useState(strs(e.props.value));
  const [draft, setDraft] = useState('');
  return (
    <div className="oui-listed"><span className="oui-label">{str(e.props.label, str(e.props.name))}</span>
      {/* oxlint-disable-next-line react/no-array-index-key -- items can repeat; their place is their identity */}
      <ol>{items.map((it, i) => <li key={`${i}-${it}`}>{it}<button type="button" aria-label={`Remove ${it}`} onClick={() => setItems(items.filter((_, k) => k !== i))}>×</button></li>)}</ol>
      <form onSubmit={(ev) => { ev.preventDefault(); if (draft.trim()) { setItems([...items, draft.trim()]); setDraft(''); } }}>
        <input value={draft} placeholder={str(e.props.placeholder, 'Add an item')} aria-label="New item" onChange={(ev) => setDraft(ev.target.value)} /><Btn>Add</Btn>
      </form>
    </div>
  );
}

function Swatches({ e }: { e: El }) {
  const colors = list(e.props.colors).map((c) => (typeof c === 'string' ? { value: c, name: c } : { value: str(rec(c).value), name: str(rec(c).name, str(rec(c).value)) }));
  const [on, setOn] = useState<string | null>(null);
  return (
    <div className="oui-swatches"><span className="oui-label">{str(e.props.label)}</span>
      {colors.map((c) => <Toggle key={c.value} pressed={on === c.value} onPressedChange={() => setOn(c.value)}><i style={{ background: c.value }} />{c.name}</Toggle>)}
    </div>
  );
}

function FollowUps({ e }: { e: El }) {
  const { ask, streaming } = useOui();
  const [sent, setSent] = useState<string | null>(null);
  return (
    <ul className="oui-follow" aria-label="Suggested next questions">{strs(e.props.prompts).map((p) => (
      <li key={p}><button type="button" disabled={streaming || sent !== null} data-sent={sent === p || undefined} onClick={() => { setSent(p); ask(p); }}>{p}<span aria-hidden="true">↗</span></button></li>
    ))}</ul>
  );
}

function Timer({ e }: { e: El }) {
  const total = (num(e.props.seconds) ?? 0) * 1000;
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setMs((m) => (total && m + 250 >= total ? (setRun(false), total) : m + 250)), 250);
    return () => clearInterval(t);
  }, [run, total]);
  return (
    <div className="oui-timer"><span className="oui-label">{str(e.props.label, total ? 'Countdown' : 'Stopwatch')}</span>
      <b>{clock(total ? total - ms : ms, !total)}</b>
      <span className="oui-actions"><Btn primary onClick={() => setRun(!run)}>{run ? 'Pause' : 'Start'}</Btn><Btn onClick={() => { setRun(false); setMs(0); }}>Reset</Btn></span>
    </div>
  );
}

function Quiz({ e }: { e: El }) {
  const { ask, streaming } = useOui();
  const qs = els(e.props.questions).map((q) => ({ q: str(q.props.q), options: strs(q.props.options), answer: num(q.props.answer), why: str(q.props.why) }));
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>([]);
  const [checked, setChecked] = useState(false);
  const [sent, setSent] = useState(false);
  if (!qs.length) return null;
  const score = quizScore(picks, qs.map((q) => q.answer));
  if (at >= qs.length) {
    const missed = qs.filter((q, i) => picks[i] !== q.answer).map((q) => q.q);
    const message = `My quiz score: ${score} of ${qs.length}.${missed.length ? ` I missed: ${missed.join(' | ')}` : ''}`;
    return (
      <div className="oui-quiz-end"><span className="oui-label">Your score</span><b className="oui-figure">{score} of {qs.length}</b>
        <span className="oui-actions">
          <Btn primary sent={sent} disabled={sent || streaming} onClick={() => { setSent(true); ask(message); }}>{sent ? 'Score sent' : 'Send my score'}</Btn>
          <Btn onClick={() => { setAt(0); setPicks([]); setChecked(false); setSent(false); }}>Try again</Btn>
        </span>
      </div>
    );
  }
  const q = qs[at];
  const pick = picks[at] ?? null;
  return (
    <div className="oui-quiz">
      <p className="oui-label">Question {at + 1} of {qs.length}</p>
      <b>{q.q}</b>
      <RadioGroup render={<ul />} value={pick === null ? null : String(pick)} onValueChange={(x) => setPicks(Object.assign([...picks], { [at]: Number(x) }))}>{q.options.map((o, i) => (
        <li key={o}><Radio value={String(i)} disabled={checked || streaming}
          data-right={checked && i === q.answer || undefined} data-wrong={checked && pick === i && i !== q.answer || undefined}>{o}</Radio></li>
      ))}</RadioGroup>
      {checked && <p className="oui-why" data-ok={pick === q.answer || undefined}><b>{pick === q.answer ? 'Right.' : 'Not quite.'}</b> {q.why}</p>}
      <span className="oui-actions">{checked
        ? <Btn primary onClick={() => { setAt(at + 1); setChecked(false); }}>{at + 1 < qs.length ? 'Next question' : 'See my score'}</Btn>
        : <Btn primary disabled={pick === null} onClick={() => setChecked(true)}>Check</Btn>}</span>
    </div>
  );
}

function Flashcards({ e }: { e: El }) {
  const cards = els(e.props.cards).map((c) => ({ front: str(c.props.front), back: str(c.props.back) }));
  const [at, setAt] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(0);
  const c = cards[at % Math.max(1, cards.length)];
  if (!c) return null;
  const next = (k: boolean) => { setKnown(known + (k ? 1 : 0)); setFlip(false); setAt(at + 1); };
  return (
    <div className="oui-flash">
      <p className="oui-label">Card {(at % cards.length) + 1} of {cards.length}, {known} known</p>
      <button type="button" className="oui-card-face" data-flip={flip || undefined} onClick={() => setFlip(!flip)} aria-label={flip ? 'Show the front' : 'Show the answer'}>
        <span><Md text={c.front} /></span><span><Md text={c.back} /></span>
      </button>
      <span className="oui-actions"><Btn onClick={() => next(false)}>Again</Btn><Btn primary onClick={() => next(true)}>Known</Btn></span>
    </div>
  );
}

function Walkthrough({ e }: { e: El }) {
  const steps = els(e.props.steps);
  const [at, setAt] = useState(0);
  const s = steps[at];
  if (!s) return null;
  return (
    <div className="oui-walk">
      <span className="oui-bar"><i style={{ transform: `scaleX(${(at + 1) / steps.length})` }} /></span>
      <p className="oui-label">Step {at + 1} of {steps.length}</p>
      <b>{str(s.props.title)}</b><p><Md text={str(s.props.body)} /></p>
      {s.props.code != null && <pre className="oui-code"><code>{str(s.props.code)}</code></pre>}
      <span className="oui-actions"><Btn disabled={at === 0} onClick={() => setAt(at - 1)}>Previous</Btn><Btn primary disabled={at === steps.length - 1} onClick={() => setAt(at + 1)}>Next</Btn></span>
    </div>
  );
}

export const PLANNING: Record<string, Draw> = {
  Timeline, Calendar, Roadmap, Board, Status, Plan, Decision, Choice, Estimate, Acceptance,
  Stepper, Rating, ListEditor, Swatches, FollowUps, Timer, Quiz, Flashcards, Walkthrough,
};
