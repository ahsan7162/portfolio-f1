// The plugin's Reports, Structure and media, Workspace files and bb project groups, drawn. Reports read their
// rows through the plugin's own parsers (plugin/*.ts), so ordering and wording come from the plugin: failures
// first, worst coverage first, change in words. Project components show invented data: on this page there is
// no thread, branch or pull request to read.
import { useEffect, useState, type ReactNode } from 'react';
import { reducedMotion } from '../../motion';
import { els, fmt, list, Md, num, plain, rec, State, str, type Draw, type Tone } from './kit';
import type { El, Val } from './lang';
import { changeWords, parseBenchmark } from './plugin/benchmark';
import { countWords } from './plugin/common';
import { parseCoverage } from './plugin/coverage';
import { parseDependencies } from './plugin/dependencies';
import { parseFindings, type Severity } from './plugin/findings';
import { parsePipeline, type RunStatus } from './plugin/pipeline';
import { parseProvenance } from './plugin/provenance';
import { buildTree, diffStats, jsonKind, jsonSummary, webUrl, domainOf, type TreeNode } from './plugin/structure';
import { parseTests, type TestStatus } from './plugin/tests';
import { parseWaterfall } from './plugin/waterfall';

/** A report's frame: its title, then what it found, or why it could not read its source. */
function Report<T>({ title, source, parse, children }: { title: string; source: Val | undefined; parse: (rows: unknown[]) => T; children: (r: T) => ReactNode }) {
  if (typeof source === 'string') {
    return <section className="oui-report"><h5>{title}</h5><p className="oui-label">Reads <code>{source}</code> from the thread in bb.</p></section>;
  }
  let r: T;
  try { r = parse(plain(source) as unknown[]); } catch (err) {
    return <section className="oui-report"><h5>{title}</h5><p className="oui-label">{err instanceof Error ? err.message : 'Could not read the rows.'}</p></section>;
  }
  return <section className="oui-report"><h5>{title}</h5>{children(r)}</section>;
}

/** A row that folds away, as the plugin folds the passing ones. */
const Fold = ({ summary, children, open }: { summary: string; children: ReactNode; open?: boolean }) => (
  <details className="oui-fold" open={open}><summary>{summary}</summary>{children}</details>
);

const TEST: Record<TestStatus, Tone> = { failed: 'bad', passed: 'good', skipped: 'neutral' };
const testKey = (name: string, rows: unknown) => `t-${(rows as { name?: string }[]).findIndex((r) => r?.name === name)}`;

function Tests({ e }: { e: El }) {
  return (
    <Report title={str(e.props.title, 'Test results')} source={e.props.source} parse={parseTests}>
      {(run) => {
        const { failed, passed, skipped } = run.counts;
        const rows = plain(e.props.source);
        const of = (s: TestStatus) => run.cases.filter((c) => c.status === s);
        const items = (s: TestStatus) => (
          <ul className="oui-rows">{of(s).map((c) => (
            <li key={c.name} data-part={testKey(c.name, rows)}><State t={TEST[s]}>{s === 'failed' ? 'Failed' : s === 'passed' ? 'Passed' : 'Skipped'}</State>
              <b>{c.name}</b>{c.message && <p>{c.message}</p>}{c.file && <code>{c.file}{c.line ? `:${c.line}` : ''}</code>}</li>
          ))}</ul>
        );
        return (
          <>
            <p className="oui-lede" data-t={failed ? 'bad' : 'good'} data-part="t-head">{failed ? `${failed} of ${run.cases.length} failed` : `All ${run.cases.length} tests passed`}
              <span className="oui-label">{failed ? `, ${countWords([[passed, 'passed'], [skipped, 'skipped']])}` : ''}</span></p>
            {failed > 0 && items('failed')}
            {passed > 0 && <Fold summary={`${passed} passed`} open>{items('passed')}</Fold>}
            {skipped > 0 && <Fold summary={`${skipped} skipped`} open>{items('skipped')}</Fold>}
          </>
        );
      }}
    </Report>
  );
}

const RUN: Record<RunStatus, [Tone, string]> = {
  failure: ['bad', 'Failed'], success: ['good', 'Passed'], running: ['accent', 'Running'], queued: ['neutral', 'Queued'], cancelled: ['neutral', 'Cancelled'], skipped: ['neutral', 'Skipped'],
};

