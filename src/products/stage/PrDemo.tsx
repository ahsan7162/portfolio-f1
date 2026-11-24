// PR Dashboard, playable: see why the stuck pull request is stuck, pick what blocks it with Fix with agent,
// send it to the agent on its branch, and watch it go green. The agent and the reviewer are played by the
// demo; the prompt is the plugin's own (prData.gen.ts) and the blockers come from its own rule (pr.ts).
// Given a `scene`, it plays that scene by itself (prScenes.ts) until the visitor takes over.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Toggle } from '@ui-sdk/react/toggle';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import { AGENT_STEPS, blockersOf, CHECKS, facts, pick, push, rows, START, tally, THREADS, totals, type World } from './pr';
import { PR, THREAD, type FindingKey } from './prSample';
import { APPROVAL, FRESH, landUi, openUi, PR_SCENES, rest, sendUi, type PrUi } from './prScenes';
import { AlertToast, Av, Banner, Blockers, CheckCard, G, jobName, ListHead, Pill, Row, Side, Spine, ThreadCard, ThreadPanel, Toast, Win, type AlertLine, type RowData } from './PrView';

/** Already waiting in "New since you last looked" when the demo opens. */
const EARLIER: AlertLine = { kind: 'ci', headline: `CI failing · ${PR.repo}#${PR.number}`, detail: `${CHECKS.map(jobName).join(', ')} — ${PR.title}` };

/** One Send's beats in the visitor's hands: the agent works, pushes, CI reports, and the reviewer answers. */
const BEATS = { step: 600, push: 2300, land: 3700, close: 5600 };

