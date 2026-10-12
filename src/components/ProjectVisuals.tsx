import { useEffect, useId, useRef, type ReactNode } from 'react';
import { PALETTE } from '@/art/palette';
import type { Project } from '@/content/data';
import { thousands } from '@/lib/format';
import { ensureGsap, gsap, ScrollTrigger } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { EASE } from '@/motion/tokens';

// Each project card plays a tiny scene of the product in use, drawn as one SVG
// on a fixed 320×200 grid. The markup is the scene's last frame, so it reads the
// same prerendered and with motion off. With motion, the scene plays when the
// card comes into view, then loops quietly (desktop) only while it is on screen;
// hovering a resting card replays it. Touch screens play it once.

const { fg: FG, mute: MUTE, ac: AC, carbon: CARBON, panel: PANEL } = PALETTE, DIM = '#2a2a2e', LINE = 'rgb(255 255 255 / 0.12)';
const t = (size: number, fill: string = FG, weight?: number) => ({ className: 'font-mono', fontSize: size, fill, fontWeight: weight });
const label = (fill: string = MUTE) => ({ ...t(5.8, fill, 600), letterSpacing: 0.6 });

type At = number | string;
/** Text helpers for a scene's timeline. Text is restored at time 0 on every replay. */
type Fx = {
  tl: gsap.core.Timeline;
  q: <T extends Element = SVGGraphicsElement>(sel: string) => T;
  qa: (sel: string) => SVGGraphicsElement[];
  /** Text shown at time 0, before the scene changes it. */
  from: (el: Element, text: string) => void;
  /** Types the element's text (or `text`) out, starting from empty. */
  type: (el: Element, at: At, dur: number, text?: string) => void;
  /** Counts the number in the element's text up from `start`. */
  count: (el: Element, start: number, at: At, dur: number) => void;
  /** Scrambles from one string into another. */
  scramble: (el: Element, a: string, b: string, at: At, dur: number) => void;
  click: (cursor: Element, at: At) => void;
};

const setText = (el: Element, s: string) => { const n = el.firstChild; if (n && n.nodeType === 3) n.nodeValue = s; else el.textContent = s; };
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789-/';