function Pipeline({ e }: { e: El }) {
  return (
    <Report title="Pipeline" source={e.props.source} parse={parsePipeline}>
      {(run) => (
        <>
          <p className="oui-lede" data-t={RUN[run.status][0]}>{RUN[run.status][1]}<span className="oui-label">, {countWords([[run.jobs.filter((j) => j.status === 'success').length, 'passed'], [run.jobs.filter((j) => j.status === 'failure').length, 'failed'], [run.jobs.filter((j) => j.status === 'skipped').length, 'skipped']])}</span></p>
          <ol className="oui-pipe">{run.jobs.map((j) => (
            <li key={j.name} data-part={`s-${j.name.toLowerCase()}`} data-t={RUN[j.status][0]}>
              <State t={RUN[j.status][0]}>{RUN[j.status][1]}</State><b>{j.name}</b>{j.time && <span className="oui-label">{j.time}</span>}
              {j.steps.length > 0 && <ol>{j.steps.map((s) => (
                <li key={s.name} data-part={`j-${s.name.toLowerCase()}`}><State t={RUN[s.status][0]}>{RUN[s.status][1]}</State><span>{s.name}</span>{s.time && <span className="oui-label">{s.time}</span>}</li>
              ))}</ol>}
            </li>
          ))}</ol>
        </>
      )}
    </Report>
  );
}

const SEV: Record<Severity, [Tone, string]> = { error: ['bad', 'Error'], warning: ['warn', 'Warning'], info: ['neutral', 'Note'] };
function Findings({ e }: { e: El }) {
  return (
    <Report title={str(e.props.title, 'Findings')} source={e.props.source} parse={parseFindings}>
      {(r) => (
        <>
          <p className="oui-lede" data-t={r.counts.error ? 'bad' : r.counts.warning ? 'warn' : 'good'}>{countWords([[r.counts.error, 'errors'], [r.counts.warning, 'warnings'], [r.counts.info, 'notes']]) || 'Nothing found'}</p>
          {r.files.map((g) => (
            <Fold key={g.file ?? '-'} summary={g.file ?? 'General'} open><ul className="oui-rows">{g.findings.map((f) => (
              <li key={`${f.title}-${f.line}`}><State t={SEV[f.severity][0]}>{SEV[f.severity][1]}{f.line ? `, line ${f.line}` : ''}</State><b>{f.title}</b>{f.detail && <p>{f.detail}</p>}{f.fix && <p className="oui-label">Fix: {f.fix}</p>}</li>
            ))}</ul></Fold>
          ))}
        </>
      )}
    </Report>
  );
}

function Coverage({ e }: { e: El }) {
  return (
    <Report title="Coverage" source={e.props.source} parse={parseCoverage}>
      {(r) => (
        <>
          <p className="oui-lede">{fmt(r.totals.lines?.pct, { decimals: 1, unit: '%' })}<span className="oui-label"> of lines</span></p>
          <ul className="oui-cov">{[...r.files].sort((a, b) => (a.metrics.lines?.pct ?? 0) - (b.metrics.lines?.pct ?? 0)).map((f) => (
            <li key={f.file}><code>{f.file}</code><span className="oui-bar" data-t={(f.metrics.lines?.pct ?? 0) < 60 ? 'warn' : 'accent'}><i className="oui-grow-x" style={{ transform: `scaleX(${(f.metrics.lines?.pct ?? 0) / 100})` }} /></span><b>{fmt(f.metrics.lines?.pct, { decimals: 0, unit: '%' })}</b></li>
          ))}</ul>
        </>
      )}
    </Report>
  );
}

function Dependencies({ e }: { e: El }) {
  return (
    <Report title="Dependencies" source={e.props.source} parse={parseDependencies}>
      {(r) => (
        <>
          <p className="oui-lede">{countWords([[r.outdated.filter((d) => d.gap === 'major').length, 'major'], [r.outdated.filter((d) => d.gap === 'minor').length, 'minor'], [r.outdated.filter((d) => d.gap === 'patch').length, 'patch']])}<span className="oui-label"> updates</span></p>
          <ul className="oui-rows">{r.outdated.map((d) => (
            <li key={d.name}><State t={d.gap === 'major' ? 'warn' : 'neutral'}>{d.gap === 'none' ? 'Up to date' : `${d.gap[0].toUpperCase()}${d.gap.slice(1)}`}</State><b>{d.name}</b><code>{d.current} to {d.latest}</code></li>
          ))}</ul>
        </>
      )}
    </Report>
  );
}

