import {
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
  type SimpleIcon,
} from 'simple-icons';
import { ScrollVelocityContainer, ScrollVelocityRow } from '@/components/ui/scroll-based-velocity';
import { skills } from '@/content/data';
import { batchReveal, splitReveal } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';

const LOGOS: SimpleIcon[] = [
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
];

/** Lando's partner wall, as a tech-stack logo row (the page's one marquee). */
export function TechStack() {
  const ref = useSectionMotion<HTMLElement>(({ q, qa }) => {
    splitReveal(q('h2'), { type: 'chars' });
    batchReveal(qa('[data-group]'));
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
      <div className="mx-auto mt-16 grid max-w-[1400px] grid-cols-1 gap-x-8 gap-y-10 px-4 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {skills.groups.map(g => (
          <div key={g.name} data-group>
            <h3 className="mb-3 text-lg font-semibold [font-stretch:110%]">{g.name}</h3>
            <p className="leading-relaxed text-mute">{g.items.join(', ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