function Scene({ build, children }: { build: (fx: Fx) => void; children: ReactNode }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !motionEnabled()) return;
    ensureGsap();
    const touch = isTouch();
    const finals = new Map<Element, string>(); // the markup's text, restored on cleanup
    const keep = (el: Element) => { if (!finals.has(el)) finals.set(el, el.textContent ?? ''); return finals.get(el)!; };
    const resets: (() => void)[] = [];
    const reset = () => resets.forEach(r => r());
    let tl!: gsap.core.Timeline;
    let started = false;
    // A wrapper can hold the first play back (Projects: until its reveal curtain has lifted).
    const delay = Number(svg.closest<HTMLElement>('[data-scene-delay]')?.dataset.sceneDelay ?? 0);
    const ctx = gsap.context(() => {
      tl = gsap.timeline({ paused: true, delay, repeat: touch ? 0 : -1, repeatDelay: 2.5, defaults: { ease: EASE.out, duration: 0.4 }, onRepeat: reset });
      const fx: Fx = {
        tl,
        q: sel => svg.querySelector(sel)!,
        qa: sel => [...svg.querySelectorAll<SVGGraphicsElement>(sel)],
        from: (el, text) => { keep(el); resets.push(() => setText(el, text)); },
        type: (el, at, dur, text) => {
          const full = text ?? keep(el);
          fx.from(el, '');
          const o = { n: 0 };
          tl.to(o, { n: full.length, duration: dur, ease: EASE.none, onUpdate: () => setText(el, full.slice(0, Math.round(o.n))) }, at);
        },
        count: (el, start, at, dur) => {
          const [, pre, num, post] = keep(el).match(/^(\D*)([\d,]+)(.*)$/)!;
          const end = parseInt(num.replace(/,/g, ''), 10), fmt = (n: number) => pre + thousands(n) + post;
          fx.from(el, fmt(start));
          const o = { n: start };
          tl.to(o, { n: end, duration: dur, ease: EASE.out, onUpdate: () => setText(el, fmt(o.n)) }, at);
        },
        scramble: (el, a, b, at, dur) => {
          keep(el);
          const o = { p: 0 };
          tl.to(o, { p: 1, duration: dur, ease: EASE.none, onUpdate: () => {
            const len = Math.round(a.length + (b.length - a.length) * o.p), k = Math.floor(b.length * o.p);
            let s = b.slice(0, k);
            for (let i = k; i < len; i++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
            setText(el, o.p >= 1 ? b : s);
          } }, at);
        },
        click: (cursor, at) => { tl.to(cursor, { scale: 0.8, duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, at); },
      };
      build(fx);
      tl.progress(0);
      reset();
      ScrollTrigger.create({
        trigger: svg, start: 'top 85%', end: 'bottom top',
        onToggle: self => {
          if (!self.isActive) tl.pause();
          else if (!started) { started = true; reset(); tl.restart(true); }
          else tl.resume();
        },
      });
    }, svg);
    // Hover replays a resting scene (never cuts one mid-play).
    const card = !touch && svg.closest('[data-card]');
    const replay = () => { if (started && tl.time() >= tl.duration() - 0.01) { reset(); tl.restart(); } };
    if (card) card.addEventListener('pointerenter', replay);
    return () => {
      if (card) card.removeEventListener('pointerenter', replay);
      ctx.revert();
      finals.forEach((s, el) => setText(el, s));
    };
  }, [build]);
  // The scene sits at 76% on a dot grid, so it reads as an illustration, apart from the card's own
  // text; phones draw it at 90% so its small UI text stays readable (see .proj-scene in index.css).
  return (
    <svg ref={ref} viewBox="0 0 320 200" className="h-full w-full" fill="none">
      <defs>
        <pattern id={`dots-${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.45" fill="rgb(255 255 255 / 0.14)" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#dots-${id})`} />
      <g className="proj-scene">{children}</g>
    </svg>
  );
}

const Cursor = () => (
  // data-pointer, not data-cursor: that one sets the real cursor's state (Cursor.tsx).
  <g data-pointer opacity="0">
    <path d="M0 0 L0 11 L3 8.5 L5.5 13 L7.5 12 L5 7.5 L9 7.5 Z" fill={FG} stroke={CARBON} strokeWidth="0.8" strokeLinejoin="round" />
  </g>
);

/** A selectable chip; `on` chips are picked during the scene and end selected. */
const Chip = ({ x, y, w, text, on }: { x: number; y: number; w: number; text: string; on?: boolean }) => (
  <g data-chip={on || undefined} data-cx={x + w * 0.6} data-cy={y + 7}>
    <rect x={x} y={y} width={w} height="12" rx="6" fill={on ? AC : 'none'} stroke={on ? AC : LINE} />
    <text x={x + w / 2} y={y + 8.2} textAnchor="middle" {...t(5.8, on ? CARBON : FG, 600)}>{text}</text>
  </g>
);

/* ---------- SuperAgent, the AI agent platform: build an agent in a form, deploy it, it answers in Slack ---------- */

