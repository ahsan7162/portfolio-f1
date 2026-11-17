// bb Dashboards, playable: the Harbor Coffee dashboard in bb's side panel. Filtering, Colours and old
// versions answer at once with no model call; only Send (an Edit request) costs one. Given a `scene`, it
// plays that scene by itself (dashScenes.ts) through the same state changes the controls make, filmed:
// a camera, the program streaming in, the versions deck behind the window (dashFilm.ts).
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Flip, gsap, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import { ACCENTS, CHANNEL_NAMES, CHANNELS, FIRST, HAND, palette, parseHex, requests, salesDash, send, shown, type DemoState, type Part } from './dash';
import { arrive, assemble, joinDeck, rest, ripple } from './dashFilm';
import { BUILD_CODE, CHANGE_CODE, SCENES, type CodeLine } from './dashScenes';
import { build, Chevron, DashBody, Head, retween, snapshot, useSeen } from './DashView';
import '../styles/dash-film.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
interface Pending { prev: DemoState; before: Map<string, number>; sigs: Map<string, string>; flip: Flip.FlipState | null }

/** How fast a colour ripple travels by hand, in window pixels a millisecond: across the window in about a third of a second. */
const RIPPLE = 3.2;
/** The newest versions the deck shows (its room above the window is three steps: dash-film.css). */
const DECK = 3;

/** The one line under the header, so its messages never move the window. */
function status(s: DemoState) {
  const n = s.versions.length;
  if (!n) return { key: 'empty', text: 'Ask the agent for a dashboard; it opens here.' };
  if (s.viewing !== null) return { key: `old${s.viewing}`, text: `Version ${s.viewing + 1} of ${n}, read-only.`, back: true };
  if (s.editing) return s.picked
    ? { key: 'say', text: 'Say what should change, then Send. That is one model call.' }
    : { key: 'edit', text: 'Edit mode: click the trend chart, or Tab to it and press Enter. Escape leaves.' };
  if (s.saved) return { key: `saved${n}`, text: `Checked and saved · version ${n}`, ok: true };
  return { key: 'idle', text: 'Filters, colours and old versions answer with no model call.' };
}

/** A program line as an editor shows it: the statement's name, then the components it calls. */
function Tokens({ text }: { text: string }) {
  const m = /^(\w+) = (.*)$/.exec(text);
  if (!m) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const c of m[2].matchAll(/[A-Z]\w*(?=\()/g)) {
    parts.push(m[2].slice(last, c.index), <i key={c.index}>{c[0]}</i>);
    last = c.index + c[0].length;
  }
  parts.push(m[2].slice(last));
  return <><b>{m[1]}</b><span className="dsd-line-rest">{' = '}{parts}</span></>;
}

/** A scene's program, in the film layer: hidden until the scene streams it in (decoration; the page's code block is the real text). */
function Code({ which, lines }: { which: string; lines: readonly CodeLine[] }) {
  return (
    <div className="dsd-code" data-for={which}>
      <i className="dsd-code-bg" />
      <p className="dsd-code-title"><span>openui-lang</span><span className="dsd-code-ok">Checked</span></p>
      {lines.map((l, i) => (
        <p key={l.text} className="dsd-line" data-part={l.part}>
          <span className="dsd-line-n">{l.n ?? i + 1}</span>
          <span className="dsd-line-t"><Tokens text={l.text} /></span>
          <i className="dsd-tick dsd-line-ok" />
        </p>
      ))}
      <i className="dsd-scan" />
    </div>
  );
}

