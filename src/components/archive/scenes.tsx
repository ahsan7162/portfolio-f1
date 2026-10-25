import type { ReactNode } from 'react';
import { PALETTE } from '@/art/palette';
import { AC, CARBON, Cursor, DIM, FG, type Fx, INK, label, LINE, MUTE, PANEL, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneApi, Win } from './scene';

// One scene per archive project: the result itself happening, drawn on the 320×200 grid.
// Every number shown comes from content/data.ts; names inside the UIs are illustrative.

type SceneProps = { autoplay?: number; handle?: (api: SceneApi | null) => void };
const WF_FILL = '#2c2c31', WF_EDGE = '#4a4a52';

/** A pill: an outlined chip, or a filled one. */
const Pill = ({ x, y, w, text, tone = 'line' }: { x: number; y: number; w: number; text: string; tone?: 'line' | 'ac' | 'dim' }) => (
  <g>
    <rect x={x} y={y} width={w} height="12" rx="6" fill={tone === 'dim' ? DIM : 'none'} stroke={tone === 'ac' ? AC : tone === 'line' ? LINE : 'none'} />
    <text x={x + w / 2} y={y + 8.2} textAnchor="middle" {...t(5.8, tone === 'ac' ? INK : FG, 600)}>{text}</text>
  </g>
);

/* ---------- In-platform notifications: one update, sent once, lights up 500+ partners ---------- */

const COLS = 26, ROWS = 20;
const DOTS = Array.from({ length: COLS * ROWS }, (_, i) => ({ x: 161 + (i % COLS) * 5.4, y: 44 + Math.floor(i / COLS) * 5.4 }));

