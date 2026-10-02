import type { ReactNode } from 'react';
import {
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
  type SimpleIcon,
} from 'simple-icons';
import { ScrollVelocityContainer, ScrollVelocityRow } from '@/components/ui/scroll-based-velocity';
import { skills } from '@/content/data';
import { gsap } from '@/motion/gsap';
import { splitReveal } from '@/motion/patterns';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

const LOGOS: SimpleIcon[] = [
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
];

const slash = (xs: string[]) => xs.join(' / ');

function Tile({ n, name, accent, className, children }: { n: number; name: string; accent?: boolean; className?: string; children: ReactNode }) {
  return (
    <div data-tile data-tilt className={cn('tile flex flex-col gap-5 p-6 md:p-8', className)}>
      <div className="flex items-baseline justify-between gap-4 md:contents">
        <h3 className={cn('label', accent && '!text-ac')}>{name}</h3>
        <span aria-hidden="true" className="font-mono text-[10px] text-dim md:absolute md:right-6 md:top-6">{String(n).padStart(2, '0')}</span>
      </div>
      {children}
    </div>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="flex flex-wrap gap-2">
    {items.map(s => <li key={s} className="pill text-fg/85">{s}</li>)}
  </ul>
);

/** Lando's partner wall as a logo marquee, then the stack as a bento grid. */
export function TechStack() {
  const grid = useBentoPointer<HTMLDivElement>();
  const ref = useSectionMotion<HTMLElement>(({ q, qa }) => {
    splitReveal(q('h2'), { type: 'chars' });
    gsap.fromTo(qa('[data-tile]'), { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: EASE.wipe, stagger: STAGGER.line, clearProps: 'clipPath',
      scrollTrigger: { trigger: q('.bento')!, start: 'top 80%', once: true },
    });
  });
  return (
    <section ref={ref} id="skills" tabIndex={-1} data-bg="#0b0b0c,#111113" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <h2 className="display mb-14 text-[clamp(2.4rem,7vw,6.5rem)]">Tech stack</h2>
      </div>
      <ScrollVelocityContainer className="border-y border-line py-8">
        <ScrollVelocityRow baseVelocity={2.5}>
          {LOGOS.map(l => (
            <span key={l.slug} className="mx-8 inline-flex items-center gap-3 text-fg/80 md:mx-12">
              <svg role="img" aria-label={l.title} viewBox="0 0 24 24" className="size-9 fill-current md:size-11"><path d={l.path} /></svg>
            </span>
          ))}
        </ScrollVelocityRow>
      </ScrollVelocityContainer>
      <div className="mx-auto mt-16 max-w-[1400px] px-4 md:px-8">
        <div ref={grid} className="bento">
          <Tile n={1} name="Core languages" accent className="tile-lead md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:p-10 md:pr-16">
            <p className="display text-[clamp(2rem,4.6vw,4.75rem)]">{slash(skills.core)}</p>
          </Tile>
          <Tile n={2} name="Frameworks" className="md:col-span-3"><List items={skills.frameworks} /></Tile>
          <Tile n={3} name="AI / LLM" accent className="justify-center md:col-span-3 md:row-span-2 md:gap-5">
            <p className="display text-[clamp(1.5rem,2.5vw,2.5rem)] !leading-[1.05]">{slash(skills.ai.providers)}</p>
            <List items={skills.ai.items} />
          </Tile>
          <Tile n={4} name="Data" className="md:col-span-3"><List items={skills.data} /></Tile>
          <Tile n={5} name="Infra" className="md:col-span-3 lg:col-span-2"><List items={skills.infra} /></Tile>
          <Tile n={6} name="Tooling" className="md:col-span-3 lg:col-span-4"><List items={skills.tooling} /></Tile>
        </div>
      </div>
    </section>
  );
}