export function DashDemo({ active, onTally, scene }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const startOf = (n: number | undefined) => {
    const sc = n === undefined ? undefined : SCENES[n];
    return sc && (reducedMotion() ? sc.end : sc.start);
  };
  const [s, setS] = useState<DemoState>(() => startOf(scene) ?? HAND);
  // A new scene starts from its own state (its end, with reduced motion), set before it is drawn.
  const [playing, setPlaying] = useState(scene);
  if (scene !== playing) {
    setPlaying(scene);
    const st = startOf(scene);
    if (st) setS(st);
  }
  const now = useRef(s);
  const pending = useRef<Pending | null>(null);
  const refocus = useRef<string | null>(null);
  const fx = useRef(new Set<gsap.core.Animation>());
  const tl = useRef<gsap.core.Timeline | null>(null);
  const speed = useRef(RIPPLE);
  const seen = useSeen(root);
  const popId = useId();
  const { contextSafe } = useGSAP({ scope: root });
  // A scene is filmed: the camera, the dimmed room in Edit, the program streaming in. By hand it is the plain demo.
  const film = scene !== undefined && !reducedMotion();

  const track = (a: gsap.core.Animation | null | undefined) => {
    if (!a) return;
    fx.current.add(a);
    void a.then(() => fx.current.delete(a));
  };
  /** Everything mid-flight lands on its end, so the demo is whole when the visitor takes over. */
  const finish = () => {
    for (const a of fx.current) a.progress(1).kill();
    fx.current.clear();
  };
  /** The film stops at once: its timeline, everything in flight landed, every film layer at rest and the camera flat. */
  const stop = () => {
    tl.current?.kill();
    tl.current = null;
    finish();
    speed.current = RIPPLE;
    if (root.current) rest(root.current);
  };

  /** Every change goes through here: it notes what was on screen, so the change can be drawn from it. */
  const act = (f: (x: DemoState) => DemoState) => {
    const prev = now.current;
    const next = f(prev);
    if (next === prev) return;
    const el = root.current;
    if (el && !reducedMotion()) {
      const cards = el.querySelectorAll<HTMLElement>('.dsd-card');
      const moves = prev.versions.length > 0 && shown(prev)?.orders !== shown(next)?.orders;
      pending.current = {
        prev, before: snapshot(el), flip: moves ? Flip.getState(cards) : null,
        sigs: new Map([...cards].map((c) => [c.dataset.flipId ?? '', c.dataset.sig ?? ''])),
      };
      // A new colour ripples out from the swatch that chose it (or from Reset); each part's delay is set before it changes.
      const w = win.current;
      const from = next.accent === prev.accent ? null : el.querySelector(next.accent === null ? '.dsd-pop--colours .dsd-pop-foot button' : `[data-sw="${next.accent}"]`);
      if (w && from) contextSafe(() => track(ripple(w, from, speed.current)))();
    }
    now.current = next;
    setS(next);
  };

  useEffect(() => { onTally?.(s.calls); }, [s.calls, onTally]);

  useLayoutEffect(() => { now.current = s; });

  // A scene change stops what was playing: the visitor took over, or another scene was picked.
  useGSAP(() => {
    stop();
    if (scene !== undefined) pending.current = null;
  }, { dependencies: [scene], scope: root });

  // The scene plays once its start state is on screen and the demo has been seen.
  useGSAP(() => {
    const sc = scene === undefined ? undefined : SCENES[scene];
    const [w, c, el] = [win.current, cam.current, root.current];
    const hand = w?.querySelector('.dsd-hand');
    if (!sc || !seen || tl.current || !w || !c || !el || !hand || reducedMotion()) return;
    rest(el);
    const at = (sel: string) => {
      const box = w.getBoundingClientRect();
      const k = box.width / w.offsetWidth || 1; // the camera, or the featured stage, scales the window
      const r = w.querySelector(sel)?.getBoundingClientRect();
      return r ? { x: (r.left + r.width / 2 - box.left) / k, y: (r.top + r.height / 2 - box.top) / k } : { x: 0, y: 0 };
    };
    tl.current = sc.play({
      hand, at, win: w, cam: c,
      act: (f) => flushSync(() => act(f)),
      fx: (make) => contextSafe(() => track(make()))(),
      amp: Math.min(1, Math.max(0.4, (w.offsetWidth - 300) / 700)),
      cost: () => el.dispatchEvent(new CustomEvent('scene-cost', { bubbles: true })),
      speed: (v) => { speed.current = v; },
    });
  }, { dependencies: [scene, seen], scope: root });

  // After each change: draw it from what was there before.
  useLayoutEffect(() => {
    const sel = refocus.current;
    refocus.current = null;
    if (sel) root.current?.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
    const p = pending.current;
    pending.current = null;
    const [el, w] = [root.current, win.current];
    if (!p || !el || !w) return;
    contextSafe(() => {
      const cards = [...el.querySelectorAll<HTMLElement>('.dsd-card')];
      if (!p.prev.versions.length) {
        // filmed, each line of the program grows into its card; by hand the dashboard builds in
        track(film ? assemble(w) : build(el.querySelector('.dsd-page') ?? el));
      } else {
        if (p.flip) {
          track(Flip.from(p.flip, {
            targets: cards, duration: 0.6, ease: 'power3.inOut',
            onEnter: (els: Element[]) => {
              const t = gsap.timeline();
              els.forEach((e) => t.add(film && e instanceof HTMLElement ? arrive(w, e) : build(e), film ? 0 : 0.2));
              return t;
            },
          }));
        }
        for (const c of cards) {
          const was = p.sigs.get(c.dataset.flipId ?? '');
          if (was && was !== c.dataset.sig) track(build(c, false));
        }
        if (p.prev.channel !== s.channel || p.prev.viewing !== s.viewing) track(retween(el, p.before));
      }
      if (p.prev.versions.length !== s.versions.length || p.prev.viewing !== s.viewing) {
        track(gsap.fromTo(el.querySelectorAll('.dsd-ver'), { yPercent: 80, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }));
      }
      // A saved version joins the deck; filmed, once the new part has landed.
      const deck = el.querySelector<HTMLElement>('.dsd-deck');
      if (deck && s.versions.length > p.prev.versions.length) track(joinDeck(deck, film ? 1.3 : 0.1));
      if (status(p.prev).key !== status(s).key) {
        track(gsap.fromTo(el.querySelector('.dsd-status-in'), { autoAlpha: 0, y: '0.4em' }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }));
      }
      const ask = el.querySelector('.dsd-ask-text');
      if (ask && s.request !== null && p.prev.request !== s.request) {
        const n = ask.textContent.length;
        track(gsap.fromTo(ask, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: n * 0.04, ease: `steps(${n})`, clearProps: 'clipPath' }));
      }
      // Edit mode: an outline travels from the Edit button to the part it can change.
      const [ring, from, to] = [el.querySelector('.dsd-ring'), el.querySelector('[data-edit]'), el.querySelector('.dsd-spot')];
      if (!p.prev.editing && s.editing && ring && from && to) {
        gsap.set(ring, { autoAlpha: 1 });
        Flip.fit(ring, from, { scale: false });
        const t = gsap.timeline();
        t.add(Flip.fit(ring, to, { scale: false, duration: 0.6, ease: 'power3.inOut' }) as gsap.core.Tween).to(ring, { autoAlpha: 0, duration: 0.25 });
        track(t);
      }
    })();
  });

  // A popover closes when the pointer goes down anywhere outside its control.
  useEffect(() => {
    if (!s.open) return;
    const away = (e: PointerEvent) => {
      if (!(e.target instanceof Element && e.target.closest('.dsd-ctl-wrap'))) act((x) => ({ ...x, open: null }));
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  });

  // Escape steps back out (popover, picked part, Edit mode), only while active and focus is in the demo.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (e.key !== 'Escape' || !t || !root.current?.contains(t) || t.closest('input, textarea, select, [contenteditable]')) return;
      const x = now.current;
      if (x.open) { refocus.current = x.open === 'colours' ? '[data-colours]' : '[data-versions]'; act((y) => ({ ...y, open: null })); }
      else if (x.picked) { refocus.current = '.dsd-spot'; act((y) => ({ ...y, picked: false, request: null })); }
      else if (x.editing) { refocus.current = '[data-edit]'; act((y) => ({ ...y, editing: false })); }
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const spec = shown(s);
  const dash = spec ? salesDash(s.channel, spec) : null;
  const n = s.versions.length;
  const old = s.viewing !== null;
  const asks = requests(s.versions.at(-1) ?? FIRST);
  const st = status(s);
  const colours: Vars | undefined = s.accent === null ? undefined : (() => {
    const p = palette(parseHex(ACCENTS[s.accent].hex));
    return { '--dsd-acc': p[0], '--dsd-s2': p[1], '--dsd-s3': p[2], '--dsd-s4': p[3] };
  })();
  const close = (x: DemoState): DemoState => ({ ...x, open: null });
  const sheets = s.versions.slice(-DECK);
  // The visitor taking over a playing scene: the film stops before their own change is measured.
  const takeOver = () => { if (scene !== undefined) stop(); };

  const slot = (p: Part) => {
    // the new chart's border light and the head that rides its line (dashFilm.ts arrive)
    if (p.id === 'o') return <><i className="dsd-trace" aria-hidden="true" /><i className="dsd-trace-dot" aria-hidden="true" /><i className="dsd-ride" aria-hidden="true" /></>;
    if (p.id !== 't' || !s.editing || old) return null;
    return (
      <>
        <button type="button" className="dsd-spot" aria-label="Revenue by week: say what should change" aria-haspopup="dialog" aria-expanded={s.picked}
          onClick={() => act((x) => ({ ...x, picked: true }))} />
        {s.picked && (
          <div className="dsd-pop dsd-pop--edit" role="dialog" aria-labelledby={popId}>
            <p className="dsd-pop-title" id={popId}>{'TimeSeries "Revenue"'}</p>
            <ol className="dsd-crumbs">
              <li>{'Section "Trend"'}</li>
              <li>{'Card "Revenue by week"'}</li>
              <li aria-current="location">{'TimeSeries "Revenue"'}</li>
            </ol>
            <p className="dsd-pop-label">What should change?</p>
            <p className="dsd-ask" data-empty={s.request === null ? '' : undefined}>
              <span className="dsd-ask-text">{s.request === null ? 'Pick a request below' : asks[s.request].text}</span>
            </p>
            <div className="dsd-asks">
              {asks.map((r, i) => (
                <button key={r.text} type="button" aria-pressed={s.request === i} onClick={() => act((x) => ({ ...x, request: i }))}>{r.text}</button>
              ))}
            </div>
            <div className="dsd-pop-foot">
              <button type="button" onClick={() => { refocus.current = '.dsd-spot'; act((x) => ({ ...x, picked: false, request: null })); }}>Cancel</button>
              <button type="button" className="dsd-send" disabled={s.request === null} onClick={() => { refocus.current = '[data-edit]'; act(send); }}>Send</button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="dsd dsd-demo" ref={root} style={colours} data-film={film ? '' : undefined} onClickCapture={takeOver} onKeyDownCapture={takeOver}>
      <div className="dsd-cam" ref={cam}>
        {/* every saved version is a sheet behind the window, the newest nearest */}
        <div className="dsd-deck" aria-hidden="true">
          {sheets.map((_, j) => {
            const i = n - sheets.length + j;
            return <i key={i} className="dsd-sheet" style={{ '--k': sheets.length - 1 - j } as Vars}><b>v{i + 1}</b></i>;
          })}
        </div>
        <div className="dsd-win" ref={win} data-editing={s.editing ? '' : undefined}>
          <Head title={dash?.title ?? 'Dashboards'} mode={dash?.mode}>
            <button type="button" className="dsd-ctl" data-edit="" aria-pressed={s.editing} disabled={!dash || old}
              title={old ? 'Old versions are read-only: go back to the latest to ask for a change' : undefined}
              onClick={() => act((x) => ({ ...x, editing: !x.editing, picked: false, request: null, open: null }))}>Edit</button>
            <span className="dsd-ctl-wrap">
              <button type="button" className="dsd-ctl" data-colours="" aria-haspopup="dialog" aria-expanded={s.open === 'colours'} disabled={!dash}
                onClick={() => act((x) => ({ ...x, open: x.open === 'colours' ? null : 'colours' }))}>Colours</button>
              {s.open === 'colours' && (
                <div className="dsd-pop dsd-pop--colours" role="dialog" aria-label="Dashboard colours">
                  <p className="dsd-pop-label">Accent</p>
                  <div className="dsd-swatches">
                    {ACCENTS.map((a, i) => (
                      <button key={a.name} type="button" className="dsd-sw" data-sw={i} aria-label={a.name} title={a.name} aria-pressed={s.accent === i}
                        style={{ '--sw': a.hex } as Vars} onClick={() => act((x) => ({ ...x, accent: i }))} />
                    ))}
                  </div>
                  <div className="dsd-pop-foot">
                    <span>No model call, no new version</span>
                    <button type="button" disabled={s.accent === null} onClick={() => act((x) => ({ ...x, accent: null }))}>Reset</button>
                  </div>
                </div>
              )}
            </span>
            <span className="dsd-ctl-wrap">
              <button type="button" className="dsd-ctl dsd-ctl--ver" data-versions="" aria-expanded={s.open === 'versions'} disabled={!n}
                onClick={() => act((x) => ({ ...x, open: x.open === 'versions' ? null : 'versions' }))}>
                <span className="dsd-ver">{old ? `Version ${(s.viewing ?? 0) + 1}` : `Latest: version ${Math.max(n, 1)}`}</span><Chevron />
              </button>
              {s.open === 'versions' && (
                <div className="dsd-pop dsd-pop--versions" role="group" aria-label="Versions">
                  {s.versions.map((_, i) => i).reverse().map((i) => (
                    <button key={i} type="button" aria-pressed={(s.viewing ?? n - 1) === i}
                      onClick={() => act((x) => ({ ...close(x), viewing: i === n - 1 ? null : i, editing: false, picked: false, request: null, saved: false }))}>
                      Version {i + 1}{i === n - 1 && <small>latest</small>}
                    </button>
                  ))}
                </div>
              )}
            </span>
          </Head>

          <div className="dsd-status" aria-live="polite">
            <p className="dsd-status-in" data-ok={st.ok ? '' : undefined}>
              {st.ok && <i className="dsd-tick" aria-hidden="true" />}
              <span>{st.text}</span>
              {st.back && <button type="button" onClick={() => act((x) => ({ ...x, viewing: null }))}>Back to latest</button>}
            </p>
          </div>

          <div className="dsd-page">
            <div className="dsd-filters" data-off={dash ? undefined : ''}>
              <div className="dsd-chips" role="group" aria-label="Channel">
                {CHANNELS.map((c) => (
                  <button key={c} type="button" className="dsd-chip" aria-pressed={s.channel === c} onClick={() => act((x) => ({ ...x, channel: c }))}>{CHANNEL_NAMES[c]}</button>
                ))}
              </div>
              <span className="dsd-calls" aria-live="polite"><b>{s.calls}</b> model {s.calls === 1 ? 'call' : 'calls'}</span>
            </div>
            {dash ? <DashBody dash={dash} slot={slot} /> : <div className="dsd-empty"><span>No dashboard yet</span></div>}
          </div>

          {/* the film layer: drawn over the product only while a scene plays */}
          <i className="dsd-dim" aria-hidden="true" />
          <i className="dsd-glow" aria-hidden="true" />
          <div className="dsd-film" aria-hidden="true">
            <Code which="build" lines={BUILD_CODE} />
            <Code which="change" lines={CHANGE_CODE} />
            <i className="dsd-sweep" />
            <i className="dsd-wave" />
            <i className="dsd-pulse-tail" />
            <i className="dsd-pulse" />
            <i className="dsd-burst" />
          </div>
          <i className="dsd-ring" aria-hidden="true" />
          <i className="dsd-click" aria-hidden="true" />
          <svg className="dsd-hand" viewBox="0 0 14 19" aria-hidden="true"><path d="M1 1v14.5l3.6-3.3 2.7 6 2.4-1.1-2.6-5.8H12z" /></svg>
        </div>
      </div>
    </div>
  );
}
