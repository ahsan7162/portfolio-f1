import { useEffect, useRef, type ReactNode } from 'react';
import { CpuIcon } from '@phosphor-icons/react/dist/ssr/Cpu';
import { SlackLogoIcon } from '@phosphor-icons/react/dist/ssr/SlackLogo';
import { siAnthropic, siApachekafka, siFastapi, siGo, siHuggingface, siJira, siOpensearch, siReact, type SimpleIcon } from 'simple-icons';
import type { Project } from '@/content/data';
import { ensureGsap, gsap } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

// Architecture diagrams that stand in for photography, drawn as one SVG on a
// fixed 320×200 grid so they scale with the card without measuring the DOM.
// Motion (GSAP only): each line draws once as the card comes into view, then
// stays still. On hover, one red dot runs the request path (0.45 s per line). Nothing loops.

type Node = { id: string; x: number; y: number; label: string; icon?: SimpleIcon; glyph?: ReactNode; txt?: string; accent?: boolean };
/** from, to, bend (perpendicular offset of the curve), draw order. */
type Edge = { from: string; to: string; bend?: number; order: number };
type Spec = { nodes: Node[]; edges: Edge[]; /** Edge indices per hover stage; a stage's dots run together. */ pulse: number[][] };

const SPECS: Record<Project['id'], Spec> = {
  // A chat goes React → Go core → Python runtime → the model providers; agents deploy from the Go core.
  agents: {
    nodes: [
      { id: 'ui', x: 38, y: 78, label: 'React chat', icon: siReact },
      { id: 'go', x: 128, y: 78, label: 'Go core', icon: siGo, accent: true },
      { id: 'py', x: 218, y: 78, label: 'Python runtime', glyph: <CpuIcon size={15} x={-7.5} y={-7.5} weight="bold" /> },
      { id: 'oai', x: 292, y: 30, label: 'OpenAI', txt: 'OAI' },
      { id: 'ant', x: 292, y: 78, label: 'Anthropic', icon: siAnthropic },
      { id: 'more', x: 292, y: 126, label: 'More', txt: '+' },
      { id: 'slack', x: 83, y: 160, label: 'Slack', glyph: <SlackLogoIcon size={15} x={-7.5} y={-7.5} weight="bold" /> },
      { id: 'jira', x: 128, y: 160, label: 'Jira', icon: siJira },
      { id: 'ci', x: 173, y: 160, label: 'CI/CD', txt: 'CI' },
    ],
    edges: [
      { from: 'ui', to: 'go', order: 0 },
      { from: 'go', to: 'py', order: 1 },
      { from: 'py', to: 'oai', bend: -10, order: 2 },
      { from: 'py', to: 'ant', order: 2 },
      { from: 'py', to: 'more', bend: 10, order: 2 },
      { from: 'go', to: 'slack', bend: 8, order: 3 },
      { from: 'go', to: 'jira', order: 3 },
      { from: 'go', to: 'ci', bend: -8, order: 3 },
    ],
    pulse: [[0], [1], [2, 3, 4]],
  },
  // Kafka streams into OpenSearch, DynamoDB is the source of truth, a React microfrontend serves it.
  'partner-ops': {
    nodes: [
      { id: 'kafka', x: 40, y: 58, label: 'Kafka', icon: siApachekafka },
      { id: 'ddb', x: 40, y: 142, label: 'DynamoDB', txt: 'DDB' },
      { id: 'os', x: 130, y: 100, label: 'OpenSearch', icon: siOpensearch },
      { id: 'mfe', x: 210, y: 100, label: 'React MFE', icon: siReact, accent: true },
      { id: 'ops', x: 285, y: 100, label: 'Ops teams', txt: 'OPS' },
    ],
    edges: [
      { from: 'kafka', to: 'os', bend: -12, order: 0 },
      { from: 'ddb', to: 'os', bend: 12, order: 0 },
      { from: 'os', to: 'mfe', order: 1 },
      { from: 'mfe', to: 'ops', order: 2 },
    ],
    pulse: [[0, 1], [2], [3]],
  },
  // Four providers behind one FastAPI server, streaming to the client.
  'llm-server': {
    nodes: [
      { id: 'oai', x: 40, y: 28, label: 'OpenAI', txt: 'OAI' },
      { id: 'ant', x: 40, y: 76, label: 'Anthropic', icon: siAnthropic },
      { id: 'llama', x: 40, y: 124, label: 'Llama', txt: 'LLM' },
      { id: 'hf', x: 40, y: 172, label: 'HuggingFace', icon: siHuggingface },
      { id: 'api', x: 160, y: 100, label: 'FastAPI', icon: siFastapi, accent: true },
      { id: 'client', x: 282, y: 100, label: 'Client', txt: 'SSE' },
    ],
    edges: [
      { from: 'oai', to: 'api', bend: -14, order: 0 },
      { from: 'ant', to: 'api', bend: -6, order: 0 },
      { from: 'llama', to: 'api', bend: 6, order: 0 },
      { from: 'hf', to: 'api', bend: 14, order: 0 },
      { from: 'api', to: 'client', order: 1 },
    ],
    pulse: [[0, 1, 2, 3], [4]],
  },
};