function buildAgents({ tl, q, qa, type, count, click }: Fx) {
  const cur = q('[data-pointer]'), chips = qa('[data-chip]'), lines = qa('[data-reply]');
  // Name, prompt, pick MCP tools, pick where people chat with it, post. Then it answers
  // in Slack and the live count ticks to 450.
  tl.fromTo(q('[data-form]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  type(q('[data-name]'), 0.3, 0.6);
  qa('[data-prompt]').forEach((l, i) => type(l, 0.95 + i * 0.55, 0.5));
  const pos = (el: Element) => ({ x: +el.getAttribute('data-cx')!, y: +el.getAttribute('data-cy')! });
  chips.forEach((c, i) => {
    const at = 2.5 + i * 0.45;
    if (i) tl.to(cur, { ...pos(c), duration: 0.3, ease: 'power2.inOut' }, at - 0.35);
    else tl.fromTo(cur, { autoAlpha: 0, x: 150, y: 200 }, { autoAlpha: 1, ...pos(c), duration: 0.45, ease: 'power2.inOut' }, at - 0.5);
    click(cur, at);
    tl.fromTo(c.querySelector('rect'), { fill: 'rgba(255,36,56,0)', stroke: LINE }, { fill: AC, stroke: AC, duration: 0.15 }, at + 0.05)
      .fromTo(c.querySelector('text'), { fill: FG }, { fill: CARBON, duration: 0.15 }, at + 0.05);
  });
  const post = 2.5 + chips.length * 0.45 + 0.1;
  tl.to(cur, { x: 92, y: 170, duration: 0.35, ease: 'power2.inOut' }, post - 0.4);
  click(cur, post);
  tl.to(q('[data-btn]'), { scale: 0.96, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, post + 0.05)
    .fromTo(q('[data-strike]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3 }, post + 0.15)
    .fromTo(q('[data-ten]'), { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.3 }, post + 0.25)
    .to(cur, { autoAlpha: 0, duration: 0.2 }, post + 0.3)
    .fromTo(q('[data-msg1]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0 }, post + 0.5)
    .fromTo(q('[data-msg2]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0 }, post + 1.0);
  lines.forEach((l, i) => type(l, post + 1.25 + i * 0.45, 0.4));
  count(q('[data-live]'), 449, post + 2.65, 0.3);
  tl.fromTo(q('[data-live]'), { scale: 1 }, { scale: 1.12, transformOrigin: '100% 50%', duration: 0.12, yoyo: true, repeat: 1, ease: EASE.out }, post + 2.65);
}

function AgentsScene() {
  return (
    <Scene build={buildAgents}>
      <g data-form>
        <rect x="14" y="8" width="138" height="184" rx="4" fill={PANEL} stroke={LINE} />
        <text x="26" y="24" {...label()}>NEW AGENT</text>
        <text x="26" y="40" {...t(6, MUTE)}>Name</text>
        <rect x="24" y="44" width="118" height="16" rx="2" fill={CARBON} stroke={LINE} />
        <text data-name x="30" y="55" {...t(7.2)}>Release notes bot</text>
        <text x="26" y="72" {...t(6, MUTE)}>Prompt</text>
        <rect x="24" y="76" width="118" height="26" rx="2" fill={CARBON} stroke={LINE} />
        <text data-prompt x="30" y="87" {...t(6.4)}>Summarize merged PRs</text>
        <text data-prompt x="30" y="96.5" {...t(6.4)}>for the weekly release</text>
        <text x="26" y="110" {...t(6, MUTE)}>Tools · MCP</text>
        <Chip x={24} y={114} w={32} text="github" on />
        <Chip x={60} y={114} w={46} text="confluence" on />
        <Chip x={110} y={114} w={32} text="+ add" />
        <text x="26" y="140" {...t(6, MUTE)}>Chat from</text>
        <Chip x={24} y={144} w={30} text="Slack" on />
        <Chip x={58} y={144} w={28} text="Jira" />
        <Chip x={90} y={144} w={40} text="Web chat" on />
        <g data-btn>
          <rect x="24" y="163" width="118" height="15" rx="2" fill={AC} />
          <text x="83" y="173" textAnchor="middle" {...t(6.6, CARBON, 700)} letterSpacing="0.8">POST</text>
        </g>
        <text x="26" y="187.5" {...t(6, MUTE)}>2–3 days</text>
        <line data-strike x1="25" y1="185.4" x2="55" y2="185.4" stroke={MUTE} strokeWidth="0.8" />
        <text data-ten x="142" y="187.5" textAnchor="end" {...t(6.6, AC, 700)}>10 min</text>
      </g>

      <rect x="162" y="8" width="144" height="184" rx="4" fill={PANEL} stroke={LINE} />
      <text x="174" y="24" {...label()}># RELEASE-TEAM</text>
      <g data-msg1>
        <circle cx="180" cy="47" r="6" fill={DIM} />
        <text x="192" y="46" {...t(7, FG, 700)}>Sara</text>
        <text x="192" y="56" {...t(6.8)}><tspan fill={AC}>@release-bot</tspan> what</text>
        <text x="192" y="65" {...t(6.8)}>shipped this week?</text>
      </g>
      <g data-msg2>
        <rect x="174" y="83" width="12" height="12" rx="3" fill={AC} />
        <text x="180" y="91.5" textAnchor="middle" {...t(7, CARBON, 700)}>R</text>
        <text x="192" y="89" {...t(7, FG, 700)}>Release notes bot</text>
        <rect x="267" y="83.5" width="16" height="7.5" rx="1.5" fill={DIM} />
        <text x="275" y="89" textAnchor="middle" {...t(4.8, MUTE, 700)}>APP</text>
      </g>
      <text data-reply x="192" y="100" {...t(6.8)}>3 features, 12 fixes:</text>
      <text data-reply x="192" y="110" {...t(6.8, MUTE)}>· Partner CSV export</text>
      <text data-reply x="192" y="120" {...t(6.8, MUTE)}>· Faster booking search</text>
      <line x1="172" y1="158" x2="296" y2="158" stroke={LINE} />
      <text x="174" y="178" {...label()}>AGENTS LIVE</text>
      <text data-live x="296" y="180" textAnchor="end" {...t(14, AC, 700)}>450+</text>
      <Cursor />
    </Scene>
  );
}

/* ---------- Dineout partner operations dashboard: bookings arrive live, export a CSV, support chats fade away ---------- */

const ROWS = [
  { time: '20:45', what: 'Table for 2', tag: 'BOOKED' },
  { time: '20:40', what: 'Walk-in · 3 guests', tag: 'WALK-IN' },
  { time: '20:30', what: 'Table for 4', tag: 'BOOKED' },
  { time: '20:15', what: 'Table for 6', tag: 'BOOKED' },
];

function buildOps({ tl, q, qa, count, scramble, from, click }: Fx) {
  const cur = q('[data-pointer]'), rows = qa('[data-row]'), flash = qa('[data-flash]'), exp = q('[data-exp]');
  const A = 0.6, B = 1.6;
  tl.fromTo(q('[data-dash]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(q('[data-dot]'), { opacity: 1 }, { opacity: 0.25, duration: 0.5, repeat: 9, yoyo: true, ease: 'sine.inOut' }, 0)
    // A walk-in arrives, then a booking: older rows slide down, the new one lands on top.
    .fromTo(rows.slice(2), { y: -36 }, { y: -18, duration: 0.4 }, A)
    .fromTo(rows[1], { autoAlpha: 0, x: -6, y: -18 }, { autoAlpha: 1, x: 0, duration: 0.4 }, A)
    .fromTo(flash[1], { opacity: 0.35 }, { opacity: 0, duration: 0.9, ease: EASE.in }, A + 0.1)
    .to(rows.slice(1), { y: 0, duration: 0.4 }, B)
    .fromTo(rows[0], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.4 }, B)
    .fromTo(flash[0], { opacity: 0.35 }, { opacity: 0, duration: 0.9, ease: EASE.in }, B + 0.1);
  count(q('[data-wi]'), 95, A, 0.4);
  count(q('[data-bk]'), 1283, B, 0.4);
  // Export: the button flashes and a CSV file pops out.
  tl.fromTo(cur, { autoAlpha: 0, x: 300, y: 196 }, { autoAlpha: 1, x: 252, y: 60, duration: 0.5, ease: 'power2.inOut' }, 2.3);
  click(cur, 2.85);
  tl.to(exp.querySelector('rect'), { fill: AC, duration: 0.1, yoyo: true, repeat: 1, repeatDelay: 0.15 }, 2.9)
    .to(exp.querySelector('text'), { fill: CARBON, duration: 0.1, yoyo: true, repeat: 1, repeatDelay: 0.15 }, 2.9)
    .fromTo(q('[data-file]'), { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: -20, duration: 0.35 }, 2.95)
    .to(q('[data-file]'), { autoAlpha: 0, duration: 0.25, ease: EASE.in }, 3.55)
    .to(cur, { autoAlpha: 0, duration: 0.2 }, 3.3)
    // Support chats: the pile shrinks to one.
    .fromTo(qa('[data-bub]').slice(1), { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.5, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.08, ease: EASE.in }, 3.6);
  const sup = q('[data-sup]');
  from(sup, '500+');
  scramble(sup, '500+', '<20', 3.7, 0.5);
}

function OpsScene() {
  return (
    <Scene build={buildOps}>
      <g data-dash>
        <rect x="14" y="16" width="292" height="168" rx="4" fill={PANEL} stroke={LINE} />
        <text x="26" y="33" {...label()}>BOOKINGS · TODAY</text>
        <circle data-dot cx="272" cy="31" r="2.2" fill={AC} />
        <text x="296" y="33" textAnchor="end" {...label(AC)}>LIVE</text>

        <rect x="24" y="42" width="84" height="32" rx="2" fill={CARBON} stroke={LINE} />
        <text x="32" y="53" {...label()}>BOOKINGS</text>
        <text data-bk x="32" y="67" {...t(11, FG, 700)}>1,284</text>
        <rect x="114" y="42" width="84" height="32" rx="2" fill={CARBON} stroke={LINE} />
        <text x="122" y="53" {...label()}>WALK-INS</text>
        <text data-wi x="122" y="67" {...t(11, FG, 700)}>96</text>
        <g data-exp>
          <rect x="204" y="42" width="92" height="32" rx="2" fill="rgba(255,36,56,0)" stroke={AC} />
          <text x="250" y="60.5" textAnchor="middle" {...t(7, AC, 700)} letterSpacing="0.6">EXPORT CSV</text>
        </g>

        {ROWS.map((r, i) => {
          const top = 82 + i * 18, walk = r.tag === 'WALK-IN';
          return (
            <g key={r.time} data-row>
              <rect data-flash x="24" y={top} width="272" height="16" rx="2" fill={AC} opacity="0" />
              <text x="32" y={top + 10.5} {...t(6.5, MUTE)}>{r.time}</text>
              <text x="64" y={top + 10.5} {...t(7)}>{r.what}</text>
              <rect x="246" y={top + 3.5} width="44" height="9" rx="4.5" fill={walk ? 'none' : DIM} stroke={walk ? AC : 'none'} strokeWidth="0.8" />
              <text x="268" y={top + 10} textAnchor="middle" {...t(5, walk ? AC : FG, 700)}>{r.tag}</text>
            </g>
          );
        })}

        <line x1="24" y1="160" x2="296" y2="160" stroke={LINE} />
        <text x="26" y="175" {...label()}>SUPPORT CHATS</text>
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} data-bub opacity={i ? 0 : 1} transform={`translate(${104 + i * 13} 167)`}>
            <rect width="10" height="7" rx="2" fill={i ? DIM : MUTE} />
            <path d="M2 7 L2 9.5 L4.5 7 Z" fill={i ? DIM : MUTE} />
          </g>
        ))}
        <text data-sup x="296" y="176" textAnchor="end" {...t(9, AC, 700)}>&lt;20</text>
      </g>
      <g data-file opacity="0" transform="translate(244 48)">
        <path d="M0 0 H9 L13 4 V16 H0 Z" fill={FG} />
        <text x="6.5" y="12" textAnchor="middle" {...t(3.8, CARBON, 700)}>CSV</text>
      </g>
      <Cursor />
    </Scene>
  );
}

/* ---------- Multi-LLM API server: change one word, same request, another model answers ---------- */

const MODELS = [
  { id: 'gpt-4o', via: 'via OpenAI' },
  { id: 'llama-3', via: 'via Meta Llama' },
  { id: 'hf/mistral', via: 'via HuggingFace' },
  { id: 'claude', via: 'via Anthropic' },
];

function buildLlm({ tl, q, type, scramble, from }: Fx) {
  const model = q('[data-model]'), via = q('[data-via]'), out = q('[data-out]'), hl = q('[data-hl]');
  tl.fromTo(q('[data-editor]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  from(model, MODELS[0].id);
  from(via, MODELS[0].via);
  type(out, 0.35, 0.8);
  MODELS.slice(1).forEach((m, i) => {
    const at = 1.6 + i * 1.6, prev = MODELS[i];
    tl.fromTo(hl, { opacity: 0 }, { opacity: 0.18, duration: 0.12, immediateRender: false }, at)
      .to(hl, { opacity: 0, duration: 0.5, ease: EASE.in }, at + 0.4);
    scramble(model, prev.id, m.id, at, 0.45);
    scramble(via, prev.via, m.via, at + 0.1, 0.45);
    type(out, at + 0.5, 0.8);
  });
}

function LlmScene() {
  const code = (n: number, y: number, body: ReactNode) => (
    <g key={n}>
      <text x="26" y={y} textAnchor="end" {...t(6.5, DIM)}>{n}</text>
      <text x="36" y={y} {...t(7.5)} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}>{body}</text>
    </g>
  );
  return (
    <Scene build={buildLlm}>
      <g data-editor>
        <rect x="14" y="14" width="292" height="116" rx="4" fill={PANEL} stroke={LINE} />
        {[24, 32, 40].map(x => <circle key={x} cx={x} cy="24" r="2" fill={DIM} />)}
        <text x="52" y="26.2" {...label()}>app.py</text>
        <text x="296" y="26.2" textAnchor="end" {...label(AC)}>4 PROVIDERS · 1 API</text>
        <line x1="14" y1="33" x2="306" y2="33" stroke={LINE} />
        <rect data-hl x="32" y="78.5" width="268" height="12" rx="1.5" fill={AC} opacity="0" />
        {code(1, 48, <><tspan fill={MUTE}>from</tspan> gateway <tspan fill={MUTE}>import</tspan> llm</>)}
        {code(2, 61, '')}
        {code(3, 74, 'reply = llm.chat(')}
        {code(4, 87, <>{'    model="'}<tspan data-model fill={AC} fontWeight="700">claude</tspan>{'",'}</>)}
        {code(5, 100, <>{'    prompt='}<tspan fill={MUTE}>"Summarize Q3 sales"</tspan>,</>)}
        {code(6, 113, ')')}

        <rect x="14" y="138" width="292" height="46" rx="4" fill={CARBON} stroke={LINE} />
        <text x="24" y="152" {...label()}>OUTPUT</text>
        <text data-via x="296" y="152" textAnchor="end" {...label(AC)}>via Anthropic</text>
        <text data-out x="24" y="170" {...t(7.5)}>Sales rose 12%, led by partner bookings.</text>
      </g>
    </Scene>
  );
}

const SCENES: Record<Project['id'], () => ReactNode> = { agents: AgentsScene, 'partner-ops': OpsScene, 'llm-server': LlmScene };

export function ProjectVisual({ project }: { project: Project }) {
  if (project.image) {
    return (
      <img src={project.image.src} width={project.image.w} height={project.image.h} alt={project.image.alt}
        loading="lazy" decoding="async" className="h-full w-full object-cover" />
    );
  }
  const S = SCENES[project.id];
  return <div aria-hidden="true" className="h-full w-full"><S /></div>;
}
