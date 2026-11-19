// Markwright, playable: the editor on one side, the file it writes on the other. Ticking a box, typing / for a
// block, or a line with a Markdown shortcut changes the document; 800 ms later autosave writes, and the file shows
// which lines changed since the commit. An agent can write the same file: with nothing unsaved its change appears
// in place; with an edit waiting, the write is stopped and a banner asks which version to keep. Given a `scene`,
// the demo plays it by itself (mdScenes.ts) through the same changes.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { diffRows, gutter, type Row } from '../lineDiff';
import { gsap, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import { fileOf } from './md';
import { CATALOG, filterCatalog, GROUP_ORDER, type Entry } from './mdCatalog';
import { grow, rest } from './mdFilm';
import { BlockView, SourceLine, type BlockHooks } from './mdRender';
import { MD_SCENES } from './mdScenes';
import {
  add, AGENT, agentWrites, fresh, keepMine, onDisk, redo, SAVE_MS, save, tally, tick, typed, undo, useTheirs, type MdState,
} from './mdState';
import '../styles/md-demo.css';

const FILE = 'launch-plan.md';

const SHAS = new Map<string, string>();

/** The first seven hex digits of a text's SHA-256, as the plugin's compare-and-swap checks it. */
function useSha(texts: string[]) {
  const [, bump] = useState(0);
  useEffect(() => {
    let live = true;
    for (const t of texts) {
      if (SHAS.has(t) || !globalThis.crypto?.subtle) continue;
      SHAS.set(t, '');
      void crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then((buf) => {
        SHAS.set(t, [...new Uint8Array(buf)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 7));
        if (live) bump((n) => n + 1);
      });
    }
    return () => { live = false; };
  });
  return (t: string) => SHAS.get(t) || '·······';
}

/** The compare view: your unsaved version against what is on disk now, unchanged runs folded. */
function Compare({ rows }: { rows: Row[] }) {
  const out: (Row | { fold: number })[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].op !== 'eq') { out.push(rows[i]); continue; }
    let j = i;
    while (j < rows.length && rows[j].op === 'eq') j++;
    const run = j - i;
    const keepBefore = i > 0 ? 1 : 0, keepAfter = j < rows.length ? 1 : 0;
    if (run > keepBefore + keepAfter + 1) {
      for (let k = 0; k < keepBefore; k++) out.push(rows[i + k]);
      out.push({ fold: run - keepBefore - keepAfter });
      for (let k = keepAfter; k > 0; k--) out.push(rows[j - k]);
    } else for (let k = i; k < j; k++) out.push(rows[k]);
    i = j - 1;
  }
  return (
    <div className="mwd-cmp">
      <p className="mwd-cmp-note">Lines marked + are your unsaved version; − is what’s on disk now.</p>
      {out.map((r, i) => ('fold' in r
        // oxlint-disable-next-line react/no-array-index-key -- rows of a diff, by position
        ? <p key={i} className="mwd-cmp-fold">{r.fold} unmodified lines</p>
        // oxlint-disable-next-line react/no-array-index-key -- rows of a diff, by position
        : <p key={i} className="mwd-cmp-row" data-op={r.op}><span>{r.op === 'add' ? '+' : r.op === 'del' ? '−' : ' '}</span><SourceLine text={r.text} /></p>))}
    </div>
  );
}

