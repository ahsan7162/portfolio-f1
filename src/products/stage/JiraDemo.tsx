// Jira Board, playable: the plugin's panel in bb, on an invented site. J / K move the ring, Enter opens a ticket
// beside the list, [ and ] walk the tickets, U climbs to the parent, S shows the moves the workflow allows, / searches,
// ? lists the keys. Filter, group, move a ticket on, or hand it to someone: it leaves your list as it does in the
// plugin. Given a `scene`, the demo plays it by itself (jiraScenes.ts) through the same changes.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKey, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Toggle } from '@ui-sdk/react/toggle';
import { Flip, gsap, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import * as J from './jira';
import { rest } from './jiraFilm';
import { catOf, Chev, Ico, PrioMark, Ring, RowView, typeOf, TypeChip, typeVars, catVars } from './jiraParts';
import type { Group, GroupHead } from './jiraRules';
import { JIRA_SCENES, TABS } from './jiraScenes';
import '../styles/jira-demo.css';

/** The plugin's own shortcut list (app.tsx SHORTCUTS). */
const SHORTCUTS: [string, string][] = [
  ['J / K or ↓ / ↑', 'Move through the list (with a ticket open, open the next one)'],
  ['Enter', 'Open the selected ticket'],
  ['[ / ]', 'Previous / next ticket'],
  ['U', 'Up to the open ticket’s parent'],
  ['S', 'Change the status of the selected ticket'],
  ['/', 'Search'],
  ['Esc', 'Close a menu, then the ticket, then clear search'],
  ['?', 'Show or hide this list'],
];
/** Menus that close when a click lands outside them. */
const POPS = new Set<J.Menu>(['more', 'type', 'group', 'site', 'sheet']);

function Head({ head, count, open, onToggle, onOpen }: { head: GroupHead; count: number; open: boolean; onToggle: () => void; onOpen: (k: string) => void }) {
  let label: ReactNode;
  if (head.kind === 'status') label = <><Ring cat={head.cat} /><b>{head.status}</b></>;
  else if (head.kind === 'board') label = <><span className="jbd-ty" style={{ '--c': 'var(--t-board)' } as CSSProperties}><Ico n="board" /></span><b>{head.name}</b></>;
  else if (head.kind === 'label') label = <b>{head.text}</b>;
  else {
    const t = typeOf(head.node.type, head.node.level);
    label = <><span className="jbd-ty" style={typeVars(t)}><Ico n={t} /></span><span className="jbd-mono">{head.node.key}</span><b>{head.node.summary}</b></>;
  }
  return (
    <h5 className="jbd-sec-h" data-flip-id={`h:${head.kind === 'node' ? head.node.key : head.kind === 'status' ? head.status : head.kind === 'board' ? head.name : head.text}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}><Chev />{label}<small>{count}</small></button>
      {head.kind === 'node' && <button type="button" className="pp-sr" onClick={() => onOpen(head.node.key)}>Open {head.node.key}</button>}
    </h5>
  );
}

export function JiraDemo({ active, onTally, scene }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const listEl = useRef<HTMLDivElement>(null);
  const paneEl = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const startOf = (n: number | undefined) => {
    const sc = n === undefined ? undefined : JIRA_SCENES[n];
    return sc && (reducedMotion() ? sc.end : sc.start);
  };
  const [s, setS] = useState<J.JState>(() => startOf(scene) ?? J.fresh());
  const [playing, setPlaying] = useState(scene);
  if (scene !== playing) {
    setPlaying(scene);
    const st = startOf(scene);
    if (st) setS(st);
  }
  const [checking, setChecking] = useState(false);
  const now = useRef(s);
  const flip = useRef<Flip.FlipState | null>(null);
  const lastGoal = useRef(s);
  const fx = useRef(new Set<gsap.core.Animation>());
  const tl = useRef<gsap.core.Timeline | null>(null);
  const { contextSafe } = useGSAP({ scope: root });
  const film = scene !== undefined && !reducedMotion();
  useLayoutEffect(() => { now.current = s; });

  const track = (a: gsap.core.Animation | null | undefined) => {
    if (!a) return;
    fx.current.add(a);
    void a.then(() => fx.current.delete(a));
  };
  const finish = () => { for (const a of fx.current) a.progress(1).kill(); fx.current.clear(); };
  const stop = () => { tl.current?.kill(); tl.current = null; finish(); if (root.current) rest(root.current); };

  /** Every change goes through here. When the list itself changes, its rows fly to their new places. */
  const act = (f: (x: J.JState) => J.JState) => {
    const p = now.current;
    const n = f(p);
    if (n === p) return;
    const order = (x: J.JState) => `${x.groupBy}|${x.collapsed.join()}|${J.orderOf(x).join()}`;
    if (!flip.current && order(p) !== order(n) && listEl.current && !reducedMotion()) flip.current = Flip.getState(listEl.current.querySelectorAll('.jbd-row, .jbd-sec-h'));
    now.current = n;
    setS(n);
  };

  const count = J.tally(s);
  useEffect(() => { onTally?.(count); }, [count, onTally]);

  // A scene change stops what was playing: the visitor took over, or another scene was picked.
  // A scene that ends with no other after it (the visitor took over, or the block left the screen) lands on its end
  // first, so the demo is handed over whole, never half built.
  useGSAP(() => { if (scene === undefined) tl.current?.progress(1); stop(); }, { dependencies: [scene], scope: root });

  // The scene plays once its start state is on screen.
  useGSAP(() => {
    const sc = scene === undefined ? undefined : JIRA_SCENES[scene];
    const [w, c, el] = [win.current, cam.current, root.current];
    const hand = w?.querySelector('.jbd-hand');
    if (!sc || tl.current || !w || !c || !el || !hand || reducedMotion()) return;
    rest(el);
    const at = (sel: string) => {
      const box = w.getBoundingClientRect();
      const k = box.width / w.offsetWidth || 1;
      const r = w.querySelector(sel)?.getBoundingClientRect();
      return r ? { x: (r.left + r.width / 2 - box.left) / k, y: (r.top + r.height / 2 - box.top) / k } : { x: 0, y: 0 };
    };
    tl.current = sc.play({
      hand, at, win: w, cam: c, root: el,
      act: (f) => flushSync(() => act(f)),
      fx: (make) => contextSafe(() => track(make()))(),
      amp: Math.min(1, Math.max(0.4, (w.offsetWidth - 300) / 700)),
      cost: () => el.dispatchEvent(new CustomEvent('scene-cost', { bubbles: true })),
    });
  }, { dependencies: [scene], scope: root });

  // After each change: rows fly, the ring stays in sight, and Your turn hears about any goal met.
  useLayoutEffect(() => {
    const state = flip.current;
    flip.current = null;
    if (state && listEl.current) {
      contextSafe(() => track(Flip.from(state, {
        targets: listEl.current!.querySelectorAll('.jbd-row, .jbd-sec-h'), duration: 0.36, ease: 'power3.out', nested: true,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.24 }),
      })))();
    }
    const g = lastGoal.current;
    lastGoal.current = s;
    if (!film && root.current) for (const id of J.goalsMet(g, s)) root.current.dispatchEvent(new CustomEvent('scene-goal', { bubbles: true, detail: id }));
  });

  // The panes don't take the wheel (the featured section steps by it), so they keep what matters in sight themselves.
  const sel = s.open ?? s.cursor;
  const seen = useRef({ list: '', pane: '', panel: '' });
  useEffect(() => {
    const [list, pane, last] = [listEl.current, paneEl.current, seen.current];
    const listKey = `${sel}|${s.groupBy}|${s.collapsed.join()}`;
    if (list && listKey !== last.list) {
      last.list = listKey;
      const row = sel ? list.querySelector<HTMLElement>(`.jbd-row[data-key="${sel}"]`) : null;
      if (row) {
        const y = Math.max(0, Math.min(row.offsetTop - list.clientHeight * 0.35, list.scrollHeight - list.clientHeight));
        if (reducedMotion()) list.scrollTop = y;
        else contextSafe(() => track(gsap.to(list, { scrollTop: y, duration: 0.45, ease: 'power3.out', overwrite: true })))();
      }
    }
    if (pane && (s.open ?? '') !== last.pane) { last.pane = s.open ?? ''; pane.scrollTop = 0; }
    const panelKey = `${s.menu}|${s.menuFor}`;
    if (pane && panelKey !== last.panel) {
      last.panel = panelKey;
      const panel = pane.querySelector<HTMLElement>('.jbd-strip, .jbd-picker');
      const y = panel ? panel.offsetTop + panel.offsetHeight - pane.clientHeight + 40 : 0;
      if (y > pane.scrollTop) pane.scrollTop = y;
    }
  });

  // Board grouping first checks which boards list the tickets, as the plugin does.
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(checkTimer.current), []);
  const groupTo = (g: J.GroupBy) => {
    act((x) => J.setGroup(x, g));
    if (g !== 'board' || film) return;
    setChecking(true);
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => setChecking(false), 650);
  };

  // The assignee search takes the caret when it opens by hand.
  const whoEl = useRef<HTMLInputElement>(null);
  useEffect(() => { if (s.menu === 'assign' && !film && active) whoEl.current?.focus({ preventScroll: true }); }, [s.menu, film, active]);

  // A click outside an open menu closes it.
  useEffect(() => {
    if (!POPS.has(s.menu)) return;
    const away = (e: PointerEvent) => { if (!(e.target instanceof Element && e.target.closest('.jbd-anchor'))) act((x) => J.setMenu(x, null)); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  });

  const said = () => root.current?.dispatchEvent(new CustomEvent('scene-take', { bubbles: true }));
  // The keys, while the demo is on screen and nobody is typing in a field.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && (t.isContentEditable || t.closest('input, textarea, select, [contenteditable]'))) return;
      const inside = !!t && !!root.current?.contains(t);
      const x = now.current;
      let f: ((y: J.JState) => J.JState) | null = null;
      switch (e.key) {
        case 'j': case ']': f = (y) => J.step(y, 1); break;
        case 'k': case '[': f = (y) => J.step(y, -1); break;
        case 'ArrowDown': if (inside) f = (y) => J.step(y, 1); break;
        case 'ArrowUp': if (inside) f = (y) => J.step(y, -1); break;
        case 'Enter': {
          const ours = !t || t === document.body || (inside && !t.closest('button, a'));
          if (ours && x.cursor && !x.open) f = (y) => J.openTicket(y, y.cursor!);
          break;
        }
        case 'Escape': if (x.menu || x.open || x.query) f = J.escape; break;
        case 'u': if (x.open) f = J.up; break;
        case 's': if (x.open || x.cursor) f = (y) => J.showMoves(y); break;
        case '?': f = (y) => J.setMenu(y, 'sheet'); break;
        case '/': e.preventDefault(); said(); if (!film) search.current?.focus({ preventScroll: true }); return;
        default: return;
      }
      if (!f) return;
      e.preventDefault();
      said();
      // mid-scene, the first key only hands the demo over; acting on it too would cut the scene off half played
      if (film) return;
      root.current?.dispatchEvent(new CustomEvent('scene-input', { bubbles: true }));
      act(f);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const takeOver = () => { if (scene !== undefined) stop(); };

  // ---------- what is drawn ----------
  const counts = J.counts(s);
  const list = J.listOf(s);
  const groups = J.groupsOf(s);
  const position = J.positionOf(s);
  const typedKey = J.typedKey(s);
  const filtering = s.query.trim() !== '' || s.statuses.length > 0 || s.types.length > 0;
  const statusOpts = J.statusOptions(s);
  const typeOpts = J.typeOptions(s);
  const open = s.open ? s.issues[s.open] : null;
  const openT = s.open ? J.ticketOf(s.issues, s.open) : null;

  const statusCtl = (key: string, label: boolean) => {
    const i = s.issues[key];
    const cat = catOf(J.STATUS_CAT[i.status] ?? 'new');
    return (
      <button type="button" className="jbd-st" data-status={key} aria-expanded={s.menu === 'move' && s.menuFor === key && !s.open}
        aria-label={`Status: ${i.status}. Change status`} onClick={() => act((x) => J.showMoves(x, key))} style={catVars(cat)}>
        <Ring cat={cat} />{label && <span>{i.status}</span>}<Chev />
      </button>
    );
  };
  const strip = (key: string) => (
    <div className="jbd-strip">
      <small>Move to</small>
      {J.movesOf(s, key).map((m) => (
        <button key={m.id} type="button" className="jbd-move" data-move={m.to} onClick={() => act((x) => J.transition(x, key, m.to))}>
          <Ring cat={catOf(J.STATUS_CAT[m.to] ?? 'new')} />{J.moveLabel(m)}
        </button>
      ))}
    </div>
  );
  const row = (r: NonNullable<Group['rows']>[number]) => (
    <RowView key={r.ticket.key} t={r.ticket} depth={r.depth} parent={r.parent} via={r.via} age={J.ageOf(s.issues[r.ticket.key].updated)} sel={r.ticket.key === sel}
      status={statusCtl(r.ticket.key, s.groupBy !== 'status')}
      hit={<button type="button" className="jbd-row-hit" aria-label={`${r.ticket.key} ${r.ticket.summary}`} onClick={() => act((x) => J.openTicket(x, r.ticket.key))} />}
      after={s.menu === 'move' && s.menuFor === r.ticket.key && !s.open ? <div className="jbd-row-strip">{strip(r.ticket.key)}</div> : undefined} />
  );
  const group = (g: Group): ReactNode => {
    const shut = s.collapsed.includes(g.id);
    return (
      <section key={g.id} className="jbd-sec">
        <Head head={g.head} count={g.count} open={!shut} onToggle={() => act((x) => J.toggleGroup(x, g.id))} onOpen={(k) => act((x) => J.openTicket(x, k))} />
        {!shut && g.rows && <ul className="jbd-rows">{g.rows.map(row)}</ul>}
        {!shut && g.groups && <div className="jbd-sec-grp">{g.groups.map(group)}</div>}
      </section>
    );
  };

  const pane = open && openT && (
    <section key={open.key} className="jbd-pane" ref={paneEl} aria-label={`${open.key} ${open.summary}`}>
      <div className="jbd-pane-bar">
        <button type="button" className="jbd-btn jbd-btn--ghost" onClick={() => act(J.closeTicket)}><Ico n="left" /> Close</button>
        {open.parent && <button type="button" className="jbd-btn jbd-btn--ghost" data-up="" onClick={() => act(J.up)}><Ico n="up" /> Up to {open.parent}</button>}
        <span className="jbd-end">
          {position && <span className="jbd-pos">{position.index + 1} of {position.total}</span>}
          <button type="button" className="jbd-btn jbd-btn--line" disabled={!position || position.index === 0} onClick={() => act((x) => J.step(x, -1))}><Ico n="left" /> Previous</button>
          <button type="button" className="jbd-btn jbd-btn--line" disabled={!position || position.index === position.total - 1} onClick={() => act((x) => J.step(x, 1))}>Next <Ico n="right" /></button>
        </span>
      </div>
      <header className="jbd-card jbd-tk">
        {openT.ancestors.length > 0 && (
          <nav className="jbd-crumbs" aria-label="Hierarchy">
            {[...openT.ancestors].reverse().map((a, i) => (
              <span key={a.key} style={{ display: 'contents' }}>
                {i > 0 && <i aria-hidden="true">›</i>}
                <button type="button" data-crumb={a.key} style={typeVars(typeOf(a.type, a.level))} onClick={() => act((x) => J.openTicket(x, a.key))}>
                  <Ico n={typeOf(a.type, a.level)} /><span className="jbd-mono">{a.key}</span><span>{a.summary}</span>
                </button>
              </span>
            ))}
          </nav>
        )}
        <div className="jbd-tk-top">
          <TypeChip type={open.type} level={openT.level} />
          <div style={{ minWidth: 0 }}>
            <p className="jbd-tk-meta"><span className="jbd-mono">{open.key}</span><span>{open.type}</span><span>Acme</span></p>
            <h4>{open.summary}</h4>
          </div>
        </div>
        <div className="jbd-tk-pills">
          <button type="button" className="jbd-pill" data-pill="" data-pop={s.pop || undefined} key={`pill${s.pop}`} aria-expanded={s.menu === 'move' && s.menuFor === open.key}
            aria-label={`Status: ${open.status}. Change status`} style={catVars(catOf(openT.category))} onClick={() => act((x) => J.showMoves(x, open.key))}>
            <Ring cat={catOf(openT.category)} />{open.status}<Chev />
          </button>
          <PrioMark priority={open.priority} />
          <span className="jbd-open" title="In the plugin, this opens the ticket in Jira">Open in Jira <Ico n="out" /></span>
        </div>
        {s.menu === 'move' && s.menuFor === open.key && strip(open.key)}
        {s.menu === 'assign' && (
          <div className="jbd-picker">
            <input ref={whoEl} value={s.who} placeholder="Assign to… (name or email)" aria-label="Search people to assign" maxLength={100}
              onChange={(e) => { const v = e.target.value; act((x) => ({ ...x, who: v })); }}
              onKeyDown={(e: ReactKey<HTMLInputElement>) => { if (e.key === 'Escape') { e.preventDefault(); act(J.showAssign); } }} />
            <ul>
              {open.assignee !== null && <li><button type="button" className="jbd-person" data-quiet="" onClick={() => act((x) => J.assign(x, open.key, null))}>Unassign</button></li>}
              {J.assignable(s.who).length === 0 && <li className="jbd-picker-none">No one assignable matches.</li>}
              {J.assignable(s.who).map((p, _, all) => (
                <li key={p.accountId}>
                  <button type="button" className="jbd-person" data-person={p.accountId} data-dupe={all.filter((q) => q.name === p.name).length > 1 || undefined}
                    onClick={() => act((x) => J.assign(x, open.key, p.accountId))}>
                    <b>{p.name}</b><small>{p.email}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <dl className="jbd-facts">
          <div><dt>Status</dt><dd><Ring cat={catOf(openT.category)} />{open.status}</dd></div>
          <div><dt>Priority</dt><dd>{open.priority ? <PrioMark priority={open.priority} label /> : 'None'}</dd></div>
          <div><dt>Assignee</dt><dd>
            <button type="button" className="jbd-as" data-assignee="" aria-expanded={s.menu === 'assign'} aria-label={`Assignee: ${J.nameOf(open.assignee) ?? 'Unassigned'}. Change assignee`} onClick={() => act(J.showAssign)}>
              <span>{J.nameOf(open.assignee) ?? 'Unassigned'}</span><Chev />
            </button>
          </dd></div>
          <div><dt>Reporter</dt><dd>{open.reporter}</dd></div>
          <div><dt>Created</dt><dd>{open.created}d ago</dd></div>
          <div><dt>Updated</dt><dd>{open.updated === 0 ? 'now' : `${J.ageOf(open.updated)} ago`}</dd></div>
        </dl>
        {open.labels && <div className="jbd-labels">{open.labels.map((l) => <span key={l}>{l}</span>)}</div>}
      </header>
      <section className="jbd-card jbd-desc">{open.desc.map((p) => <p key={p}>{p}</p>)}</section>
      {J.childrenOf(s.issues, open.key).length > 0 && (
        <section>
          <h5 className="jbd-h">{J.childrenTitle(openT.level)} <small>{J.childrenOf(s.issues, open.key).length}</small></h5>
          <ul className="jbd-rows">
            {J.childrenOf(s.issues, open.key).map((c) => (
              <RowView key={c.key} t={c} age={J.ageOf(s.issues[c.key].updated)} status={<span className="jbd-st"><Ring cat={catOf(c.category)} /></span>}
                hit={<button type="button" className="jbd-row-hit" aria-label={`${c.key} ${c.summary}`} onClick={() => act((x) => J.openTicket(x, c.key))} />} />
            ))}
          </ul>
        </section>
      )}
      {open.comments && (
        <section>
          <h5 className="jbd-h">Comments <small>{open.comments.length}</small></h5>
          <div className="jbd-card">{open.comments.map((c) => <div key={c.body} className="jbd-comment"><p><b>{c.by}</b> · {J.ageOf(c.ago)} ago</p><p>{c.body}</p></div>)}</div>
        </section>
      )}
    </section>
  );

  const inline = statusOpts.slice(0, 3);
  const more = statusOpts.slice(3);
  const chip = (o: (typeof statusOpts)[number]) => (
    <Toggle key={o.id} className="jbd-chip" pressed={s.statuses.includes(o.id)} style={catVars(o.cat)} onPressedChange={() => act((x) => J.toggleStatus(x, o.id))}>
      <Ring cat={o.cat} />{o.id} <small>{o.count}</small>
    </Toggle>
  );

  return (
    <div className="jbd" ref={root} data-film={film ? '' : undefined} onClickCapture={takeOver} onKeyDownCapture={takeOver}>
      <div className="jbd-cam" ref={cam}>
        <div className="jbd-win" ref={win} data-open={s.open ? '' : undefined}>
          {/* bb's rail, with My Tickets open */}
          <nav className="jbd-rail" aria-hidden="true">
            <i data-logo=""><Ico n="logo" /></i><i><Ico n="chat" /></i><i data-on=""><Ico n="board" /></i><i><Ico n="pr" /></i><i><Ico n="grid" /></i><i><Ico n="doc" /></i>
            <span className="jbd-rail-gap" /><i><Ico n="gear" /></i>
          </nav>
          <div className="jbd-main">
            <div className="jbd-tools">
              <div className="jbd-row1">
                <span className="jbd-anchor">
                  <button type="button" className="jbd-site" aria-expanded={s.menu === 'site'} aria-haspopup="menu" onClick={() => act((x) => J.setMenu(x, 'site'))}>{s.site}<Chev /></button>
                  {s.menu === 'site' && (
                    <div className="jbd-pop" role="menu">
                      {J.SITES.map((site) => <button key={site} type="button" role="menuitemradio" aria-checked={site === s.site} onClick={() => act((x) => J.setSite(x, site))}><span>{site}</span>{site === s.site && <Ico n="task" className="jbd-chev" />}</button>)}
                    </div>
                  )}
                </span>
                <span className="jbd-search">
                  <input ref={search} value={s.query} placeholder="Find by key, words or epic" aria-label="Find a ticket" onChange={(e) => { const v = e.target.value; act((x) => J.setQuery(x, v)); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); act((x) => J.setQuery(x, '')); e.currentTarget.blur(); } }} />
                  {!s.query && <span className="jbd-kbd" aria-hidden="true">/</span>}
                </span>
                <span className="jbd-end" aria-hidden="true">
                  <span className="jbd-btn jbd-btn--line jbd-wide-only" data-off=""><Ico n="plus" /> Create ticket</span>
                  <span className="jbd-btn jbd-btn--icon" data-off=""><Ico n="refresh" /></span>
                  <span className="jbd-btn jbd-btn--ghost jbd-wide-only" data-off="">Disconnect</span>
                </span>
              </div>
              <div className="jbd-row2">
                <span className="jbd-seg" role="group" aria-label="Which tickets">
                  <Toggle pressed={s.scope === 'open'} onPressedChange={() => act((x) => J.setScope(x, 'open'))}><Ring cat="indeterminate" />Open <em>{counts.open}</em></Toggle>
                  <Toggle pressed={s.scope === 'done'} onPressedChange={() => act((x) => J.setScope(x, 'done'))}><Ring cat="done" />Done <em>{counts.done}</em></Toggle>
                </span>
                <span className="jbd-chips">
                  {inline.map(chip)}
                  {more.length > 0 && (
                    <span className="jbd-anchor jbd-wide-only">
                      <button type="button" className="jbd-chip" aria-expanded={s.menu === 'more'} aria-haspopup="menu" onClick={() => act((x) => J.setMenu(x, 'more'))}>{more.length} more<Chev /></button>
                      {s.menu === 'more' && <div className="jbd-pop" role="menu">{more.map((o) => <button key={o.id} type="button" role="menuitemcheckbox" aria-checked={s.statuses.includes(o.id)} onClick={() => act((x) => J.toggleStatus(x, o.id))}><Ring cat={o.cat} /><span>{o.id}</span><small>{o.count}</small></button>)}</div>}
                    </span>
                  )}
                  <span className="jbd-anchor jbd-wide-only">
                    <button type="button" className="jbd-chip" aria-expanded={s.menu === 'type'} aria-haspopup="menu" onClick={() => act((x) => J.setMenu(x, 'type'))}>{s.types.length ? <b>Type · {s.types.length}</b> : 'Type'}<Chev /></button>
                    {s.menu === 'type' && <div className="jbd-pop" role="menu">{typeOpts.map((o) => { const t = typeOf(o.id, o.level); return <button key={o.id} type="button" role="menuitemcheckbox" aria-checked={s.types.includes(o.id)} onClick={() => act((x) => J.toggleType(x, o.id))}><span className="jbd-ty" style={typeVars(t)}><Ico n={t} /></span><span>{o.id}</span><small>{s.types.includes(o.id) ? '✓' : o.count}</small></button>; })}</div>}
                  </span>
                </span>
                {(s.statuses.length > 0 || s.types.length > 0) && <button type="button" className="jbd-clear" onClick={() => act(J.clearFilters)}>Clear filters</button>}
                <span className="jbd-end">
                  <span className="jbd-anchor">
                    <button type="button" className="jbd-chip" aria-expanded={s.menu === 'group'} aria-haspopup="menu" data-group="" onClick={() => act((x) => J.setMenu(x, 'group'))}>Group by <b>{J.GROUPINGS.find((g) => g.id === s.groupBy)?.label}</b><Chev /></button>
                    {s.menu === 'group' && <div className="jbd-pop jbd-pop--end" role="menu">{J.GROUPINGS.map((g) => <button key={g.id} type="button" role="menuitemradio" aria-checked={g.id === s.groupBy} data-grouping={g.id} onClick={() => groupTo(g.id)}><span>{g.label}</span>{g.id === s.groupBy && <Ico n="task" className="jbd-chev" />}</button>)}</div>}
                  </span>
                  <button type="button" className="jbd-btn jbd-btn--ghost jbd-wide-only" onClick={() => act(J.collapseAll)}>{s.collapsed.length ? 'Expand all' : 'Collapse all'}</button>
                  <span className="jbd-anchor">
                    <button type="button" className="jbd-btn jbd-btn--icon" aria-label="Keyboard shortcuts" aria-expanded={s.menu === 'sheet'} onClick={() => act((x) => J.setMenu(x, 'sheet'))}>?</button>
                    {s.menu === 'sheet' && (
                      <div className="jbd-pop jbd-pop--end jbd-sheet" role="dialog" aria-label="Keyboard shortcuts">
                        <p>When this panel has focus</p>
                        <dl>{SHORTCUTS.map(([k, v]) => <span key={k} style={{ display: 'contents' }}><dt><span className="jbd-kbd">{k}</span></dt><dd>{v}</dd></span>)}</dl>
                      </div>
                    )}
                  </span>
                </span>
              </div>
            </div>

            <div className="jbd-body">
              <div className="jbd-list" ref={listEl}>
                {list.length === 0 ? (
                  <p className="jbd-empty">{s.scope === 'open' ? 'Nothing assigned to you. 🎉' : 'No done tickets yet.'}</p>
                ) : (
                  <>
                    {typedKey && (
                      <div className="jbd-offer">
                        <span>{typedKey} isn’t in this list.</span>
                        <button type="button" className="jbd-btn jbd-btn--line" data-offer="" onClick={() => act((x) => J.openTicket(x, typedKey))}>Open {typedKey}</button>
                      </div>
                    )}
                    {!typedKey && filtering && groups.length === 0 && <p className="jbd-empty">{s.query.trim() ? `No tickets match “${s.query.trim()}” here.` : 'No tickets match these filters.'}</p>}
                    {s.groupBy === 'board' && checking ? (
                      <div className="jbd-skel" role="status"><p className="jbd-note">Checking which of your boards list these tickets and their parents…</p><i /><i /><i /></div>
                    ) : (
                      <div className="jbd-list-in" key={`${s.scope}:${s.site}`}>{groups.map(group)}</div>
                    )}
                  </>
                )}
              </div>
              {pane}
            </div>
          </div>

          {/* the film layer: shown only while a scene plays */}
          <div className="jbf-tabs" aria-hidden="true">{TABS.map(([t, fav]) => <span key={t} className="jbf-tab" style={{ '--fav': fav } as CSSProperties}><span>{t}</span></span>)}</div>
          <span className="jbf-count" aria-hidden="true"><b>{TABS.length}</b><span>tabs</span> <i>→ 1</i></span>
          <i className="jbf-railglow" aria-hidden="true" />
          <span className="jbf-note" aria-hidden="true">Same name. The email tells them apart.</span>
          <i className="jbd-glow" data-glow="" aria-hidden="true" />
          <i className="jbd-click" data-click="" aria-hidden="true" />
          <svg className="jbd-hand" viewBox="0 0 14 19" aria-hidden="true"><path d="M1 1v14.5l3.6-3.3 2.7 6 2.4-1.1-2.6-5.8H12z" /></svg>
        </div>
      </div>
      <div className="jbf-key" aria-hidden="true"><b /><small /></div>
      <div className="jbf-keylog" aria-hidden="true" />
    </div>
  );
}
