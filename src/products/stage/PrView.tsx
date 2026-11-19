// PR Dashboard drawn in code: the pieces its demo and its blocks (rules, compose, replay) draw with. A lookalike
// of the plugin in bb's dark theme, on its own tokens (MASTER.md); styles in pr-demo.css under `prd-`.
import type { ReactNode } from 'react';
import { FINDINGS, PR, THREAD, type FindingKey } from './prSample';
import { readyLabel, type PrFacts, type Tone } from './pr';
import '../styles/pr-demo.css';

// Lucide's icon paths (ISC licence), the set the plugin draws with.
const PATHS = {
  pr: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12" /></>,
  draft: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M18 6V5M18 11v-1M6 9v12" /></>,
  x: <><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  fix: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  msg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  merge: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  ext: <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  sliders: <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />,
  refresh: <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></>,
  chev: <path d="m6 9 6 6 6-6" />,
  back: <path d="M19 12H5m7 7-7-7 7-7" />,
  file: <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4" />,
  diff: <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM9 10h6M12 7v6M9 17h6" />,
  commit: <><circle cx="12" cy="12" r="3" /><path d="M3 12h6M15 12h6" /></>,
  home: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  book: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  layers: <path d="m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
};
export type GlyphName = keyof typeof PATHS;
export const G = ({ n }: { n: GlyphName }) => <svg className="prd-g" viewBox="0 0 24 24" aria-hidden="true">{PATHS[n]}</svg>;

const TONE_ICON: Partial<Record<Tone, GlyphName>> = { bad: 'x', warn: 'clock', good: 'check' };
export const toneOf = (b: string): Tone => (/conflict|failing|changes requested|unresolved/i.test(b) ? 'bad' : /running|awaiting/i.test(b) ? 'warn' : /ready|approved/i.test(b) ? 'good' : 'neutral');

export function Pill({ tone, icon, children }: { tone: Tone; icon?: GlyphName | false; children: ReactNode }) {
  const g = icon === false ? undefined : (icon ?? TONE_ICON[tone]);
  return <span className="prd-pill" data-tone={tone}>{g && <G n={g} />}{children}</span>;
}
export const Spine = ({ tone }: { tone: Tone }) => <i className="prd-spine" data-tone={tone} aria-hidden="true" />;
export const Av = ({ who }: { who: string }) => <span className="prd-av" aria-hidden="true">{who.slice(0, 2)}</span>;

/** The pills a row leads with: its blockers, or that nothing blocks it. */
export function Blockers({ blockers, facts, icons = true }: { blockers: string[]; facts: PrFacts; icons?: boolean }) {
  if (!blockers.length) return <span className="prd-pills"><Pill tone="good" icon={icons ? undefined : false}>{readyLabel(facts)}</Pill></span>;
  return <span className="prd-pills">{blockers.map(b => <Pill key={b} tone={toneOf(b)} icon={icons && toneOf(b) !== 'neutral' ? undefined : false}>{b}</Pill>)}</span>;
}

/** A failed job's name as the plugin's list writes it: "test › unit". */
export const jobName = (k: FindingKey) => {
  const s = FINDINGS.find(f => f.key === k)!.subject;
  return s.kind === 'check' ? `${s.check.workflow} › ${s.check.name}` : k;
};

export interface RowData {
  number: number; title: string; additions: number; deletions: number; updated: string;
  blockers: string[]; tone: Tone; draft: boolean; facts: PrFacts; jobs?: string[];
}
/** A pull request in the list: the spine carries its worst blocker. */
export function Row({ pr, onOpen, focused, hint }: { pr: RowData; onOpen?: () => void; focused?: boolean; hint?: boolean }) {
  const body = (
    <>
      <Spine tone={pr.tone} />
      <span className="prd-row-t"><span data-draft={pr.draft || undefined}><G n={pr.draft ? 'draft' : 'pr'} /></span>{pr.title}<span className="prd-row-x"><G n="ext" /></span></span>
      <Blockers blockers={pr.blockers} facts={pr.facts} />
      {pr.jobs && pr.jobs.length > 0 && <span className="prd-jobs">{pr.jobs.map(j => <span key={j} className="prd-job"><G n="x" /><em>{j.split(' › ')[0]} ›</em> {j.split(' › ')[1]}</span>)}</span>}
      <span className="prd-meta">
        <span>#{pr.number}</span><span className="prd-add">+{pr.additions}</span><span className="prd-del">−{pr.deletions}</span><span>updated {pr.updated}</span>
        {pr.facts.ci === 'passing' && <span className="prd-ci" data-tone="good"><G n="check" />CI passing</span>}
      </span>
    </>
  );
  return onOpen
    ? <button type="button" className="prd-row" data-pr={pr.number} data-focus={focused || undefined} data-hint={hint || undefined} onClick={onOpen}>{body}</button>
    : <div className="prd-row" data-pr={pr.number} data-focus={focused || undefined}>{body}</div>;
}