function Benchmark({ e }: { e: El }) {
  const unit = str(e.props.unit) || undefined;
  return (
    <Report title="Benchmark" source={e.props.source} parse={parseBenchmark}>
      {(r) => r.kind === 'compare' ? (
        <ul className="oui-bench">{r.rows.map((row) => (
          <li key={row.name} data-v={row.verdict}><b>{row.name}</b><span className="oui-label">{fmt(row.before, { unit })} to {fmt(row.after, { unit })}</span>
            <State t={row.verdict === 'better' ? 'good' : row.verdict === 'worse' ? 'bad' : 'neutral'}>{changeWords(row, unit)}</State></li>
        ))}</ul>
      ) : null}
    </Report>
  );
}

function Waterfall({ e }: { e: El }) {
  const unit = str(e.props.unit, 'ms');
  return (
    <Report title="Waterfall" source={e.props.source} parse={(rows) => parseWaterfall(rows, unit)}>
      {(t) => {
        const span = t.end - t.begin || 1;
        return (
          <ul className="oui-water">{t.spans.map((s) => (
            <li key={`${s.name}-${s.start}`} style={{ paddingLeft: `${s.depth * 0.9}em` }}><span>{s.name}</span>
              <span className="oui-water-track"><i className="oui-grow-x" data-root={s.depth === 0 || undefined} style={{ left: `${((s.start - t.begin) / span) * 100}%`, width: `${Math.max(0.6, (s.duration / span) * 100)}%` }} /></span>
              <b>{fmt(s.duration, { unit })}</b></li>
          ))}</ul>
        );
      }}
    </Report>
  );
}

function Provenance({ e }: { e: El }) {
  let r: ReturnType<typeof parseProvenance>;
  try { r = parseProvenance(plain(e.props.stages), plain(e.props.expected)); } catch { return null; }
  return (
    <section className="oui-report"><h5>What reached live</h5>
      {r.drift.length > 0 && <p className="oui-lede" data-t="warn">{r.drift.length} fact{r.drift.length > 1 ? 's' : ''} changed on the way</p>}
      <ol className="oui-prov">{r.stages.map((s) => (
        <li key={s.name}><State t={s.status === 'done' ? 'good' : s.status === 'failed' ? 'bad' : 'neutral'}>{s.name}</State>
          <dl>{s.facts.map((f) => <div key={f.key} data-drift={f.changed ? '' : undefined}><dt>{f.key}</dt><dd>{f.value}</dd></div>)}</dl></li>
      ))}</ol>
    </section>
  );
}

// ---------------------------------------------------------------- structure and media

function TreeRows({ nodes }: { nodes: TreeNode[] }) {
  return <ul>{nodes.map((n) => (
    <li key={n.key}>{n.children ? <details open><summary data-mono={n.mono || undefined}>{n.label}{n.note && <em>{n.note}</em>}</summary><TreeRows nodes={n.children} /></details>
      : <span data-mono={n.mono || undefined}>{n.label}{n.note && <em>{n.note}</em>}</span>}</li>
  ))}</ul>;
}
const Tree: Draw = ({ e }) => <div className="oui-treeview"><TreeRows nodes={buildTree(plain(e.props.items))} /></div>;

