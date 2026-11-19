// The diagrams bb draws from Markwright's Mermaid blocks, redrawn by hand for this page: the eight starters the
// `/` menu inserts, and a plain chain (A --> B --> C) such as the RFC template's. Every piece carries the source
// line that brings it in (`data-step`, 1 is the line after the diagram type), so a scene can grow the diagram
// as its source is typed. Any other source is shown as its code.
import { createContext, useContext, useId, type ReactNode } from 'react';
import { MERMAID_STARTERS } from './mdCatalog';

const W = 240;
/** The arrowhead marker of the diagram being drawn: one per SVG, so ids never repeat on the page. */
const Arrow = createContext('');

/** A box with its label; `d` makes it a decision diamond, `r` a rounded state. */
function Node({ x, y, w = 72, h = 26, label, step, d, r }: { x: number; y: number; w?: number; h?: number; label: string; step: number; d?: boolean; r?: boolean }) {
  return (
    <g data-step={step}>
      {d
        ? <polygon className="mwd-dg-node" points={`${x},${y - h} ${x + w / 2},${y} ${x},${y + h} ${x - w / 2},${y}`} />
        : <rect className="mwd-dg-node" x={x - w / 2} y={y - h / 2} width={w} height={h} rx={r ? h / 2 : 3} />}
      <text className="mwd-dg-t" x={x} y={y + 3.5}>{label}</text>
    </g>
  );
}

/** An edge with an arrowhead, and an optional label riding it. */
function Edge({ d, step, label, at, dashed }: { d: string; step: number; label?: string; at?: [number, number]; dashed?: boolean }) {
  const arrow = useContext(Arrow);
  return (
    <g data-step={step}>
      <path className="mwd-dg-edge" d={d} markerEnd={`url(#${arrow})`} data-dashed={dashed ? '' : undefined} />
      {label && at && <text className="mwd-dg-lbl" x={at[0]} y={at[1]}>{label}</text>}
    </g>
  );
}

function Svg({ h, children }: { h: number; children: ReactNode }) {
  const id = useId();
  return (
    <svg className="mwd-dg" viewBox={`0 0 ${W} ${h}`} aria-hidden="true">
      <defs>
        <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L8 4L0 8z" className="mwd-dg-head" />
        </marker>
      </defs>
      <Arrow value={id}>{children}</Arrow>
    </svg>
  );
}