const R = 13; // node radius

function pathOf(a: Node, b: Node, bend = 0) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend * 2, cy = my + (dx / len) * bend * 2;
  return `M${a.x},${a.y} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x},${b.y}`;
}

function Diagram({ spec }: { spec: Spec }) {
  const ref = useRef<SVGSVGElement>(null);
  const byId = Object.fromEntries(spec.nodes.map(n => [n.id, n]));

  useEffect(() => {
    const svg = ref.current;
    if (!svg || !motionEnabled()) return;
    ensureGsap();
    const lines = [...svg.querySelectorAll<SVGPathElement>('[data-edge]')];
    const dots = [...svg.querySelectorAll<SVGCircleElement>('[data-dot]')];
    const card = svg.closest('[data-card]');
    let running: gsap.core.Timeline | null = null;
    const ctx = gsap.context(() => {
      // Draw once, in the order of the flow.
      const draw = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
      lines.forEach((l, i) => draw.fromTo(l, { drawSVG: '0%' }, { drawSVG: '100%', duration: DUR.reveal * 0.6, ease: EASE.out }, spec.edges[i].order * 0.18));
      gsap.set(dots, { autoAlpha: 0 });
    }, svg);
    // One pulse per hover: each stage's dots run their lines together.
    const pulse = () => ctx.add(() => {
      if (running?.isActive()) return;
      const stage = DUR.wipe; // per line, so the dot reads as travelling, not flashing
      running = gsap.timeline();
      spec.pulse.forEach((edges, s) => edges.forEach(i => {
        running!.set(dots[i], { autoAlpha: 1 }, s * stage)
          .to(dots[i], { duration: stage, ease: EASE.none, motionPath: { path: lines[i], align: lines[i], alignOrigin: [0.5, 0.5] } }, s * stage)
          .set(dots[i], { autoAlpha: 0 }, (s + 1) * stage);
      }));
    });
    const hover = !isTouch() && card;
    if (hover) card.addEventListener('pointerenter', pulse);
    return () => { if (hover) card.removeEventListener('pointerenter', pulse); ctx.revert(); };
  }, [spec]);

  return (
    <svg ref={ref} viewBox="0 0 320 200" className="h-full w-full" fill="none">
      {spec.edges.map((e, i) => (
        <path key={i} data-edge d={pathOf(byId[e.from], byId[e.to], e.bend)} stroke="#f4f4ed" strokeOpacity="0.28" strokeWidth="1" />
      ))}
      {spec.edges.map((_, i) => <circle key={i} data-dot r="2.6" fill="#ff2438" />)}
      {spec.nodes.map(n => (
        <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
          <circle r={R} fill="#0b0b0c" stroke={n.accent ? '#ff2438' : 'rgb(255 255 255 / 0.15)'} />
          <g className={n.accent ? 'text-ac' : 'text-[#f4f4ed]'} fill="currentColor">
            {n.icon && <path d={n.icon.path} transform="translate(-7 -7) scale(0.5833)" />}
            {n.glyph}
            {n.txt && <text textAnchor="middle" dominantBaseline="central" className="font-mono" fontSize="6.5" fontWeight="700">{n.txt}</text>}
          </g>
          <text y={R + 9} textAnchor="middle" className="font-mono uppercase" fontSize="6" letterSpacing="0.6" fill="#a3a39c">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function ProjectVisual({ project }: { project: Project }) {
  if (project.image) {
    return (
      <img src={project.image.src} width={project.image.w} height={project.image.h} alt={project.image.alt}
        loading="lazy" decoding="async" className="h-full w-full object-cover" />
    );
  }
  // TODO(screenshots): add real screenshots to src/assets/projects and set `image` in content/data.ts.
  return (
    <div aria-hidden="true" className="grid h-full w-full place-items-center px-4 py-3">
      <Diagram spec={SPECS[project.id]} />
    </div>
  );
}