function JsonRows({ value, name, depth }: { value: unknown; name?: string; depth: number }) {
  const kind = jsonKind(value);
  const key = name !== undefined && <span className="oui-json-k">{name}</span>;
  if (kind !== 'object' && kind !== 'array') return <li>{key}<span className="oui-json-v" data-k={kind}>{JSON.stringify(value)}</span></li>;
  const entries = kind === 'array' ? (value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(value as object);
  return (
    <li><details open={depth < 2}><summary>{key}<span className="oui-label">{jsonSummary(value)}</span></summary>
      <ul>{entries.map(([k, v]) => <JsonRows key={k} name={k} value={v} depth={depth + 1} />)}</ul></details></li>
  );
}
const Json: Draw = ({ e }) => (
  <div className="oui-json">{e.props.label != null && <p className="oui-label">{str(e.props.label)}</p>}<ul><JsonRows value={plain(e.props.value)} depth={0} /></ul></div>
);

function Diff({ e }: { e: El }) {
  const patch = str(e.props.patch);
  const { added, removed } = diffStats(patch);
  const file = /^\+\+\+ (?:b\/)?(.+)$/m.exec(patch)?.[1];
  return (
    <section className="oui-diff">
      <p><code>{file ?? str(e.props.language, 'diff')}</code><span className="oui-label"><b data-t="good">+{added}</b> <b data-t="bad">−{removed}</b></span></p>
      <pre>{patch.split('\n').filter((l) => !/^(---|\+\+\+) /.test(l)).map((l, i) => (
        // oxlint-disable-next-line react/no-array-index-key -- lines of one patch, by position
        <span key={i} data-op={l.startsWith('@@') ? 'hunk' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : undefined}>{l || ' '}</span>
      ))}</pre>
    </section>
  );
}

function Sources({ e }: { e: El }) {
  const links = list(e.props.links).map((l) => (typeof l === 'string' ? { url: l } : { url: str(rec(l).url), title: str(rec(l).title), note: str(rec(l).note) }));
  return (
    <ol className="oui-sources">{links.map((l, i) => {
      const u = webUrl(l.url);
      return <li key={l.url}><span className="oui-cite">[{i + 1}]</span><b>{l.title || (u ? domainOf(u) : l.url)}</b>{u && <span className="oui-label">{domainOf(u)}</span>}{l.note && <p>{l.note}</p>}</li>;
    })}</ol>
  );
}

const NoImage = ({ label }: { label: string }) => <div className="oui-noimg"><span>{label}</span></div>;

const Entity: Draw = ({ e }) => (
  <section className="oui-entity">
    {e.props.image != null && <NoImage label="photo" />}
    <div><span className="oui-label">{str(e.props.kind, 'other')}</span><h5>{str(e.props.name)}</h5>{e.props.note != null && <p>{str(e.props.note)}</p>}
      <dl className="oui-kv">{Object.entries(rec(e.props.facts)).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{typeof v === 'object' ? JSON.stringify(v) : str(v, String(v))}</dd></div>)}</dl></div>
  </section>
);

function Compare({ e }: { e: El }) {
  const imgs = els(e.props.images);
  const [mode, setMode] = useState<'side' | 'wipe' | 'blink'>('side');
  return (
    <section className="oui-compare">
      <p className="oui-seg-ctl">{(['side', 'wipe', 'blink'] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'side' ? 'Side by side' : m === 'wipe' ? 'Wipe' : 'Blink'}</button>)}</p>
      <div className="oui-compare-row">{imgs.map((im, i) => <figure key={str(im.props.src)}><NoImage label={i ? 'candidate' : 'reference'} /><figcaption className="oui-label">{str(im.props.label)}</figcaption></figure>)}</div>
    </section>
  );
}

function Hotspots({ e }: { e: El }) {
  const pts = els(e.props.points);
  const [on, setOn] = useState(0);
  return (
    <section className="oui-hot">
      <div className="oui-hot-img"><NoImage label="image" />{pts.map((p, i) => (
        <button key={str(p.props.title)} type="button" aria-pressed={on === i} style={{ left: `${num(p.props.x) ?? 50}%`, top: `${num(p.props.y) ?? 50}%` }} onClick={() => setOn(i)}>{i + 1}</button>
      ))}</div>
      {pts[on] && <p><b>{str(pts[on].props.title)}</b> <Md text={str(pts[on].props.text)} /></p>}
    </section>
  );
}

// ---------------------------------------------------------------- workspace files

const File: Draw = ({ e }) => <span className="oui-file"><code>{str(e.props.path)}{e.props.line != null ? `:${str(e.props.line)}` : ''}</code></span>;
const fileOnly = (what: string): Draw => ({ e }) => (
  <section className="oui-report"><h5>{what}</h5><p className="oui-label">Reads <code>{str(e.props.path ?? e.props.source)}</code> from the workspace in bb.</p></section>
);

function Logs({ e }: { e: El }) {
  const text = str(e.props.source);
  if (!text.includes('\n')) return fileOnly('Logs')({ e });
  const lines = text.split('\n');
  const level = (l: string) => (/\berror\b/i.test(l) ? 'bad' : /\bwarn/i.test(l) ? 'warn' : undefined);
  const exit = num(e.props.exit);
  return (
    <section className="oui-logs">
      <p>{e.props.command != null && <code>{str(e.props.command)}</code>}<span className="oui-label">{countWords([[lines.filter((l) => level(l) === 'bad').length, 'errors'], [lines.filter((l) => level(l) === 'warn').length, 'warnings']])}{exit !== undefined ? `, exit ${exit}` : ''}</span></p>
      {/* oxlint-disable-next-line react/no-array-index-key -- lines of one log, by position */}
      <pre>{lines.map((l, i) => <span key={i} data-t={level(l)}>{l || ' '}</span>)}</pre>
    </section>
  );
}