const DRAWN: Record<string, () => ReactNode> = {
  flowchart: () => (
    <Svg h={212}>
      <Node x={120} y={20} label="Start" step={1} />
      <Edge d="M120 33V58" step={1} />
      <Node x={120} y={88} w={84} h={28} label="Ready?" step={1} d />
      <Edge d="M100 104L62 160" step={2} label="Yes" at={[70, 128]} />
      <Node x={56} y={176} w={78} label="Ship it" step={2} />
      <Edge d="M140 104L178 160" step={3} label="No" at={[170, 128]} />
      <Node x={184} y={176} w={66} label="Fix" step={3} />
      <Edge d="M217 172C236 150 222 98 166 89" step={4} />
    </Svg>
  ),
  sequence: () => (
    <Svg h={150}>
      <Node x={60} y={20} w={78} label="User" step={1} />
      <path className="mwd-dg-life" d="M60 33V140" data-step={1} />
      <Node x={180} y={20} w={78} label="API" step={2} />
      <path className="mwd-dg-life" d="M180 33V140" data-step={2} />
      <Edge d="M62 74H176" step={3} label="Request" at={[120, 68]} />
      <Edge d="M178 112H64" step={4} label="Response" at={[120, 106]} dashed />
    </Svg>
  ),
  class: () => (
    <Svg h={190}>
      <g data-step={1}>
        <rect className="mwd-dg-node" x={30} y={10} width={180} height={78} rx={3} />
        <text className="mwd-dg-t" x={120} y={28}>Order</text>
        <path className="mwd-dg-rule" d="M30 38H210M30 76H210" />
      </g>
      <text className="mwd-dg-t" data-left="" x={42} y={53} data-step={2}>+id: string</text>
      <text className="mwd-dg-t" data-left="" x={42} y={68} data-step={3}>+total(): number</text>
      <Edge d="M120 146V92" step={5} label="1        *" at={[132, 124]} />
      <Node x={120} y={162} w={96} label="Customer" step={5} />
    </Svg>
  ),
  state: () => (
    <Svg h={236}>
      <circle className="mwd-dg-dot" cx={120} cy={12} r={7} data-step={1} />
      <Edge d="M120 19V40" step={1} />
      <Node x={120} y={56} w={84} label="Draft" step={1} r />
      <Edge d="M120 69V94" step={2} />
      <Node x={120} y={110} w={84} label="Review" step={2} r />
      <Edge d="M120 123V148" step={3} />
      <Node x={120} y={164} w={96} label="Published" step={3} r />
      <Edge d="M120 177V204" step={4} />
      <g data-step={4}><circle className="mwd-dg-ring" cx={120} cy={218} r={9} /><circle className="mwd-dg-dot" cx={120} cy={218} r={5} /></g>
    </Svg>
  ),
  er: () => (
    <Svg h={176}>
      <Node x={120} y={20} w={110} label="CUSTOMER" step={1} />
      <Edge d="M120 33V72" step={1} label="places" at={[150, 56]} />
      <Node x={120} y={88} w={110} label="ORDER" step={1} />
      <Edge d="M120 101V140" step={2} label="contains" at={[156, 124]} />
      <Node x={120} y={156} w={110} label="LINE_ITEM" step={2} />
    </Svg>
  ),
  gantt: () => (
    <Svg h={132}>
      <text className="mwd-dg-t" x={120} y={16} data-step={1}>Plan</text>
      <text className="mwd-dg-lbl" data-left="" x={10} y={44} data-step={3}>Build</text>
      <g data-step={4}><rect className="mwd-dg-bar" x={60} y={52} width={56} height={18} rx={2} /><text className="mwd-dg-t" x={88} y={65}>Design</text></g>
      <g data-step={5}><rect className="mwd-dg-bar" data-two="" x={116} y={78} width={112} height={18} rx={2} /><text className="mwd-dg-t" x={172} y={91}>Build</text></g>
      <path className="mwd-dg-rule" d="M60 108H228" data-step={2} />
      <text className="mwd-dg-lbl" x={60} y={124} data-step={2}>Jan 5</text>
      <text className="mwd-dg-lbl" x={228} y={124} data-step={2}>Jan 20</text>
    </Svg>
  ),
  pie: () => (
    <Svg h={140}>
      <text className="mwd-dg-t" x={120} y={14} data-step={0}>Traffic</text>
      {/* 60 / 30 / 10 from the top, clockwise */}
      <path className="mwd-dg-pie" data-k="1" d="M80 78L80 30A48 48 0 1 1 51.8 116.8Z" data-step={1} />
      <path className="mwd-dg-pie" data-k="2" d="M80 78L51.8 116.8A48 48 0 0 1 51.8 39.2Z" data-step={2} />
      <path className="mwd-dg-pie" data-k="3" d="M80 78L51.8 39.2A48 48 0 0 1 80 30Z" data-step={3} />
      {['Search', 'Direct', 'Social'].map((s, i) => (
        <g key={s} data-step={i + 1}><rect className="mwd-dg-pie" data-k={i + 1} x={150} y={52 + i * 18} width={10} height={10} rx={2} /><text className="mwd-dg-lbl" data-left="" x={166} y={61 + i * 18}>{s}</text></g>
      ))}
    </Svg>
  ),
  mindmap: () => (
    <Svg h={150}>
      <g data-step={1}><circle className="mwd-dg-node" cx={120} cy={75} r={26} /><text className="mwd-dg-t" x={120} y={79}>Idea</text></g>
      <path className="mwd-dg-branch" d="M98 62C80 44 64 34 46 32" data-step={2} /><Node x={40} y={24} w={62} label="Goals" step={2} r />
      <path className="mwd-dg-branch" d="M142 62C160 44 176 34 194 32" data-step={3} /><Node x={200} y={24} w={62} label="Risks" step={3} r />
      <path className="mwd-dg-branch" d="M120 101V118" data-step={4} /><Node x={120} y={132} w={84} label="Next steps" step={4} r />
    </Svg>
  ),
};

const STARTER = new Map(MERMAID_STARTERS.map((m) => [m.code, m.id]));

/** A chain flowchart (`flowchart LR` then `A --> B --> C`), laid out left to right. */
function chain(code: string) {
  const ls = code.split('\n');
  if (ls.length !== 2 || !/^flowchart (LR|TD)$/.test(ls[0])) return null;
  const names = ls[1].trim().split(/\s*-->\s*/);
  if (names.length < 2 || names.some((n) => !/^\w+$/.test(n))) return null;
  const gap = W / names.length;
  return (
    <Svg h={56}>
      {names.map((n, i) => (
        <g key={n}>
          {i > 0 && <Edge d={`M${gap * (i - 0.5) + 27} 28H${gap * (i + 0.5) - 31}`} step={1} />}
          <Node x={gap * (i + 0.5)} y={28} w={Math.min(54, gap - 16)} label={n} step={1} />
        </g>
      ))}
    </Svg>
  );
}

/** The diagram for a Mermaid source, or its code when it is not one this page draws. */
export function Diagram({ code }: { code: string }) {
  const id = STARTER.get(code);
  const drawn = id ? DRAWN[id]() : chain(code);
  return drawn ?? <pre className="mwd-code"><code>{code}</code></pre>;
}
