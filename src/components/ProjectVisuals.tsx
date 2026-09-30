import { forwardRef, useRef, type ReactNode } from 'react';
import { siAnthropic, siApachekafka, siFastapi, siHuggingface, siOpensearch, siReact, type SimpleIcon } from 'simple-icons';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { AnimatedSpan, Terminal, TypingAnimation } from '@/components/ui/terminal';
import type { Project } from '@/content/data';
import { useOnScreen } from '@/lib/useOnScreen';

// Live "component previews" that stand in for photography (Magic UI leaves).
// They animate on in-view only; GSAP never targets anything inside them.
// The beams loop forever, so they are only mounted while the preview is on screen.

function Logo({ icon }: { icon: SimpleIcon }) {
  return (
    <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" className="size-5 fill-current">
      <path d={icon.path} />
    </svg>
  );
}

const Node = forwardRef<HTMLDivElement, { children: ReactNode; label: string; accent?: boolean }>(
  function Node({ children, label, accent }, ref) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div ref={ref} className={`z-10 grid size-11 place-items-center rounded-full border bg-carbon text-[#f4f4ed] ${accent ? 'border-ac text-ac' : 'border-white/15'}`}>
          {children}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#a3a39c]">{label}</span>
      </div>
    );
  });

const Txt = ({ t }: { t: string }) => <span className="font-mono text-[10px] font-bold">{t}</span>;

function BeamPipeline() {
  const box = useRef<HTMLDivElement>(null);
  const on = useOnScreen(box);
  const kafka = useRef<HTMLDivElement>(null), dynamo = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLDivElement>(null), mfe = useRef<HTMLDivElement>(null), ops = useRef<HTMLDivElement>(null);
  const beam = { containerRef: box, gradientStartColor: '#ff2438', gradientStopColor: '#f4f4ed', pathColor: '#f4f4ed', pathOpacity: 0.12, duration: 3.2 };
  return (
    <div ref={box} className="relative grid h-full w-full grid-cols-4 items-center px-6">
      <div className="flex flex-col gap-8"><Node ref={kafka} label="Kafka"><Logo icon={siApachekafka} /></Node><Node ref={dynamo} label="DynamoDB"><Txt t="DDB" /></Node></div>
      <div className="flex justify-center"><Node ref={search} label="OpenSearch"><Logo icon={siOpensearch} /></Node></div>
      <div className="flex justify-center"><Node ref={mfe} label="React MFE" accent><Logo icon={siReact} /></Node></div>
      <div className="flex justify-end"><Node ref={ops} label="Ops teams"><Txt t="OPS" /></Node></div>
      {on && <>
        <AnimatedBeam {...beam} fromRef={kafka} toRef={search} curvature={-30} />
        <AnimatedBeam {...beam} fromRef={dynamo} toRef={search} curvature={30} delay={0.6} />
        <AnimatedBeam {...beam} fromRef={search} toRef={mfe} delay={1.1} />
        <AnimatedBeam {...beam} fromRef={mfe} toRef={ops} delay={1.6} />
      </>}
    </div>
  );
}

function BeamHub() {
  const box = useRef<HTMLDivElement>(null), hub = useRef<HTMLDivElement>(null), client = useRef<HTMLDivElement>(null);
  const on = useOnScreen(box);
  const p0 = useRef<HTMLDivElement>(null), p1 = useRef<HTMLDivElement>(null), p2 = useRef<HTMLDivElement>(null), p3 = useRef<HTMLDivElement>(null);
  const beam = { containerRef: box, gradientStartColor: '#ff2438', gradientStopColor: '#f4f4ed', pathColor: '#f4f4ed', pathOpacity: 0.12, duration: 3 };
  return (
    <div ref={box} className="relative grid h-full w-full grid-cols-3 items-center px-6">
      <div className="flex flex-col gap-3">
        <Node ref={p0} label="OpenAI"><Txt t="OAI" /></Node>
        <Node ref={p1} label="Anthropic"><Logo icon={siAnthropic} /></Node>
        <Node ref={p2} label="Llama"><Txt t="LLM" /></Node>
        <Node ref={p3} label="HuggingFace"><Logo icon={siHuggingface} /></Node>
      </div>
      <div className="flex justify-center"><Node ref={hub} label="FastAPI" accent><Logo icon={siFastapi} /></Node></div>
      <div className="flex justify-end"><Node ref={client} label="Client"><Txt t="SSE" /></Node></div>
      {on && [p0, p1, p2, p3].map((p, i) => <AnimatedBeam key={i} {...beam} fromRef={p} toRef={hub} curvature={(1.5 - i) * 28} delay={i * 0.3} />)}
      {on && <AnimatedBeam {...beam} fromRef={hub} toRef={client} delay={1.4} reverse />}
    </div>
  );
}

function AgentTerminal() {
  return (
    <Terminal className="h-full max-h-none w-full max-w-none rounded-none border-0 bg-transparent font-mono text-[12px] text-[#f4f4ed]">
      <TypingAnimation>$ agents create support-triage</TypingAnimation>
      <AnimatedSpan className="text-[#a3a39c]">✔ Semantic search index attached</AnimatedSpan>
      <AnimatedSpan className="text-[#a3a39c]">✔ Version v3 saved</AnimatedSpan>
      <TypingAnimation>$ agents deploy --slack --jira --ci</TypingAnimation>
      <AnimatedSpan className="text-[#ff2438]">✔ Live in 3 targets, 10 min end to end</AnimatedSpan>
      <AnimatedSpan className="text-[#a3a39c]">450+ agents running company-wide</AnimatedSpan>
    </Terminal>
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
    <div aria-hidden="true" className="h-full w-full">
      {project.id === 'agents' && <AgentTerminal />}
      {project.id === 'partner-ops' && <BeamPipeline />}
      {project.id === 'llm-server' && <BeamHub />}
    </div>
  );
}