function buildNotify({ tl, q, qa, type, count, click }: Fx) {
  const cur = q('[data-pointer]'), dots = qa('[data-dot]');
  tl.fromTo(q('[data-comp]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(q('[data-grid]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0.12);
  type(q('[data-title]'), 0.3, 0.6);
  tl.fromTo(cur, { autoAlpha: 0, x: 150, y: 200 }, { autoAlpha: 1, x: 74, y: 156, duration: 0.45, ease: 'power2.inOut' }, 0.95);
  click(cur, 1.42);
  tl.to(q('[data-send]'), { scale: 0.96, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, 1.44)
    // The update fans out across the partner grid from the side it was sent from.
    .fromTo(dots, { fill: PALETTE.fg, opacity: 0.16 }, { fill: PALETTE.ac, opacity: 1, duration: 0.38, stagger: { each: 0.042, grid: [ROWS, COLS], from: 10 * COLS } }, 1.56)
    .to(cur, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 1.7);
  count(q('[data-reach]'), 0, 1.56, 1.3);
  type(q('[data-status]'), 2.9, 0.3);
}

function NotifyScene(p: SceneProps) {
  return (
    <Scene build={buildNotify} {...p}>
      <g data-comp>
        <Win x={14} y={14} w={130} h={172} title="NEW UPDATE" />
        <rect x="24" y="42" width="110" height="44" rx="2" fill={CARBON} stroke={LINE} />
        <path d="M34 78 L50 60 L62 72 L70 64 L86 78 Z" fill={DIM} />
        <circle cx="76" cy="54" r="4" fill={DIM} />
        <text x="128" y="82" textAnchor="end" {...label()}>CLOUDFRONT</text>
        <text data-title x="24" y="100" {...t(7.2, FG, 700)}>Partner CSV export</text>
        <rect x="24" y="106" width="96" height="3" rx="1.5" fill={DIM} />
        <rect x="24" y="113" width="74" height="3" rx="1.5" fill={DIM} />
        <text x="24" y="132.5" {...t(6, MUTE)}>To</text>
        <Pill x={38} y={124.5} w={62} text="All partners" />
        <g data-send>
          <rect x="24" y="148" width="110" height="15" rx="2" fill={AC} />
          <text x="79" y="158" textAnchor="middle" {...t(6.6, CARBON, 700)} letterSpacing="0.8">SEND</text>
        </g>
        <text data-status x="24" y="178" {...t(6, MUTE)}>Delivered ✓</text>
      </g>
      <g data-grid>
        <Win x={152} y={14} w={154} h={172} title="PARTNERS" />
        {DOTS.map(d => <circle key={`${d.x} ${d.y}`} data-dot cx={d.x} cy={d.y} r="1.25" fill={AC} />)}
        <line x1="152" y1="156" x2="306" y2="156" stroke={LINE} />
        <text x="162" y="174" {...label()}>REACHED</text>
        <text data-reach x="296" y="176" textAnchor="end" {...t(14, INK, 700)}>500+</text>
      </g>
      <Cursor />
    </Scene>
  );
}

/* ---------- Booking concurrency fix: two writers claim one booking, the version check stops the second ---------- */

const Step = ({ x, y, w, text, tone }: { x: number; y: number; w: number; text: string; tone?: 'ac' | 'dim' }) => <g data-step><Pill x={x} y={y} w={w} text={text} tone={tone ?? 'line'} /></g>;

function buildBooking({ tl, q, qa, type, count }: Fx) {
  const lane = (n: string) => ({ who: q(`[data-lane="${n}"] [data-who]`), steps: qa(`[data-lane="${n}"] [data-step]`), end: q(`[data-lane="${n}"] [data-end]`) });
  const a = lane('a'), b = lane('b'), r = lane('r');
  tl.fromTo(q('[data-win]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    // Both writers read version 7 at the same moment.
    .fromTo([a.who, b.who, a.steps[0], b.steps[0]], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.04 }, 0.3)
    // A writes version 8 first and is saved.
    .fromTo(a.steps[1], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.3 }, 0.75)
    .fromTo(a.end, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.95)
    // B's write of version 8 is stale: the lock turns it away.
    .fromTo(b.steps[1], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.3 }, 1.15)
    .to(b.steps[1], { keyframes: { x: [0, -2.5, 2.5, -1.5, 1.5, 0] }, duration: 0.35, ease: EASE.none }, 1.4);
  type(b.end, 1.45, 0.35);
  // It reads again and saves version 9.
  tl.fromTo([r.who, ...r.steps], { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.15 }, 1.95)
    .fromTo(r.end, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.45)
    .fromTo(q('[data-pay]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 2.55);
  type(q('[data-paid]'), 2.7, 0.5);
  count(q('[data-tx]'), 0, 2.7, 0.9);
}

function BookingScene(p: SceneProps) {
  const lane = (id: string, y: number, who: string, steps: ReactNode, end: ReactNode) => (
    <g data-lane={id}>
      <text data-who x="24" y={y + 8.2} {...label()}>{who}</text>
      {steps}
      {end}
    </g>
  );
  return (
    <Scene build={buildBooking} {...p}>
      <g data-win><Win x={14} y={14} w={292} h={124} title="booking #4821" right={<text x="296" y="26.2" textAnchor="end" {...label(INK)}>OPTIMISTIC LOCK</text>} /></g>
      {lane('a', 42, 'WRITER A', <><Step x={86} y={42} w={44} text="read v7" /><Step x={138} y={42} w={50} text="write v8" /></>,
        <text data-end x="296" y="50.2" textAnchor="end" {...t(6.4, FG, 700)}>saved ✓</text>)}
      {lane('b', 72, 'WRITER B', <><Step x={86} y={72} w={44} text="read v7" /><Step x={138} y={72} w={50} text="write v8" tone="ac" /></>,
        <text data-end x="296" y="80.2" textAnchor="end" {...t(6.4, INK, 700)}>version conflict</text>)}
      {lane('r', 102, 'RETRY', <><Step x={86} y={102} w={44} text="read v8" /><Step x={138} y={102} w={50} text="write v9" /></>,
        <text data-end x="296" y="110.2" textAnchor="end" {...t(6.4, FG, 700)}>saved ✓</text>)}
      <g data-pay>
        <Win x={14} y={146} w={292} h={40} />
        <text x="24" y="160" {...label()}>PAYOUT</text>
        <text data-paid x="24" y="175" {...t(7.2)}>Paid once, traceable</text>
        <text x="296" y="160" textAnchor="end" {...label()}>TRANSACTIONS</text>
        <text data-tx x="296" y="177" textAnchor="end" {...t(13, INK, 700)}>1,500+</text>
      </g>
    </Scene>
  );
}

/* ---------- React 19 modernization: the version bump, a generated client, the first test ---------- */

function buildReact({ tl, q, qa, from, type, scramble }: Fx) {
  tl.fromTo(q('[data-pkg]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(qa('[data-ln]'), { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.05 }, 0.15);
  // The versions roll over to the new ones (what they were isn't claimed: placeholders roll).
  qa('[data-ver]').forEach((v, i) => {
    const to = v.textContent ?? '';
    from(v, '^--.-.-');
    scramble(v, '^--.-.-', to, 0.6 + i * 0.15, 0.5);
  });
  tl.fromTo(q('[data-spec]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.15);
  qa('[data-ep]').forEach((e, i) => type(e, 1.3 + i * 0.2, 0.3));
  // A client generated from the spec replaces the hand-written fetch.
  tl.fromTo(q('[data-gen]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.95);
  type(q('[data-call]'), 2.05, 0.55);
  const fn = q('[data-fn]'), call = fn.textContent ?? '';
  from(fn, '');
  scramble(fn, '', call, 2.6, 0.45);
  tl.fromTo(q('[data-tests]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 3.0)
    .fromTo(q('[data-pass]'), { autoAlpha: 0, scale: 0.8, transformOrigin: '0% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.35 }, 3.15);
  type(q('[data-first]'), 3.35, 0.4);
}

function ReactScene(p: SceneProps) {
  const line = (n: number, body: ReactNode) => (
    <g key={n} data-ln>
      <text x="30" y={44 + n * 12} textAnchor="end" {...t(6, DIM)}>{n + 1}</text>
      <text x="38" y={44 + n * 12} {...t(6.6)} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}>{body}</text>
    </g>
  );
  return (
    <Scene build={buildReact} {...p}>
      <g data-pkg><Win x={14} y={14} w={184} h={124} title="package.json" /></g>
      {line(0, <tspan fill={MUTE}>"dependencies": {'{'}</tspan>)}
      {line(1, <>{'  "react": "'}<tspan data-ver fill={INK} fontWeight="700">^19.0.0</tspan>{'",'}</>)}
      {line(2, <>{'  "react-dom": "'}<tspan data-ver fill={INK} fontWeight="700">^19.0.0</tspan>{'"'}</>)}
      {line(3, <tspan fill={MUTE}>{'},'}</tspan>)}
      {line(4, <tspan fill={MUTE}>"devDependencies": {'{'}</tspan>)}
      {line(5, <>{'  "vite": "'}<tspan data-ver fontWeight="700">^5.4.0</tspan>{'"'}</>)}
      {line(6, <tspan fill={MUTE}>{'}'}</tspan>)}
      <g data-spec>
        <Win x={206} y={14} w={100} h={70} title="openapi.yaml" />
        {['GET /partners', 'POST /payouts', 'GET /bookings'].map((e, i) => <text key={e} data-ep x="216" y={46 + i * 12} {...t(6.2, i ? MUTE : FG)}>{e}</text>)}
      </g>
      <g data-tests>
        <Win x={206} y={92} w={100} h={46} />
        <text x="216" y="106" {...label()}>TESTS</text>
        <text data-pass x="216" y="122" {...t(8, FG, 700)}>1 passed ✓</text>
        <text data-first x="216" y="132" {...label(INK)}>FIRST IN THE REPO</text>
      </g>
      <g data-gen>
        <Win x={14} y={146} w={292} h={40} />
        <text x="24" y="163" {...t(6.8)} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}><tspan data-call>{'const partners = await '}</tspan><tspan data-fn fill={INK} fontWeight="700">api.partners.list()</tspan></text>
        <text x="24" y="177" {...label()}>GENERATED FROM OPENAPI · TYPE-SAFE</text>
      </g>
    </Scene>
  );
}

/* ---------- Xtel performance work: the document opens, the field check answers ---------- */

function buildXtel({ tl, q, from, scramble }: Fx) {
  tl.fromTo(q('[data-doc]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    // Before: 250 s, struck through as the load runs again.
    .fromTo(q('[data-old1]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.3)
    .fromTo(q('[data-cut1]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: EASE.in }, 0.65)
    .fromTo(q('[data-bar]'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.55)
    // After: 30 s, the document open.
    .fromTo(q('[data-new1]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 1.3)
    .fromTo(q('[data-opened]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 1.4);
  from(q('[data-x8]'), '');
  scramble(q('[data-x8]'), '', '8× FASTER', 1.45, 0.4);
  // The field check: 30 s struck through, then the tick and 100 ms.
  tl.fromTo(q('[data-check]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.9)
    .fromTo(q('[data-old2]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.15)
    .fromTo(q('[data-cut2]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: EASE.in }, 2.45)
    .fromTo(q('[data-tick]'), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.3 }, 2.6)
    .fromTo(q('[data-new2]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 2.65);
}

function XtelScene(p: SceneProps) {
  return (
    <Scene build={buildXtel} {...p}>
      <g data-doc>
        <Win x={14} y={14} w={292} h={100} title="contract_2025.docx" right={<text x="296" y="26.2" textAnchor="end" {...label()}>AZURE SQL · .NET CORE</text>} />
        <text x="24" y="48" {...label()}>DOCUMENT LOAD</text>
        <text data-old1 x="24" y="70" {...t(10, MUTE)}>250 s</text>
        <line data-cut1 x1="23" y1="66.5" x2="54" y2="66.5" stroke={MUTE} strokeWidth="0.9" />
        <text data-new1 x="66" y="71" {...t(15, INK, 700)}>30 s</text>
        <rect x="24" y="82" width="272" height="4" rx="2" fill={DIM} />
        <rect data-bar x="24" y="82" width="272" height="4" rx="2" fill={AC} />
        <text data-opened x="24" y="103" {...label()}>OPENED</text>
        <text data-x8 x="296" y="103" textAnchor="end" {...label(INK)}>8× FASTER</text>
      </g>
      <g data-check>
        <Win x={14} y={122} w={292} h={64} />
        <text x="24" y="138" {...label()}>FIELD CHECK</text>
        <rect x="24" y="148" width="150" height="16" rx="2" fill={CARBON} stroke={LINE} />
        <text x="30" y="158.6" {...t(6.8)}>Delivery date</text>
        <text data-tick x="168" y="158.6" textAnchor="end" {...t(6.8, FG, 700)}>✓</text>
        <text data-old2 x="206" y="162" {...t(9, MUTE)}>30 s</text>
        <line data-cut2 x1="205" y1="158.8" x2="229" y2="158.8" stroke={MUTE} strokeWidth="0.9" />
        <text data-new2 x="296" y="163" textAnchor="end" {...t(13, INK, 700)}>100 ms</text>
      </g>
    </Scene>
  );
}

/* ---------- ETL workflow marketplace: wire a workflow, run a row through it, publish it ---------- */

const NODES = [
  { x: 24, kind: 'SOURCE', name: 'SQL Server' },
  { x: 128, kind: 'TRANSFORM', name: 'Clean · Join' },
  { x: 232, kind: 'DESTINATION', name: 'Data lake' },
];
const WIRES = ['M88 67 C104 67 112 67 128 67', 'M192 67 C208 67 216 67 232 67'];
const MARKET = [{ x: 24, name: 'invoice_etl' }, { x: 120, name: 'crm_cleanup' }];

function buildEtl({ tl, q, qa, click }: Fx) {
  const cur = q('[data-pointer]'), wires = qa('[data-wire]'), packet = q('[data-packet]');
  const along = (wire: Element): gsap.TweenVars => ({ motionPath: { path: wire as SVGPathElement, align: wire as SVGPathElement, alignOrigin: [0.5, 0.5] }, duration: 0.5, ease: 'power2.inOut' });
  tl.fromTo(q('[data-canvas]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(qa('[data-node]'), { autoAlpha: 0, scale: 0.94, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.12 }, 0.2)
    // The wires draw from output to input, then a row travels along them.
    .fromTo(wires, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, ease: 'power2.inOut', stagger: 0.26 }, 0.65)
    .fromTo(qa('[data-head]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, stagger: 0.26 }, 1.05)
    .fromTo(packet, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 1.35)
    .to(packet, along(wires[0]), 1.35)
    .to(packet, along(wires[1]), 1.95)
    .to(packet, { autoAlpha: 0, duration: 0.15, ease: EASE.in }, 2.45)
    .fromTo(q('[data-ok]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.45)
    .fromTo(cur, { autoAlpha: 0, x: 300, y: 200 }, { autoAlpha: 1, x: 262, y: 108, duration: 0.45, ease: 'power2.inOut' }, 2.45);
  click(cur, 2.95);
  tl.to(q('[data-pub]'), { scale: 0.96, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, 2.97)
    // Published: the workflow drops into the marketplace, signed in with OAuth.
    .fromTo(q('[data-new]'), { autoAlpha: 0, y: -46 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 3.1)
    .fromTo(q('[data-lock]'), { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.3 }, 3.55)
    .to(cur, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 3.3);
}

function EtlScene(p: SceneProps) {
  return (
    <Scene build={buildEtl} {...p}>
      <g data-canvas>
        <Win x={14} y={14} w={292} h={112} title="workflow · partner_sync" right={<text x="296" y="26.2" textAnchor="end" {...label()}>DESIGNER</text>} />
        {NODES.map(n => (
          <g key={n.kind} data-node>
            <rect x={n.x} y="52" width="64" height="30" rx="3" fill={CARBON} stroke={LINE} />
            <text x={n.x + 7} y="63" {...label()}>{n.kind}</text>
            <text x={n.x + 7} y="75" {...t(6.8)}>{n.name}</text>
          </g>
        ))}
        {WIRES.map(d => <path key={d} data-wire d={d} stroke={FG} strokeWidth="1" strokeOpacity="0.6" />)}
        {[128, 232].map(x => <path key={x} data-head d={`M${x - 4} 64 L${x} 67 L${x - 4} 70 Z`} fill={FG} fillOpacity="0.6" />)}
        <circle data-packet r="2.4" fill={AC} opacity="0" />
        <text data-ok x="24" y="114" {...label()}>VALIDATED ✓</text>
        <g data-pub>
          <rect x="232" y="100" width="64" height="15" rx="2" fill={AC} />
          <text x="264" y="110" textAnchor="middle" {...t(6.4, CARBON, 700)} letterSpacing="0.8">PUBLISH</text>
        </g>
      </g>
      <Win x={14} y={134} w={292} h={52} />
      <text x="24" y="148" {...label()}>MARKETPLACE</text>
      {MARKET.map(m => (
        <g key={m.name}>
          <rect x={m.x} y="155" width="88" height="22" rx="2" fill={CARBON} stroke={LINE} />
          <text x={m.x + 7} y="169" {...t(6.4, MUTE)}>{m.name}</text>
        </g>
      ))}
      <g data-new>
        <rect x="216" y="155" width="80" height="22" rx="2" fill={CARBON} stroke={AC} />
        <text x="223" y="169" {...t(6.4, FG, 700)}>partner_sync</text>
        <g data-lock>
          <rect x="280" y="164" width="8" height="6" rx="1" fill={AC} />
          <path d="M281.6 164 V162 a2.4 2.4 0 0 1 4.8 0 V164" stroke={AC} strokeWidth="1" />
        </g>
      </g>
      <text x="296" y="148" textAnchor="end" {...label(INK)}>OAUTH · JWT</text>
      <Cursor />
    </Scene>
  );
}

/* ---------- Enterprise catalog system: share one asset by role ---------- */

const ROLES = [['Analyst', [1, 0, 0]], ['Manager', [1, 1, 0]], ['Admin', [1, 1, 1]]] as const;

function buildCatalog({ tl, q, qa, type, count, click }: Fx) {
  const cur = q('[data-pointer]');
  tl.fromTo(q('[data-cat]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(qa('[data-asset]'), { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.06 }, 0.15)
    // Pick the asset to share.
    .fromTo(cur, { autoAlpha: 0, x: 120, y: 200 }, { autoAlpha: 1, x: 70, y: 44, duration: 0.45, ease: 'power2.inOut' }, 0.5);
  click(cur, 0.97);
  tl.fromTo(q('[data-pick]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 1.0)
    .fromTo(q('[data-pickbar]'), { scaleY: 0, transformOrigin: '50% 50%' }, { scaleY: 1, duration: 0.3 }, 1.0)
    .to(cur, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 1.25)
    // Share it by role: each role gets exactly the rights it needs.
    .fromTo(q('[data-share]'), { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0 }, 1.2)
    .fromTo(qa('[data-role]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.08 }, 1.4)
    .fromTo(qa('[data-tick]'), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.1 }, 1.75)
    .fromTo(qa('[data-av]'), { autoAlpha: 0, scale: 0.5, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.08 }, 2.45);
  type(q('[data-team]'), 2.65, 0.4);
  tl.fromTo(q('[data-sharing]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.9);
  count(q('[data-rate]'), 0, 2.95, 0.8);
}

function CatalogScene(p: SceneProps) {
  return (
    <Scene build={buildCatalog} {...p}>
      <g data-cat><Win x={14} y={14} w={128} h={172} title="CATALOG" /></g>
      <g data-pick>
        <rect x="20" y={34} width="116" height="18" rx="2" fill={DIM} />
        <rect data-pickbar x="20" y={34} width="2" height="18" fill={AC} />
      </g>
      {['sales_2023', 'partners', 'invoices', 'regions'].map((n, i) => (
        <g key={n} data-asset>
          <rect x="28" y={39 + i * 22} width="8" height="8" rx="1.5" fill="none" stroke={i ? LINE : FG} />
          <text x="42" y={45.6 + i * 22} {...t(6.6, i ? MUTE : FG, i ? undefined : 700)}>{n}</text>
        </g>
      ))}
      <g data-share>
        <Win x={150} y={14} w={156} h={172} title="SHARE · sales_2023" />
        <text x="160" y="46" {...label()}>ROLE</text>
        {['VIEW', 'EDIT', 'SHARE'].map((h, j) => <text key={h} x={226 + j * 30} y="46" textAnchor="middle" {...label()}>{h}</text>)}
        {ROLES.map(([r, on], i) => (
          <g key={r} data-role>
            <line x1="160" y1={53 + i * 20} x2="296" y2={53 + i * 20} stroke={LINE} />
            <text x="160" y={66 + i * 20} {...t(6.6)}>{r}</text>
            {on.map((v, j) => (
              <g key={['view', 'edit', 'share'][j]}>
                <rect x={222 + j * 30} y={58.5 + i * 20} width="8" height="8" rx="1.5" fill="none" stroke={LINE} />
                {v ? (
                  <g data-tick>
                    <rect x={222 + j * 30} y={58.5 + i * 20} width="8" height="8" rx="1.5" fill={FG} stroke={FG} />
                    <path d={`M${224 + j * 30} ${62.5 + i * 20} l1.8 1.8 l3.2 -3.6`} stroke={CARBON} strokeWidth="1.2" />
                  </g>
                ) : null}
              </g>
            ))}
          </g>
        ))}
        {[0, 1, 2].map(i => <circle key={i} data-av cx={166 + i * 11} cy="130" r="6" fill={DIM} stroke={PANEL} strokeWidth="1.5" />)}
        <text data-team x="198" y="132.5" {...t(6.4, MUTE)}>Finance team</text>
        <line x1="150" y1="152" x2="306" y2="152" stroke={LINE} />
        <text data-sharing x="160" y="170" {...label()}>SHARING</text>
        <text data-rate x="296" y="172" textAnchor="end" {...t(11, INK, 700)}>80% faster</text>
      </g>
      <Cursor />
    </Scene>
  );
}

/* ---------- WinForms to WPF: the cramped fixed form reshapes into the responsive window ---------- */

const box = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} H${x2} V${y2} H${x1} Z`;
// The same commands on both sides (see buildWpf).
const WINFORMS = [box(22, 42, 62, 110), box(70, 42, 170, 54), box(70, 60, 118, 74), box(122, 60, 170, 74), box(70, 80, 170, 110)];
const WPF = [box(22, 42, 86, 178), box(94, 42, 298, 62), box(94, 70, 192, 124), box(200, 70, 298, 124), box(94, 132, 298, 178)];
const CONTENT = [[30, 52, 40], [30, 62, 32], [30, 72, 36], [102, 82, 60], [102, 90, 44], [208, 82, 60], [208, 90, 38], [102, 144, 120], [102, 152, 90]];

function buildWpf({ tl, q, qa, from, scramble }: Fx) {
  const panels = qa('[data-panel]'), file = q('[data-file]'), tech = q('[data-tech]');
  from(file, 'Form1.Designer.cs');
  from(tech, 'WINFORMS');
  tl.fromTo(q('[data-frame]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  // Same commands on both sides, so GSAP tweens the path data number by number.
  panels.forEach((p, i) => tl.fromTo(p, { attr: { d: WINFORMS[i] } }, { attr: { d: WPF[i] }, duration: 0.75, ease: EASE.wipe }, 0.9 + i * 0.06));
  tl.fromTo(panels, { fill: WF_FILL, stroke: WF_EDGE }, { fill: PALETTE.carbon, stroke: 'rgba(255,255,255,0.12)', duration: 0.6 }, 1.0);
  scramble(file, 'Form1.Designer.cs', 'MainWindow.xaml', 0.95, 0.5);
  scramble(tech, 'WINFORMS', 'WPF · MVVM', 1.05, 0.45);
  tl.fromTo(qa('[data-fill]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.04 }, 1.7)
    .fromTo(q('[data-accent]'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.45 }, 2.0);
}

function WpfScene(p: SceneProps) {
  return (
    <Scene build={buildWpf} {...p}>
      <g data-frame>
        <rect x="14" y="14" width="292" height="172" rx="4" fill={PANEL} stroke={LINE} />
        {[0, 8, 16].map(d => <circle key={d} cx={24 + d} cy="24" r="2" fill={DIM} />)}
        <text data-file x="52" y="26.2" {...label()}>MainWindow.xaml</text>
        <text data-tech x="296" y="26.2" textAnchor="end" {...label(INK)}>WPF · MVVM</text>
        <line x1="14" y1="33" x2="306" y2="33" stroke={LINE} />
      </g>
      {WPF.map(d => <path key={d} data-panel d={d} fill={CARBON} stroke={LINE} />)}
      {CONTENT.map(([x, y, w]) => <rect key={`${x} ${y}`} data-fill x={x} y={y} width={w} height="3" rx="1.5" fill={DIM} />)}
      <rect data-accent x="102" y="102" width="82" height="3" rx="1.5" fill={AC} />
    </Scene>
  );
}

/* ---------- Azure telemetry and dashboards: an alert fires, the trace points at the cause ---------- */

const SPANS = [
  { name: 'gateway', x: 96, w: 200 },
  { name: 'auth', x: 100, w: 10 },
  { name: 'catalog-api', x: 112, w: 24 },
  { name: 'sql · select assets', x: 138, w: 150, hot: true },
  { name: 'render', x: 289, w: 7 },
];

function buildTelemetry({ tl, q, qa, from, type, scramble }: Fx) {
  const names = qa('[data-sname]'), bars = qa('[data-sbar]'), hot = SPANS.findIndex(sp => sp.hot);
  tl.fromTo(q('[data-trace]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(names, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.05 }, 0.2)
    // The request runs: the gateway span stays open while each call inside it starts after the last.
    .fromTo(bars[0], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1.7, ease: EASE.none }, 0.35)
    .fromTo(bars[1], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.08, ease: EASE.none }, 0.37)
    .fromTo(bars[2], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.2, ease: EASE.none }, 0.47)
    // One query runs long, and turns red as it does.
    .fromTo(bars[hot], { scaleX: 0, fill: DIM, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1.3, ease: EASE.none }, 0.69)
    .to(bars[hot], { fill: PALETTE.ac, duration: 0.3 }, 1.2)
    .fromTo(names[hot], { fill: PALETTE.mute }, { fill: PALETTE.ac2, duration: 0.3 }, 1.2)
    .fromTo(bars[4], { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.06, ease: EASE.none }, 1.99)
    // Azure Monitor flags it.
    .fromTo(q('[data-alert]'), { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.35 }, 1.35)
    .fromTo(q('[data-pulse]'), { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.8, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 1.5);
  const slow = q('[data-slow]');
  from(slow, '');
  scramble(slow, '', 'SLOW REQUEST', 1.4, 0.4);
  // The cause, found in the trace.
  tl.fromTo(q('[data-cause]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.2);
  type(q('[data-why]'), 2.3, 0.45);
  const less = q('[data-less]');
  from(less, '');
  scramble(less, '', 'TROUBLESHOOTING −30%', 2.85, 0.5);
}

function TelemetryScene(p: SceneProps) {
  return (
    <Scene build={buildTelemetry} {...p}>
      <g data-trace><Win x={14} y={14} w={292} h={118} title="TRACE · GET /catalog" right={<text data-slow x="296" y="26.2" textAnchor="end" {...label(INK)}>SLOW REQUEST</text>} /></g>
      {SPANS.map((sp, i) => (
        <g key={sp.name}>
          <text data-sname x="24" y={46 + i * 18} {...t(6.2, sp.hot ? INK : MUTE, sp.hot ? 700 : undefined)}>{sp.name}</text>
          <rect data-sbar x={sp.x} y={40 + i * 18} width={sp.w} height="8" rx="1" fill={sp.hot ? AC : DIM} />
        </g>
      ))}
      <g data-alert>
        <rect x="164" y="142" width="142" height="44" rx="4" fill={PANEL} stroke={AC} />
        <circle data-pulse cx="176" cy="156" r="2.4" fill={AC} />
        <text x="184" y="158.4" {...t(6.8, FG, 700)}>Alert · latency anomaly</text>
        <text x="174" y="176" {...label()}>AZURE MONITOR</text>
      </g>
      <text data-cause x="24" y="152" {...label()}>ROOT CAUSE</text>
      <text data-why x="24" y="166" {...t(7)}>Slow SQL query</text>
      <text data-less x="24" y="180" {...label(INK)}>TROUBLESHOOTING −30%</text>
    </Scene>
  );
}

/* ---------- Product localization: the same settings screen in four languages ---------- */

const LANGS = [
  { code: 'EN', title: 'Settings', lang: 'Language', value: 'English', notif: 'Notifications', date: 'Date format', cancel: 'Cancel', save: 'Save' },
  { code: 'IT', title: 'Impostazioni', lang: 'Lingua', value: 'Italiano', notif: 'Notifiche', date: 'Formato data', cancel: 'Annulla', save: 'Salva' },
  { code: 'DE', title: 'Einstellungen', lang: 'Sprache', value: 'Deutsch', notif: 'Mitteilungen', date: 'Datumsformat', cancel: 'Abbrechen', save: 'Speichern' },
  { code: 'FR', title: 'Paramètres', lang: 'Langue', value: 'Français', notif: 'Notifications', date: 'Format de date', cancel: 'Annuler', save: 'Enregistrer' },
] as const;
const KEYS = ['title', 'lang', 'value', 'notif', 'date', 'cancel', 'save'] as const;

function buildI18n({ tl, q, qa, scramble }: Fx) {
  const mark = q('[data-mark]'), codes = qa('[data-code]');
  tl.fromTo(q('[data-win]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  // EN → IT → DE → FR → EN: every string scrambles into the next language together.
  const order = [0, 1, 2, 3, 0];
  order.slice(1).forEach((li, step) => {
    const at = 0.65 + step * 1.1, A = LANGS[order[step]], B = LANGS[li];
    KEYS.forEach((k, j) => scramble(q(`[data-l="${k}"]`), A[k], B[k], at + j * 0.025, 0.4));
    tl.to(mark, { x: li * 18, duration: 0.3 }, at);
    codes.forEach((c, n) => tl.to(c, { fill: n === li ? PALETTE.fg : PALETTE.mute, duration: 0.15 }, at));
  });
}

function I18nScene(p: SceneProps) {
  const L = LANGS[0];
  return (
    <Scene build={buildI18n} {...p}>
      <g data-win>
        <Win x={34} y={14} w={252} h={172} title="resources.resx" right={<text x="276" y="26.2" textAnchor="end" {...label()}>I18N</text>} />
        <text data-l="title" x="48" y="56" {...t(11, FG, 700)}>{L.title}</text>
        <text data-l="lang" x="48" y="80" {...t(6.8, MUTE)}>{L.lang}</text>
        <rect x="160" y="71" width="112" height="14" rx="2" fill={CARBON} stroke={LINE} />
        <text data-l="value" x="166" y="80.5" {...t(6.8)}>{L.value}</text>
        <path d="M262 76.5 l3 3 l3 -3" stroke={MUTE} />
        <text data-l="notif" x="48" y="104" {...t(6.8, MUTE)}>{L.notif}</text>
        <rect x="252" y="97" width="20" height="10" rx="5" fill={AC} />
        <circle cx="267" cy="102" r="3.4" fill={CARBON} />
        <text data-l="date" x="48" y="128" {...t(6.8, MUTE)}>{L.date}</text>
        <text x="272" y="128" textAnchor="end" {...t(6.8)}>DD/MM/YYYY</text>
        <line x1="34" y1="142" x2="286" y2="142" stroke={LINE} />
        {LANGS.map((l, i) => <text key={l.code} data-code x={48 + i * 18} y="166" {...label(i ? MUTE : FG)}>{l.code}</text>)}
        <rect data-mark x="47" y="170" width="11" height="1.5" fill={AC} />
        <rect x="166" y="156" width="50" height="16" rx="2" fill="none" stroke={LINE} />
        <text data-l="cancel" x="191" y="166.5" textAnchor="middle" {...t(6.6)}>{L.cancel}</text>
        <rect x="222" y="156" width="54" height="16" rx="2" fill={AC} />
        <text data-l="save" x="249" y="166.5" textAnchor="middle" {...t(6.6, CARBON, 700)}>{L.save}</text>
      </g>
    </Scene>
  );
}

/* ---------- Weather forecasting AI: the forecast map, and where it placed ---------- */

const ISO = [
  'M60 100 C60 70 120 64 140 88 C160 112 134 146 100 142 C70 138 60 124 60 100 Z',
  'M74 102 C74 82 116 78 128 94 C140 110 122 132 100 130 C82 128 74 118 74 102 Z',
  'M88 104 C88 94 108 92 114 100 C120 108 112 118 102 118 C94 118 88 112 88 104 Z',
  'M30 60 C50 40 110 36 150 50 C180 60 190 90 186 120 C182 160 140 178 96 176 C50 174 26 150 26 112',
];

function buildWeather({ tl, q, qa, count, from, scramble }: Fx) {
  const iso = qa('[data-iso]');
  tl.fromTo(q('[data-map]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    // The pressure lines draw in, the storm cell last.
    .fromTo(iso, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut', stagger: 0.15 }, 0.2)
    .fromTo(qa('[data-stn]'), { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.07 }, 0.9)
    // The forecast: the cell moves on across the region.
    .fromTo(q('[data-cell]'), { x: -14, y: 8 }, { x: 0, y: 0, duration: 1.1, ease: 'power1.inOut' }, 1.0)
    .fromTo(q('[data-ml]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.2)
    // Where it placed.
    .fromTo(q('[data-board]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.6)
    .fromTo(qa('[data-place]'), { autoAlpha: 0, x: 6 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.1 }, 1.75)
    .fromTo(q('[data-ours]'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.4, ease: EASE.wipe }, 2.2);
  count(q('[data-teams]'), 0, 2.3, 0.9);
  const third = q('[data-third]');
  from(third, '');
  scramble(third, '', '3rd', 2.6, 0.35);
}

function WeatherScene(p: SceneProps) {
  return (
    <Scene build={buildWeather} {...p}>
      <g data-map><Win x={14} y={14} w={188} h={172} title="FORECAST" /></g>
      {ISO.map((d, i) => i === 2
        ? <g key={d} data-cell><path data-iso d={d} stroke={AC} strokeWidth="1.2" /></g>
        : <path key={d} data-iso d={d} stroke={FG} strokeOpacity={0.28 - i * 0.04} strokeWidth="1" />)}
      {[[44, 150], [160, 70], [150, 150], [70, 56]].map(([x, y]) => <circle key={x} data-stn cx={x} cy={y} r="1.6" fill={MUTE} />)}
      <text data-ml x="24" y="176" {...label()}>ALIBABA CLOUD · ML</text>
      <g data-board><Win x={210} y={14} w={96} h={172} title="RESULTS" /></g>
      <rect data-ours x="214" y="78" width="88" height="16" rx="2" fill={DIM} />
      {['01', '02', '03'].map((n, i) => (
        <g key={n} data-place>
          <text x="220" y={49 + i * 20} {...t(6.6, i === 2 ? INK : MUTE, 700)}>{n}</text>
          <rect x="236" y={44.5 + i * 20} width={i === 2 ? 40 : 52 - i * 6} height="3" rx="1.5" fill={i === 2 ? FG : DIM} />
        </g>
      ))}
      <text x="220" y="114" {...t(6.6, MUTE)}>⋮</text>
      <line x1="210" y1="140" x2="306" y2="140" stroke={LINE} />
      <text data-teams x="220" y="156" {...label()}>OF 2,520 TEAMS</text>
      <text data-third x="296" y="176" textAnchor="end" {...t(14, INK, 700)}>3rd</text>
    </Scene>
  );
}

/** Scenes by archive project name (content/data.ts). */
export const SCENES: Record<string, (p: SceneProps) => ReactNode> = {
  'In-platform notifications': NotifyScene,
  'Booking concurrency fix': BookingScene,
  'React 19 modernization': ReactScene,
  'Xtel performance work': XtelScene,
  'ETL workflow marketplace': EtlScene,
  'Enterprise catalog system': CatalogScene,
  'WinForms to WPF modernization': WpfScene,
  'Azure telemetry and dashboards': TelemetryScene,
  'Product localization': I18nScene,
  'Weather forecasting AI': WeatherScene,
};