function StackTrace({ e }: { e: El }) {
  const [head, ...frames] = str(e.props.trace).split('\n').map((l) => l.trim());
  const lib = (f: string) => /node_modules|<anonymous>|internal\//.test(f);
  return (
    <section className="oui-trace">
      {e.props.title != null && <h5>{str(e.props.title)}</h5>}
      <p className="oui-lede" data-t="bad">{head}</p>
      <ol>{frames.filter((f) => !lib(f)).map((f) => <li key={f}><code>{f.replace(/^at /, '')}</code></li>)}</ol>
      {frames.some(lib) && <Fold summary={`${frames.filter(lib).length} library frames`}><ol>{frames.filter(lib).map((f) => <li key={f}><code>{f.replace(/^at /, '')}</code></li>)}</ol></Fold>}
    </section>
  );
}

// ---------------------------------------------------------------- bb project: invented, since the page has no thread

const CHANGES = [['src/email/worker.ts', 84, 2], ['src/email/send.ts', 12, 9], ['src/queue.ts', 41, 0], ['infra/redis.yml', 18, 0], ['src/email/worker.test.ts', 66, 0]] as const;
const Changes: Draw = () => (
  <section className="oui-report"><h5>Changes</h5><p className="oui-lede">{CHANGES.length} files<span className="oui-label">, +{CHANGES.reduce((a, c) => a + c[1], 0)} −{CHANGES.reduce((a, c) => a + c[2], 0)}</span></p>
    <ul className="oui-rows">{CHANGES.map(([f, a, d]) => <li key={f}><code>{f}</code><span className="oui-label"><b data-t="good">+{a}</b> <b data-t="bad">−{d}</b></span></li>)}</ul></section>
);
const COMMITS = [['4f2a9c1', 'Worker with retries and a dead-letter list', '2 hours ago'], ['b81e07d', 'Queue email sends instead of sending inline', '3 hours ago'], ['09cd3e4', 'Add a Redis service with persistence', 'yesterday']] as const;
const Commits: Draw = () => (
  <section className="oui-report"><h5>Commits since main</h5><ul className="oui-rows">{COMMITS.map(([sha, msg, when]) => <li key={sha}><code>{sha}</code><b>{msg}</b><span className="oui-label">{when}</span></li>)}</ul></section>
);

/** A pull request whose checks finish while you watch: the plugin's card reads them live. */
function PullRequest() {
  const [done, setDone] = useState(() => reducedMotion());
  useEffect(() => { const t = setTimeout(() => setDone(true), 2600); return () => clearTimeout(t); }, []);
  const checks: [string, boolean][] = [['build', true], ['unit', true], ['e2e', done]];
  return (
    <section className="oui-pr">
      <p className="oui-pr-head"><State t="accent">Open</State><b>Move email sends to a Redis queue</b><code>#418</code></p>
      <p className="oui-label">feat/email-queue into main, 3 commits</p>
      <ul className="oui-rows">{checks.map(([name, ok]) => <li key={name}><State t={ok ? 'good' : 'accent'}>{ok ? 'Passed' : 'Running'}</State><span>{name}</span></li>)}</ul>
      <p className="oui-label">{done ? 'All checks passed. Waiting on one review.' : '1 check running. Waiting on one review.'}</p>
    </section>
  );
}
const THREADS = [['Email queue', 'Working'], ['Docs for the queue', 'Waiting for you'], ['Load test', 'Done']] as const;
const Threads: Draw = () => (
  <section className="oui-report"><h5>Threads</h5><ul className="oui-rows">{THREADS.map(([t, s]) => <li key={t}><State t={s === 'Working' ? 'accent' : s === 'Done' ? 'good' : 'warn'}>{s}</State><b>{t}</b></li>)}</ul></section>
);
const Environments: Draw = () => (
  <section className="oui-report"><h5>Environments</h5><ul className="oui-rows">
    <li><code>main</code><span className="oui-label">checkout, clean</span></li>
    <li><code>feat/email-queue</code><span className="oui-label">worktree, 2 uncommitted, 3 ahead, pull request #418</span></li>
  </ul></section>
);

export const REPORTS: Record<string, Draw> = {
  Tests, Pipeline, Findings, Coverage, Dependencies, Benchmark, Waterfall, Provenance,
  Tree, Json, Diff, Sources, Entity, Compare, Hotspots,
  File, Snippet: fileOnly('Snippet'), FileImage: fileOnly('Image'), Logs, StackTrace,
  Changes, Commits, PullRequest, Threads, Environments,
};