export function MdDemo({ active, onTally, scene }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const pageEl = useRef<HTMLDivElement>(null);
  const linesEl = useRef<HTMLDivElement>(null);
  const lineEl = useRef<HTMLInputElement>(null);
  const startOf = (n: number | undefined) => {
    const sc = n === undefined ? undefined : MD_SCENES[n];
    return sc && (reducedMotion() ? sc.end : sc.start);
  };
  const [s, setS] = useState<MdState>(() => startOf(scene) ?? fresh());
  // A new scene starts from its own state (its end, with reduced motion), set before it is drawn.
  const [playing, setPlaying] = useState(scene);
  if (scene !== playing) {
    setPlaying(scene);
    const st = startOf(scene);
    if (st) setS(st);
  }
  const [draft, setDraft] = useState('');
  const now = useRef(s);
  const prev = useRef<MdState | null>(null);
  const fx = useRef(new Set<gsap.core.Animation>());
  const tl = useRef<gsap.core.Timeline | null>(null);
  const menuId = useId();
  const { contextSafe } = useGSAP({ scope: root });
  const film = scene !== undefined && !reducedMotion();

  const track = (a: gsap.core.Animation | null | undefined) => {
    if (!a) return;
    fx.current.add(a);
    void a.then(() => fx.current.delete(a));
  };
  const finish = () => { for (const a of fx.current) a.progress(1).kill(); fx.current.clear(); };
  const stop = () => { tl.current?.kill(); tl.current = null; finish(); if (root.current) rest(root.current); };

  /** Every change goes through here, so the change can be drawn from what was on screen before it. */
  const act = (f: (x: MdState) => MdState) => {
    const p = now.current;
    const n = f(p);
    if (n === p) return;
    prev.current ??= p;
    now.current = n;
    setS(n);
  };

  const disk = fileOf(onDisk(s));
  const count = tally(s);
  useEffect(() => { onTally?.(count); }, [count, onTally]);
  useLayoutEffect(() => { now.current = s; });

  // Autosave: 800 ms after the last edit, unless a scene is playing (it saves on its own beat) or the banner is up.
  useEffect(() => {
    if (!s.saving || s.theirs || film) return;
    const t = setTimeout(() => act(save), SAVE_MS);
    return () => clearTimeout(t);
  });

  // A scene change stops what was playing: the visitor took over, or another scene was picked.
  useGSAP(() => { stop(); prev.current = null; }, { dependencies: [scene], scope: root });

  // The scene plays once its start state is on screen.
  useGSAP(() => {
    const sc = scene === undefined ? undefined : MD_SCENES[scene];
    const [w, c, el] = [win.current, cam.current, root.current];
    const hand = w?.querySelector('.mwd-hand');
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
      act: (f) => flushSync(() => act(f)),
      fx: (make) => contextSafe(() => track(make()))(),
      amp: Math.min(1, Math.max(0.4, (w.offsetWidth - 300) / 700)),
      cost: () => el.dispatchEvent(new CustomEvent('scene-cost', { bubbles: true })),
    });
  }, { dependencies: [scene], scope: root });

  // After each change: light what changed, in the document and in the file, and bring it into view.
  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = null;
    const [el, page, lines] = [root.current, pageEl.current, linesEl.current];
    if (!p || !el || !page || !lines) return;
    const calm = reducedMotion();
    contextSafe(() => {
      const scrollTo = (box: HTMLElement, target: HTMLElement | null) => {
        if (!target) return;
        const top = target.offsetTop - box.clientHeight * 0.3;
        const y = Math.max(0, Math.min(top, box.scrollHeight - box.clientHeight));
        if (calm) box.scrollTop = y; else track(gsap.to(box, { scrollTop: y, duration: 0.6, ease: 'power3.inOut', overwrite: true }));
      };
      // the document: blocks that are new or were rewritten
      const was = new Map(p.doc.parts.map((x) => [x.id, x.src]));
      const touched = s.doc.parts.filter((x) => was.get(x.id) !== x.src).map((x) => el.querySelector<HTMLElement>(`.mwd-blk[data-id="${x.id}"]`)).filter((x) => x !== null);
      if (touched.length && !calm) track(gsap.fromTo(touched, { '--flash': 1 }, { '--flash': 0, duration: 1.6, ease: 'power2.in' }));
      if (s.compare && !p.compare) scrollTo(page, el.querySelector<HTMLElement>('.mwd-cmp'));
      else if (touched.length) scrollTo(page, touched[0]);
      else if (s.query !== null && p.query === null) scrollTo(page, lineEl.current?.closest<HTMLElement>('.mwd-blk') ?? null);
      // a Mermaid block the visitor just added grows in (a scene grows its own, slower, with its source)
      const added = s.doc.parts.filter((x) => !was.has(x.id) && x.b.t === 'code' && x.b.lang === 'mermaid');
      if (added.length && !film && !calm) track(grow(el, 0.18));
      // the file: lines that just landed on disk
      const before = fileOf(onDisk(p));
      if (before !== disk) {
        const { marks } = gutter(diffRows(before, disk));
        const hot = marks.flatMap((m, i) => (m === 'same' ? [] : [lines.querySelector<HTMLElement>(`[data-ln="${i}"]`)])).filter((x) => x !== null);
        if (hot.length && !calm) track(gsap.fromTo(hot, { '--flash': 1 }, { '--flash': 0, duration: 1.8, ease: 'power2.in', stagger: 0.03 }));
        scrollTo(lines, hot[0] ?? null);
      }
      if (s.theirs && !p.theirs && !calm) track(gsap.from(el.querySelector('.mwd-banner'), { height: 0, autoAlpha: 0, duration: 0.45, ease: 'power3.out', clearProps: 'height' }));
    })();
  });

  // Typing on the empty line keeps the caret there; a scene drives the line without focusing it.
  const menuOpen = s.query !== null;
  useEffect(() => { if (menuOpen && !film && active) lineEl.current?.focus({ preventScroll: true }); }, [menuOpen, film, active]);

  const results = useMemo(() => (s.query === null ? [] : filterCatalog(s.query)), [s.query]);
  const pick = Math.min(s.pick, Math.max(0, results.length - 1));
  const choose = (e: Entry | undefined) => { if (e?.make) { setDraft(''); act((x) => add(x, e.make!())); } };
  const openMenu = (slot: number | null) => {
    act((x) => ({ ...x, slot, query: '', pick: 0, view: 'rich' }));
    // the empty line may have moved to its new place: focus it once it is drawn there
    setTimeout(() => lineEl.current?.focus({ preventScroll: true }));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (s.query !== null) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const d = e.key === 'ArrowDown' ? 1 : -1;
        act((x) => ({ ...x, pick: (pick + d + results.length) % Math.max(1, results.length) }));
      } else if (e.key === 'Enter') { e.preventDefault(); choose(results[pick]); }
      else if (e.key === 'Escape') { e.preventDefault(); setDraft(''); act((x) => ({ ...x, query: null })); }
      return;
    }
    if (e.key === 'Enter' && draft.trim()) { e.preventDefault(); const t = draft; setDraft(''); act((x) => typed(x, t)); }
  };
  const onLine = (v: string) => {
    if (v.startsWith('/')) act((x) => ({ ...x, query: v.replace(/^\/+/, ''), pick: 0 }));
    else { if (s.query !== null) act((x) => ({ ...x, query: null })); setDraft(v); }
  };

  const hooks: BlockHooks = {
    onTick: (part, i) => act((x) => tick(x, part.id, i)),
    editing: s.editing,
    onEdit: (id) => act((x) => ({ ...x, editing: id })),
  };

  /** The empty line: type / for the menu, or a line of Markdown and Enter. */
  const emptyLine = (
    <div className="mwd-blk mwd-blk--line" key="line">
      <input ref={lineEl} className="mwd-line" value={s.query !== null ? `/${s.query}` : draft} placeholder="Type / for blocks"
        aria-label="Empty line: type / for blocks, or Markdown and Enter" role="combobox" aria-expanded={s.query !== null} aria-controls={menuId}
        aria-activedescendant={s.query !== null && results[pick] ? `${menuId}-${results[pick].id}` : undefined} autoComplete="off" spellCheck={false}
        onChange={(e) => onLine(e.target.value)} onKeyDown={onKey}
        onBlur={(e) => { if (!e.relatedTarget?.closest('.mwd-menu') && !film) { setDraft(''); act((x) => (x.query === null ? x : { ...x, query: null })); } }} />
      {s.query !== null && (
        <div className="mwd-menu" id={menuId} role="listbox" aria-label="Blocks" data-lenis-prevent="">
          {results.length === 0 && <p className="mwd-menu-none">No blocks match</p>}
          {GROUP_ORDER.map((g) => {
            const inGroup = results.filter((r) => r.group === g);
            if (!inGroup.length) return null;
            return (
              <div key={g} role="group" aria-label={g}>
                <p className="mwd-menu-g" aria-hidden="true">{g}</p>
                {inGroup.map((r) => {
                  const i = results.indexOf(r);
                  return (
                    <div key={r.id} id={`${menuId}-${r.id}`} role="option" tabIndex={-1} aria-selected={i === pick} aria-disabled={!r.make || undefined}
                      className="mwd-menu-i" onPointerDown={(e) => e.preventDefault()} onClick={() => choose(r)} onKeyDown={(e) => { if (e.key === 'Enter') choose(r); }}
                      onPointerEnter={() => act((x) => ({ ...x, pick: i }))}>
                      <span className="mwd-glyph" aria-hidden="true">{r.glyph}</span>
                      <span className="mwd-menu-l">{r.label}</span>
                      <span className="mwd-menu-h">{r.make ? r.hint : 'Needs a file in bb'}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const blocks: ReactNode[] = [];
  const slot = s.slot ?? s.doc.parts.at(-1)?.id ?? null;
  for (const part of s.doc.parts) {
    blocks.push(
      <div key={part.id} className="mwd-blk" data-id={part.id} data-kind={part.b.t}>
        <button type="button" className="mwd-plus" aria-label="Add a block below" onClick={() => openMenu(part.id)}>+</button>
        <BlockView part={part} hooks={hooks} />
      </div>,
    );
    if (part.id === slot) blocks.push(emptyLine);
  }
  if (slot === null) blocks.push(emptyLine);

  const rows = useMemo(() => diffRows(s.base, disk), [s.base, disk]);
  const marks = useMemo(() => gutter(rows), [rows]);
  const plus = rows.filter((r) => r.op === 'add').length, minus = rows.filter((r) => r.op === 'del').length;
  const sha = useSha([fileOf(s.disk), ...(s.theirs ? [fileOf(s.theirs)] : [])]);
  const next = AGENT[s.agent];
  const state = s.theirs ? 'Changed on disk' : s.saving ? 'Saving…' : 'Saved';
  const dirty = s.agent > 0 || disk !== s.base || s.doc !== s.disk;
  const takeOver = () => { if (scene !== undefined) stop(); };
  const docLines = s.view === 'source' ? fileOf(s.doc).replace(/\n$/, '').split('\n') : [];

  return (
    <div className="mwd" ref={root} data-film={film ? '' : undefined} onClickCapture={takeOver} onKeyDownCapture={takeOver}>
      <div className="mwd-cam" ref={cam}>
        <div className="mwd-win" ref={win}>
          {/* Markwright, in bb's side panel */}
          <section className="mwd-doc" aria-label="Markwright">
            <div className="mwd-bar">
              <p className="mwd-name">{FILE}</p>
              <p className="mwd-state" data-state={s.theirs ? 'conflict' : s.saving ? 'saving' : 'saved'} aria-live="polite">{state}</p>
              <div className="mwd-seg" role="group" aria-label="View">
                <button type="button" aria-pressed={s.view === 'rich'} onClick={() => act((x) => ({ ...x, view: 'rich' }))}>Rich</button>
                <button type="button" aria-pressed={s.view === 'source'} onClick={() => act((x) => ({ ...x, view: 'source', query: null }))}>Source</button>
              </div>
            </div>
            <div className="mwd-tools">
              <span className="mwd-tools-deco" aria-hidden="true"><i className="mwd-sel">Text</i><b>B</b><i>I</i><s>S</s><span>‹›</span><span>⛓</span><span className="mwd-sep" /><span>•</span><span>1.</span><span>☑</span><span>❝</span><span className="mwd-sep" /></span>
              <button type="button" onClick={() => act((x) => add(x, CATALOG.find((e) => e.id === 'table')!.make!()))}>⊞ Table</button>
              <button type="button" data-insert="" onClick={() => openMenu(s.slot)}>+ Insert</button>
              <span className="mwd-tools-end">
                <button type="button" aria-label="Undo" disabled={!s.undo.length || !!s.theirs} onClick={() => act(undo)}>↶</button>
                <button type="button" aria-label="Redo" disabled={!s.redo.length || !!s.theirs} onClick={() => act(redo)}>↷</button>
              </span>
            </div>
            {s.theirs && (
              <div className="mwd-banner" role="alert">
                <p>This file changed on disk while you were editing.</p>
                <div>
                  <button type="button" data-compare="" aria-expanded={s.compare} onClick={() => act((x) => ({ ...x, compare: !x.compare }))}>{s.compare ? 'Hide changes' : 'Compare'}</button>
                  <button type="button" onClick={() => act(useTheirs)}>Use theirs</button>
                  <button type="button" data-keep="" onClick={() => act(keepMine)}>Keep mine</button>
                </div>
              </div>
            )}
            <div className="mwd-page" ref={pageEl}>
              {s.theirs && s.compare && <Compare rows={diffRows(fileOf(s.theirs), fileOf(s.doc))} />}
              {s.view === 'rich'
                ? <div className="mwd-rich">{blocks}</div>
                // oxlint-disable-next-line react/no-array-index-key -- lines of the file, by position
                : <pre className="mwd-src">{docLines.map((l, i) => <span key={i}><SourceLine text={l} />{'\n'}</span>)}</pre>}
            </div>
          </section>

          {/* the file on disk, against the last commit */}
          <section className="mwd-file" aria-label="The file on disk">
            <p className="mwd-file-head">
              <span className="mwd-file-name">{FILE}</span>
              <span className="mwd-file-on">on disk</span>
              <span className="mwd-counts" aria-label={`${plus} lines added, ${minus} removed since the last commit`}><b>+{plus}</b> <i>−{minus}</i></span>
            </p>
            <div className="mwd-agent">
              <span className="mwd-agent-av" aria-hidden="true">A</span>
              <p><b>Agent</b> <span>{next ? next.say : 'Done for now.'}</span></p>
              <button type="button" className="mwd-mini" disabled={!next} onClick={() => act(agentWrites)}>Let it write</button>
            </div>
            <div className="mwd-lines" ref={linesEl} aria-label={`${FILE}, ${count} ${count === 1 ? 'line' : 'lines'} changed since the last commit`}>
              {disk.replace(/\n$/, '').split('\n').map((l, i) => (
                // oxlint-disable-next-line react/no-array-index-key -- lines of the file, by position
                <p key={i} className="mwd-ln" data-ln={i} data-mark={marks.marks[i]} data-cut={marks.cuts.has(i) ? '' : undefined}>
                  <span className="mwd-ln-n" aria-hidden="true">{i + 1}</span>
                  <span className="mwd-ln-t"><SourceLine text={l} /></span>
                </p>
              ))}
            </div>
            <p className="mwd-file-foot">
              {s.theirs
                ? <span className="mwd-cas" data-stop=""><span>expected <b>{sha(fileOf(s.disk))}</b></span><span>on disk <b>{sha(fileOf(s.theirs))}</b></span><span>write stopped</span></span>
                : <span className="mwd-cas"><span>sha-256 <b>{sha(fileOf(s.disk))}</b></span></span>}
              <button type="button" className="mwd-mini" disabled={!dirty} onClick={() => { setDraft(''); act(() => fresh()); }}>Start over</button>
            </p>
          </section>

          {/* the film layer: the pointer, shown only while a scene plays */}
          <i className="mwd-glow" data-glow="" aria-hidden="true" />
          <i className="mwd-click" data-click="" aria-hidden="true" />
          <svg className="mwd-hand" viewBox="0 0 14 19" aria-hidden="true"><path d="M1 1v14.5l3.6-3.3 2.7 6 2.4-1.1-2.6-5.8H12z" /></svg>
        </div>
      </div>
    </div>
  );
}