const RAIL: GlyphName[] = ['home', 'zap', 'book', 'layers', 'grid'];
/** bb's rail with the My PRs icon and its count of new alerts. */
export const RailMe = ({ badge }: { badge?: number }) => (
  <span className="prd-rail-me"><G n="pr" />{badge ? <span className="prd-badge" key={badge}>{badge}</span> : null}</span>
);
export function Win({ title = 'My PRs', badge, children, over, top }: { title?: string; badge?: number; children: ReactNode; over?: ReactNode; top?: ReactNode }) {
  return (
    <div className="prd-win">
      <div className="prd-rail" aria-hidden="true">{RAIL.map(n => <G key={n} n={n} />)}<RailMe badge={badge} /><span className="prd-rail-gap" /><G n="gear" /></div>
      <div className="prd-top"><G n="pr" />{title}{top}<span className="prd-top-end"><G n="sliders" /></span></div>
      <div className="prd-page">{children}</div>
      {over}
    </div>
  );
}

export const TABS: [string, number][] = [['Open', 6], ['Review requested', 3], ['Reviewed', 2], ['Assigned', 1], ['Merged', 128], ['Closed', 9]];
export function ListHead() {
  return (
    <>
      <div className="prd-bar1">
        <div className="prd-seg" aria-hidden="true">{TABS.map(([t, n], i) => <span key={t} data-on={i === 0 || undefined}>{t} <b data-tone={i === 1 ? 'warn' : undefined}>{n}</b></span>)}</div>
        <span className="prd-upd" aria-hidden="true"><span className="prd-upd-t">Updated just now</span><span className="prd-acct"><G n="user" />{PR.author}<G n="chev" /></span><G n="bell" /><G n="refresh" /></span>
      </div>
      <div className="prd-bar2" aria-hidden="true">
        <span className="prd-search"><G n="search" />Search title, #number, repo or author<kbd>/</kbd></span>
        <span className="prd-btn"><G n="sliders" />Repos 3</span>
      </div>
    </>
  );
}

export interface AlertLine { headline: string; detail: string; kind: string }
const alertTone = (a: AlertLine): Tone => (a.kind === 'ci' ? 'bad' : 'neutral');
/** The Open tab's right column: totals, and the alerts you haven't looked at. */
export function Side({ totals, alerts }: { totals: { failing: number; unresolved: number; changes: number; ready: number }; alerts: AlertLine[] }) {
  const stat = (l: string, v: number, t: Tone, g: GlyphName) => <div className="prd-stat" data-tone={t}><p><G n={g} />{l}</p><b key={v}>{v}</b></div>;
  return (
    <div className="prd-side">
      <div className="prd-stats">
        {stat('CI failing', totals.failing, 'bad', 'x')}{stat('Unresolved comments', totals.unresolved, 'bad', 'msg')}
        {stat('Changes requested', totals.changes, 'warn', 'diff')}{stat('Ready to merge', totals.ready, 'good', 'merge')}
      </div>
      {alerts.length > 0 && <AlertList alerts={alerts} />}
    </div>
  );
}
export function AlertList({ alerts }: { alerts: AlertLine[] }) {
  return (
    <div className="prd-new">
      <p className="prd-new-h"><G n="bell" />New since you last looked</p>
      {alerts.map(a => <div className="prd-alert" key={a.headline} data-tone={alertTone(a)}><G n={a.kind === 'ci' ? 'x' : 'msg'} /><p><strong>{a.headline}</strong>{a.detail}</p></div>)}
    </div>
  );
}

/** A bb toast. An alert's is its headline and detail with Open; a hand-off's says where it went. */
export function Toast({ tone = 'good', icon = 'check', title, body, action }: { tone?: Tone; icon?: GlyphName; title: string; body?: string; action?: string }) {
  return <div className="prd-toast" data-tone={tone} role="status"><G n={icon} /><div><strong>{title}</strong>{body && <p>{body}</p>}</div>{action && <span className="prd-btn prd-btn--sm">{action}</span>}</div>;
}
export const AlertToast = ({ a }: { a: AlertLine }) => <Toast tone={alertTone(a)} icon={a.kind === 'ci' ? 'x' : 'msg'} title={a.headline} body={a.detail} action="Open" />;