export function PrDemo({ active, onTally, scene }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const startOf = (n: number | undefined) => {
    const sc = n === undefined ? undefined : PR_SCENES[n];
    return sc && (reducedMotion() ? sc.end : sc.start);
  };
  const [ui, setUi] = useState<PrUi>(() => startOf(scene) ?? FRESH);
  const [playing, setPlaying] = useState(scene);
  if (scene !== playing) {
    setPlaying(scene);
    const st = startOf(scene);
    if (st) setUi(st);
  }
  const now = useRef(ui);
  useLayoutEffect(() => { now.current = ui; });
  const fx = useRef(new Set<gsap.core.Animation>());
  const tl = useRef<gsap.core.Timeline | null>(null);
  const timers = useRef<number[]>([]);
  const { contextSafe } = useGSAP({ scope: root });
  const film = scene !== undefined && !reducedMotion();

  const act = (f: (x: PrUi) => PrUi) => { const n = f(now.current); if (n !== now.current) { now.current = n; setUi(n); } };
  const world = (f: (w: World) => World) => act(x => ({ ...x, w: f(x.w) }));
  const clearTimers = () => { for (const t of timers.current) clearTimeout(t); timers.current = []; };
  const finish = () => { for (const a of fx.current) a.progress(1).kill(); fx.current.clear(); };
  const stop = () => { tl.current?.kill(); tl.current = null; finish(); if (root.current) rest(root.current); };
  // Timers die with the demo. clearTimers only reads a ref, so the first one is the one.
  // oxlint-disable-next-line react/exhaustive-effect-dependencies
  useEffect(() => clearTimers, []);

  const count = tally(ui.w);
  useEffect(() => { onTally?.(count); }, [count, onTally]);

  // A scene change stops what was playing: the visitor took over, or another scene was picked.
  useGSAP(() => { stop(); clearTimers(); }, { dependencies: [scene], scope: root });
  useGSAP(() => {
    const sc = scene === undefined ? undefined : PR_SCENES[scene];
    const [w, c, el] = [win.current, cam.current, root.current];
    const hand = w?.querySelector('.prd-hand');
    if (!sc || tl.current || !w || !c || !el || !hand || reducedMotion()) return;
    rest(el);
    const at = (sel: string) => {
      const box = w.getBoundingClientRect();
      const k = box.width / w.offsetWidth || 1;
      const r = w.querySelector(sel)?.getBoundingClientRect();
      return r ? { x: (r.left + r.width / 2 - box.left) / k, y: (r.top + r.height / 2 - box.top) / k } : { x: 0, y: 0 };
    };
    tl.current = sc.play({
      hand, at, win: w, cam: c,
      act: f => flushSync(() => act(f)),
      fx: make => contextSafe(() => { const a = make(); fx.current.add(a); void a.then(() => fx.current.delete(a)); })(),
      amp: Math.min(1, Math.max(0.4, (w.offsetWidth - 300) / 700)),
      cost: () => el.dispatchEvent(new CustomEvent('scene-cost', { bubbles: true })),
    });
  }, { dependencies: [scene], scope: root });

  // ---- what the visitor can do ----
  const open = () => act(openUi);
  const back = () => act(x => ({ ...x, w: { ...x.w, view: 'list' }, menu: false }));
  const toggle = (k: FindingKey) => world(w => pick(w, k));
  /** Send the picks (or, from the menu, every finding left) to the thread on the branch, then let the world answer. */
  const handOff = (all = false) => {
    const before = now.current;
    act(x => sendUi(x, all));
    if (film || now.current === before) return;
    clearTimers();
    const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, reducedMotion() ? 0 : ms));
    now.current.agent.forEach((_, i) => later(BEATS.step * (i + 1), () => act(x => ({ ...x, steps: i + 1 }))));
    later(BEATS.push, () => world(push));
    later(BEATS.land, () => act(landUi));
    later(BEATS.close, () => act(x => ({ ...x, thread: false, toasts: x.toasts.slice(-1) })));
  };
  const again = () => { clearTimers(); act(() => ({ ...FRESH, seen: true })); };

  // j and k move through the list, Enter opens: only while this demo is on screen, never while typing.
  useEffect(() => {
    if (!active || film) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as Element).closest('input, textarea, [contenteditable]')) return;
      const x = now.current;
      if (x.w.view !== 'list') return;
      const n = rows(x.w).flatMap(g => g.prs).length;
      if (e.key === 'j' || e.key === 'k') act(y => ({ ...y, focus: (y.focus + (e.key === 'j' ? 1 : n - 1)) % n }));
      // Enter on a control elsewhere on the page is that control's, not the list's.
      else if (e.key === 'Enter' && x.focus === 0 && !(e.target as Element).closest('button, a, summary, [role=button], [role=tab]')) open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const takeOver = () => { if (scene !== undefined) { stop(); } };
  const w = ui.w;
  const f = facts(w);
  const all: RowData[] = rows(w).flatMap(g => g.prs.map(p => ({ ...p, jobs: p.number === PR.number && f.ci === 'failing' ? CHECKS.filter(k => !w.fixed.includes(k)).map(jobName) : undefined })));
  const changed = w !== START || ui.thread || ui.toasts.length > 0;
  const alerts = ui.banner ? [APPROVAL, EARLIER] : [EARLIER];

  const fixBtn = (k: FindingKey) => {
    const picked = w.picked.includes(k);
    return (
      <Toggle className="prd-btn" data-fix={k} pressed={picked} disabled={w.sent.includes(k)} onPressedChange={() => toggle(k)}>
        <G n={picked ? 'check' : 'fix'} />Fix with agent
      </Toggle>
    );
  };

  let page: ReactNode;
  if (w.view === 'list') {
    page = (
      <>
        <ListHead />
        <div className="prd-cols">
          <div>
            {rows(w).map(g => (
              <section className="prd-grp" key={g.repo}>
                <h3 className="prd-grp-h"><G n="chev" />{g.repo.split('/')[0]}/<b>{g.repo.split('/')[1]}</b><i>{g.prs.length}</i></h3>
                <div className="prd-rows">
                  {g.prs.map(p => {
                    const r = all.find(x => x.number === p.number)!;
                    const i = all.indexOf(r);
                    return p.number === PR.number
                      ? <Row key={p.number} pr={r} onOpen={open} focused={ui.focus === i} hint={!ui.seen} />
                      : <Row key={p.number} pr={r} focused={ui.focus === i} />;
                  })}
                </div>
              </section>
            ))}
          </div>
          <Side totals={totals(w)} alerts={alerts} />
        </div>
      </>
    );
  } else {
    const blockers = blockersOf(f);
    const failing = CHECKS.filter(k => !w.fixed.includes(k));
    const running = w.running ? failing.filter(k => w.sent.includes(k)) : [];
    const stuck = failing.filter(k => !running.includes(k));
    const unresolved = THREADS.filter(k => !w.fixed.includes(k));
    page = (
      <>
        <div className="prd-pr">
          <Spine tone={f.ci === 'failing' || blockers.some(b => /changes|unresolved/i.test(b)) ? 'bad' : f.ci === 'pending' ? 'warn' : 'good'} />
          <div className="prd-back">
            <button type="button" onClick={back}><G n="back" />All PRs</button>
            <span className="prd-back-end">
              <span className="prd-btn" aria-hidden="true"><G n="draft" />Convert to draft</span>
              <span className="prd-btn" aria-hidden="true"><G n="ext" />Open on GitHub</span>
              <button type="button" className="prd-btn prd-btn--ghost" aria-label="Pull request actions" aria-expanded={ui.menu} data-menu="" onClick={() => act(x => ({ ...x, menu: !x.menu }))}><G n="more" /></button>
              {ui.menu && (
                <span className="prd-menu" role="menu">
                  <span>Link to thread</span><span>Ask a question</span><span>Explain this PR</span>
                  <button type="button" role="menuitem" data-fixall="" disabled={!failing.length && !unresolved.length} onClick={() => handOff(true)}>Fix findings in a thread</button>
                  <hr /><span>Open on GitHub</span><span>Copy link</span><span>Copy PR number</span><span>Close pull request</span>
                </span>
              )}
            </span>
          </div>
          <p className="prd-state"><Pill tone="good" icon={false}><G n="pr" />Open</Pill>{PR.repo}#{PR.number}</p>
          <h3 className="prd-h1"><u>[PAY-214]</u> {PR.title.replace('[PAY-214] ', '')}</h3>
          <p className="prd-by"><span className="prd-who"><Av who={PR.author} />{PR.author}</span>wants to merge<code>{PR.headRefName}</code>→<code>{PR.baseRefName}</code><span className="prd-add">+186</span><span className="prd-del">−42</span>in 4 files</p>
          <p className="prd-revs">Reviewers
            <span className="prd-who" data-tone="warn"><Av who="pa" />@payments-reviewers<G n="clock" /></span>
            <span className="prd-who" data-tone={w.approved ? 'good' : 'bad'}><Av who="mi" />mina-k<G n={w.approved ? 'check' : 'x'} /></span>
            <span className="prd-who" data-tone="good"><Av who="pr" />priya-n<G n="check" /></span>
          </p>
          <p className="prd-blk" data-tone={blockers.length ? 'bad' : 'good'}><span>{blockers.length ? 'Not mergeable yet:' : 'Ready:'}</span><Blockers blockers={blockers} facts={f} icons={false} /></p>
        </div>
        <TabsList className="prd-tabs">
          <span aria-disabled="true"><G n="file" />Overview <b>4</b></span>
          <TabsTab value="checks" data-tab="checks" onClick={() => world(x => ({ ...x, tab: 'checks' }))}><G n="check" />Checks <b data-tone={failing.length ? 'bad' : undefined}>6</b></TabsTab>
          <span aria-disabled="true"><G n="file" />Files <b>4</b></span>
          <span aria-disabled="true"><G n="commit" />Commits <b>5</b></span>
          <TabsTab value="comments" data-tab="comments" onClick={() => world(x => ({ ...x, tab: 'comments' }))}><G n="msg" />Comments <b data-tone={unresolved.length ? 'bad' : undefined}>{unresolved.length}</b></TabsTab>
        </TabsList>
        <div className="prd-body" role="tabpanel">
          {w.tab === 'checks' ? (
            <>
              <div className="prd-prog">
                <div className="prd-prog-bar"><i data-tone="bad" style={{ flexGrow: stuck.length }} /><i data-tone="warn" style={{ flexGrow: running.length }} /><i data-tone="good" style={{ flexGrow: 6 - failing.length }} /></div>
                <p><span data-tone="bad"><G n="x" />{stuck.length} failing</span><span data-tone={running.length ? 'warn' : undefined}><G n="clock" />{running.length} running</span><span data-tone="good"><G n="check" />{6 - failing.length} passed</span><span>0 skipped</span></p>
              </div>
              {CHECKS.map(k => <CheckCard key={k} k={k} done={w.fixed.includes(k)} running={running.includes(k)} action={fixBtn(k)} />)}
            </>
          ) : (
            [...THREADS].sort((a, b) => Number(w.fixed.includes(a)) - Number(w.fixed.includes(b))).map(k => <ThreadCard key={k} k={k} done={w.fixed.includes(k)} action={fixBtn(k)} />)
          )}
        </div>
      </>
    );
  }

  const steps = [...ui.agent.map(k => AGENT_STEPS[k]), `Pushed to ${PR.headRefName}`].map((text, i) => ({ text, done: i < ui.steps }));

  return (
    // The Tabs root sits here because the tab list lives in the page view, which swaps out with the list view.
    // Each tab keeps its onClick: a press on the selected one still counts as a change (Start over shows).
    <Tabs value={w.tab} onValueChange={(v) => world(x => ({ ...x, tab: v as World['tab'] }))} render={<div ref={root} />}
      className="prd prd-demo" data-film={film ? '' : undefined} onClickCapture={takeOver} onKeyDownCapture={takeOver}>
      <div className="prd-cam" ref={cam}>
          <Win winRef={win} badge={ui.banner ? 1 : 0} top={changed && !film ? <button type="button" className="prd-again" onClick={again}>Start over</button> : null} over={<>
            {ui.thread && <ThreadPanel prompt={ui.prompt} steps={steps.slice(0, Math.max(1, Math.min(steps.length, ui.steps + 1)))}><button type="button" className="prd-x" aria-label="Close the thread" onClick={() => act(x => ({ ...x, thread: false }))}>✕</button></ThreadPanel>}
            {w.picked.length > 0 && (
              <div className="prd-batch">
                <span>{w.picked.length} to fix</span>
                <button type="button" className="prd-btn prd-btn--solid" data-send="" onClick={() => handOff()}><G n="fix" />Send to agent</button>
                <button type="button" className="prd-btn prd-btn--ghost" onClick={() => world(x => ({ ...x, picked: [] }))}>Clear</button>
              </div>
            )}
            <div className="prd-toasts" aria-live="polite">
              {ui.toasts.slice(-2).map(t => (t.sent ? <Toast key={t.id} title={`Sent to ${THREAD.title}`} action="Open" /> : t.alert ? <AlertToast key={t.id} a={t.alert} /> : null))}
            </div>
            {ui.banner && <Banner title={APPROVAL.headline} body={APPROVAL.detail} />}
            {ui.clock && <span className="prd-clock">{ui.clock}</span>}
            <i className="prd-glow" data-glow="" aria-hidden="true" />
            <i className="prd-click" data-click="" aria-hidden="true" />
            <svg className="prd-hand" viewBox="0 0 14 19" aria-hidden="true"><path d="M1 1v14.5l3.6-3.3 2.7 6 2.4-1.1-2.6-5.8H12z" /></svg>
          </>}>{page}</Win>
      </div>
    </Tabs>
  );
}

