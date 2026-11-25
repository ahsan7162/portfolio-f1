// OpenUI Live Replies, playable: a bb thread where the agent's reply is a block you use, and a click in it is
// your next message. As a block streams in, the render line sweeps across it, the program on one side and the
// reply it draws on the other. Code shows the openui-lang program behind a reply; Edit changes it and the reply
// redraws, with problems listed in check_openui's words. Given a `scene`, the demo plays it (ouiScenes.ts) and the
// visitor can take over.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { Toggle } from '@ui-sdk/react/toggle';
import { gsap, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import { check, isPending, resolve } from './oui/lang';
import { ASK } from './oui/programs';
import { OuiBlock, streamed, streamTime } from './oui/render';
import { OUI_SCENES } from './ouiScenes';
import { answer, clickedWords, OPENING, send, type Msg } from './ouiThread';
import '../styles/openui-demo.css';

const PROSE_RATE = 95; // characters a second, as a reply's words arrive
const THINK_MS = 650;
type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Seconds since `on` turned true, a frame at a time until `until`; Infinity when off. */
function useClock(on: boolean, until: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick() {
      const now = (performance.now() - t0) / 1000;
      setT(now);
      if (now < until) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [on, until]);
  return on ? t : Infinity;
}

type View = 'reply' | 'code' | 'edit';

/** One block in a reply: the live UI, its program under the render line, and the editor. */
function Block({ program, t, ask }: { program: string; t: number; ask: (text: string) => void }) {
  const text = streamed(program, t);
  const streaming = text.length < program.length;
  const [view, setView] = useState<View>('reply');
  const [edit, setEdit] = useState(program);
  const id = useId();
  const src = view === 'edit' ? edit : text;
  const problems = useMemo(() => (view === 'edit' ? check(edit) : ''), [view, edit]);
  const renders = !isPending(resolve(src));
  // Where the render line stands: it sweeps across as the program streams in; after that, Code moves it all the way left.
  const at = streaming ? text.length / program.length : view === 'code' ? 0 : 1;

  return (
    <div className="oud-block" data-view={view} data-streaming={streaming || undefined}>
      <div className="oud-block-bar">
        <span className="oud-lang">openui-lang</span>
        <span className="oud-seg" role="group" aria-label="Show the block as">
          {(['reply', 'code', 'edit'] as const).map((v) => (
            <Toggle key={v} pressed={view === v} disabled={streaming}
              onPressedChange={() => { setView(v); if (v === 'edit') setEdit(program); }}>{v === 'reply' ? 'Reply' : v === 'code' ? 'Code' : 'Edit'}</Toggle>
          ))}
        </span>
      </div>
      {view === 'edit' ? (
        <div className="oud-edit">
          <div className="oud-edit-ui">{renders ? <OuiBlock src={edit} ask={ask} /> : <pre className="oud-asis">{edit}</pre>}</div>
          <div className="oud-edit-src">
            <label htmlFor={id} className="pp-sr">The block’s program</label>
            <textarea id={id} value={edit} spellCheck={false} onChange={(ev) => setEdit(ev.target.value)} />
            <p className="oud-check" data-ok={!problems || undefined} aria-live="polite">
              {problems ? <><b>check_openui:</b> {problems}</> : 'check_openui: the block parses and renders.'}
            </p>
            {!renders && <p className="oud-check">With no renderable root, bb shows the block as its code.</p>}
          </div>
        </div>
      ) : (
        <div className="oud-layers" style={{ '--x': at } as Vars}>
          <div className="oud-ui" inert={at < 0.02}><OuiBlock src={text} streaming={streaming} ask={ask} /></div>
          <pre className="oud-src" aria-hidden={at > 0.98}><code>{text}</code></pre>
          {streaming && <i className="oud-seam" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}

/** An agent's reply: its sentence, then its block. A live one streams in, and says when it has. */
function Reply({ msg, ask, onDone }: { msg: Msg; ask: (text: string) => void; onDone: (id: number) => void }) {
  const proseT = msg.text.length / PROSE_RATE;
  const blockAt = proseT + 0.25;
  const end = msg.program ? blockAt + streamTime(msg.program) : proseT;
  const t = useClock(!!msg.live, end + 0.05);
  const done = t >= end;
  useEffect(() => { if (msg.live && done) onDone(msg.id); }, [msg.live, done, msg.id, onDone]);
  return (
    <div className="oud-msg oud-agent">
      <span className="oud-who" aria-hidden="true">Agent</span>
      <p className="oud-prose">{msg.text.slice(0, Math.floor(t * PROSE_RATE))}</p>
      {msg.program && t >= blockAt && <Block program={msg.program} t={t - blockAt} ask={ask} />}
    </div>
  );
}

export default function OpenUiDemo({ active, onTally, scene }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const calm = reducedMotion();
  const sc = scene === undefined ? undefined : OUI_SCENES[scene];
  const [msgs, setMsgs] = useState<Msg[]>(() => sc?.start ?? OPENING);
  const [playing, setPlaying] = useState(scene);
  // Each scene (and Reset) starts a new thread: the blocks' own state (weights, Sent) starts over with it.
  const [gen, setGen] = useState(0);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const instant = useRef(false);
  const lastClick = useRef<DOMRect | null>(null);
  const timers = useRef<number[]>([]);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const fx = useRef(new Set<gsap.core.Animation>());
  const prepFor = useRef<number | undefined>(undefined);
  const film = scene !== undefined && !calm;
  const { contextSafe } = useGSAP({ scope: root });

  // A new scene starts from its own thread, set before it is drawn.
  if (scene !== playing) {
    setPlaying(scene);
    if (sc) { setMsgs(sc.start); setDraft(''); setThinking(false); setGen((g) => g + 1); }
  }

  const clearTimers = useCallback(() => { for (const t of timers.current) clearTimeout(t); timers.current = []; }, []);
  const cost = useCallback(() => root.current?.dispatchEvent(new CustomEvent('scene-cost', { bubbles: true })), []);
  const playingRef = useRef(playing);
  useLayoutEffect(() => { playingRef.current = playing; });

  /** Sends `text` as the visitor's message. The agent answers after a beat (at once while a scene sets up). */
  const ask = (text: string, byClick = true) => {
    if (instant.current) { setMsgs((m) => send(m, text, byClick)); return; }
    setMsgs((m) => send(m, text, byClick, true));
    setDraft('');
    setThinking(true);
    timers.current.push(window.setTimeout(() => { setThinking(false); setMsgs((m) => answer(m)); }, THINK_MS));
  };
  const askRef = useRef(ask);
  useLayoutEffect(() => { askRef.current = ask; });
  const stableAsk = useMemo(() => (text: string) => askRef.current(text), []);
  const done = useCallback((id: number) => {
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, live: false } : x)));
    if (playingRef.current === 0) cost();
  }, [cost]);

  useEffect(() => { onTally?.(clickedWords(msgs)); }, [msgs, onTally]);
  useEffect(() => clearTimers, [clearTimers]);

  // The thread keeps its newest words in view as they arrive (it scrolls itself; the wheel stays the page's).
  useEffect(() => {
    const [th, ls] = [thread.current, list.current];
    if (!th || !ls) return;
    const ro = new ResizeObserver(() => { th.scrollTop = th.scrollHeight; });
    ro.observe(ls);
    return () => ro.disconnect();
  }, []);

  const stop = useCallback(() => {
    tl.current?.kill(); tl.current = null;
    for (const a of fx.current) a.progress(1).kill();
    fx.current.clear();
    if (root.current) gsap.set(root.current.querySelectorAll('.oud-cam, .oud-hand, [data-glow], [data-click]'), { clearProps: 'all' });
  }, []);

  // A scene: the clicks that bring it to its start (or, with reduced motion, its end), then its beat sheet. The
  // clicks run just after this commit, before the frame is painted: each is its own event, so each sees the last.
  useLayoutEffect(() => {
    if (!sc || prepFor.current === scene) return;
    prepFor.current = scene;
    stop();
    clearTimers();
    queueMicrotask(() => {
      if (prepFor.current !== scene || !root.current) return;
      instant.current = true;
      for (const sel of calm ? sc.endPrep : sc.prep) flushSync(() => root.current?.querySelector<HTMLElement>(sel)?.click());
      instant.current = false;
      lastClick.current = null;
      const [w, c] = [win.current, cam.current];
      const hand = w?.querySelector('.oud-hand');
      if (calm || !w || !c || !hand) return;
      const at = (sel: string) => {
        const box = w.getBoundingClientRect();
        const k = box.width / w.offsetWidth || 1;
        const r = w.querySelector(sel)?.getBoundingClientRect();
        return r ? { x: (r.left + r.width / 2 - box.left) / k, y: (r.top + r.height / 2 - box.top) / k } : { x: 0, y: 0 };
      };
      contextSafe(() => {
        tl.current = sc.play({
          hand, at, win: w, cam: c,
          amp: Math.min(1, Math.max(0.4, (w.offsetWidth - 300) / 700)),
          click: (sel) => w.querySelector<HTMLElement>(sel)?.click(),
          draft: (text) => setDraft(text),
          send: () => askRef.current(ASK, false),
          cost,
        });
      })();
    });
  });
  // A scene that ends with no other after it (the visitor took over, or the block left the screen) lands on its end
  // first, so the demo is handed over whole, never half built.
  useEffect(() => { if (scene === undefined) { prepFor.current = undefined; tl.current?.progress(1); stop(); } }, [scene, stop]);

  // A message a click sent rises from the button that sent it.
  const seen = useRef('');
  useLayoutEffect(() => {
    const last = msgs[msgs.length - 1];
    const from = lastClick.current;
    const key = last ? `${gen}-${last.id}` : '';
    if (!last || key === seen.current) return;
    seen.current = key;
    const el = list.current?.querySelector<HTMLElement>(`[data-id="${last.id}"]`);
    if (!el || !from || last.who !== 'me' || !last.byClick || calm) return;
    lastClick.current = null;
    const to = el.getBoundingClientRect();
    const k = (win.current?.getBoundingClientRect().width ?? 1) / (win.current?.offsetWidth || 1);
    contextSafe(() => {
      const a = gsap.from(el, { x: (from.left + from.width / 2 - (to.left + to.width / 2)) / k, y: (from.top - to.top) / k, scale: 0.7, autoAlpha: 0.4, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      fx.current.add(a);
    })();
  });

  const reset = () => { stop(); clearTimers(); setMsgs(OPENING); setDraft(''); setThinking(false); setGen((g) => g + 1); };
  // A scene presses the demo's own buttons; only a real click or key is the visitor taking over.
  const takeOver = (ev: React.SyntheticEvent) => { if (scene !== undefined && ev.nativeEvent.isTrusted) stop(); };
  const remember = (ev: React.MouseEvent) => {
    const b = (ev.target as Element).closest('.oud-block button, .oui-fence button');
    if (b) lastClick.current = b.getBoundingClientRect();
  };

  return (
    <div className="oud" ref={root} data-film={film || undefined} data-active={active || undefined} onClickCapture={(ev) => { remember(ev); takeOver(ev); }} onKeyDownCapture={takeOver}>
      <div className="oud-cam" ref={cam}>
        <div className="oud-win" ref={win}>
          <div className="oud-bar">
            <span className="oud-title">Email queue</span>
            <span className="oud-model">any agent in bb</span>
            <button type="button" className="oud-reset" onClick={reset} disabled={film}>Reset</button>
          </div>
          <div className="oud-thread" ref={thread}>
            <div className="oud-list" ref={list}>
              {msgs.length === 0 && !draft && <p className="oud-empty">Ask in words. The answer comes back as something to use.</p>}
              {msgs.map((m) => (m.who === 'me'
                ? <p key={`${gen}-${m.id}`} className="oud-msg oud-me" data-id={m.id} data-byclick={m.byClick || undefined}>{m.text}</p>
                : <div key={`${gen}-${m.id}`} data-id={m.id} className="oud-msg-wrap"><Reply msg={m} ask={stableAsk} onDone={done} /></div>))}
              {thinking && <p className="oud-msg oud-thinking" aria-label="The agent is answering"><i /><i /><i /></p>}
            </div>
          </div>
          <div className="oud-composer">
            {msgs.length === 0 && !draft && !film && (
              <button type="button" className="oud-chip" onClick={() => ask(ASK, false)}>{ASK}</button>
            )}
            <p className="oud-input" data-empty={!draft || undefined}>{draft || 'Reply to the agent…'}</p>
            <button type="button" className="oud-send" aria-label="Send" disabled={!draft || thinking} onClick={() => ask(draft, false)}>↑</button>
          </div>
          {/* the film layer: the pointer, shown only while a scene plays */}
          <i className="oud-glow" data-glow="" aria-hidden="true" />
          <i className="oud-click" data-click="" aria-hidden="true" />
          <svg className="oud-hand" viewBox="0 0 14 19" aria-hidden="true"><path d="M1 1v14.5l3.6-3.3 2.7 6 2.4-1.1-2.6-5.8H12z" /></svg>
        </div>
      </div>
    </div>
  );
}