/** A desktop notification, sent through bb's Push notifications plugin: one per check. */
export const Banner = ({ title, body }: { title: string; body: string }) => (
  <div className="prd-banner" role="status"><span className="prd-app-ic">bb</span><div><strong>{title}</strong><p>{body}</p></div><small>now</small></div>
);

/** A failed job: its errors from the run, and Fix with agent. */
export function CheckCard({ k, done, running, action }: { k: FindingKey; done?: boolean; running?: boolean; action?: ReactNode }) {
  const s = FINDINGS.find(f => f.key === k)!.subject;
  if (s.kind !== 'check') return null;
  const c = s.check;
  const tone = done ? 'good' : running ? 'warn' : 'bad';
  return (
    <div className="prd-card" data-tone={tone} data-k={k}>
      <Spine tone={tone} />
      <div className="prd-card-h"><G n={done ? 'check' : running ? 'clock' : 'x'} /><div><strong>{c.name}</strong><small>{c.workflow}</small></div><Pill tone={tone} icon={false}>{done ? 'Passed' : running ? 'Running' : 'Failed'}</Pill></div>
      {!done && !running && <>
        <p>{c.title}</p>
        <div className="prd-anns">{c.annotations.map(a => <p className="prd-ann" key={a.line}><G n="x" /><code>{a.path}:{a.line}</code><span>{a.message}</span></p>)}</div>
        {action && <div className="prd-acts">{action}<span className="prd-btn"><G n="ext" />View logs</span></div>}
      </>}
    </div>
  );
}

/** A review thread: the comment and its replies, who it waits on, and Fix with agent. */
export function ThreadCard({ k, done, action }: { k: FindingKey; done?: boolean; action?: ReactNode }) {
  const s = FINDINGS.find(f => f.key === k)!.subject;
  if (s.kind !== 'thread') return null;
  const t = s.thread;
  const where = t.startLine ? `${t.startLine}–${t.line}` : `${t.line}`;
  const [dir, file] = [t.path.slice(0, t.path.lastIndexOf('/') + 1), t.path.slice(t.path.lastIndexOf('/') + 1)];
  return (
    <div className="prd-card" data-tone={done ? 'good' : 'warn'} data-k={k}>
      <Spine tone={done ? 'good' : 'warn'} />
      <p className="prd-thr-path">{dir}<b>{file}</b>:{where}{done ? <Pill tone="good">Resolved</Pill> : <Pill tone="warn">Waiting on your reply</Pill>}</p>
      {!done && <>
        {t.comments.map(c => <div className="prd-cmt" key={c.id}><Av who={c.author} /><div><small><b>{c.author}</b></small><p>{c.body.split('`').map((x, i) => (i % 2 ? <code key={x}>{x}</code> : x))}</p></div></div>)}
        {action && <div className="prd-acts"><span className="prd-btn"><G n="msg" />Reply</span>{action}</div>}
      </>}
    </div>
  );
}

/** The bb thread on the PR's branch, slid in when work is handed over. */
export function ThreadPanel({ prompt, steps, children }: { prompt: string; steps: { text: string; done: boolean }[]; children?: ReactNode }) {
  return (
    <aside className="prd-thread" aria-label={`bb thread: ${THREAD.title}`}>
      <div className="prd-thread-h">
        <strong><G n="msg" />{THREAD.title}</strong>
        <p><span>{THREAD.project}</span><code>{PR.headRefName}</code><span>the thread on the PR’s branch</span></p>
      </div>
      <div className="prd-thread-b">
        <div className="prd-msg"><pre>{sections(prompt).map(sec => (
          <span className="prd-msg-sec" key={sec.slice(0, 40)}>
            {/* oxlint-disable-next-line react/no-array-index-key -- lines of the prompt, by position */}
            {sec.split('\n').map((l, j) => <span key={j}>{l.startsWith('### ') ? <mark>{l}</mark> : l}{'\n'}</span>)}{'\n'}
          </span>
        ))}</pre></div>
        {steps.map(s => <p className="prd-step" key={s.text} data-live={s.done ? undefined : ''}><G n={s.done ? 'check' : 'clock'} />{s.text}</p>)}
        {children}
      </div>
    </aside>
  );
}

/** A prompt cut into its opening, one block per finding, and its closing line (for marking and revealing). */
export function sections(text: string) {
  const out: string[][] = [[]];
  for (const l of text.split('\n')) {
    if (l.startsWith('### ') || l.startsWith('Work through')) out.push([]);
    out[out.length - 1].push(l);
  }
  return out.map(s => s.join('\n').replace(/\n+$/, '')).filter(Boolean);
}
