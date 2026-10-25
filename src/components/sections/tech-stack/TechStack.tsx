import type { ReactNode } from 'react';
import { F1 } from '@/art/liveries';
import {
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
  type SimpleIcon,
} from 'simple-icons';
import { skills } from '@/content/data';
import { gsap } from '@/motion/gsap';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { inView } from '@/motion/reveals';
import { gridSlot } from '@/motion/split';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';
import { logoMarquee } from './marquee';

const LOGOS: SimpleIcon[] = [
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
];

const slash = (xs: string[]) => xs.join(' / ');

function Tile({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  return (
    <div data-tile data-tilt className={cn('tile flex flex-col gap-5 p-6 md:p-8', className)}>
      <h3 className="label">{name}</h3>
      {children}
    </div>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="flex flex-wrap gap-2">
    {items.map(s => <li key={s} className="pill text-fg/85">{s}</li>)}
  </ul>
);

/** A logo marquee, then the stack as a bento grid. */
export function TechStack() {
  const grid = useBentoPointer<HTMLDivElement>();
  const ref = useSectionMotion(ctx => {
    const { q, qa } = ctx;
    gridSlot(q('h2'));
    logoMarquee(ctx, LOGOS);

    // Tiles wipe in, and each tile's pills drop in as it lands.
    const tiles = qa('[data-tile]');
    const tl = gsap.timeline({ scrollTrigger: inView(q('.bento')!, { start: 'top 80%' }) });
    tl.fromTo(tiles, { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: EASE.wipe, stagger: STAGGER.line, clearProps: 'clipPath',
    });
    tiles.forEach((t, i) => {
      const pills = t.querySelectorAll('.pill');
      if (pills.length) tl.from(pills, { y: 8, autoAlpha: 0, duration: DUR.split, ease: EASE.out, stagger: 0.03 }, i * STAGGER.line + 0.35);
    });
  });
  return (
    <section ref={ref} id="skills" tabIndex={-1} data-bg={`${F1.carbon},${F1.graphite}`} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <h2 data-speed className="display mb-14 text-display-section">Tech stack</h2>
      </div>
      <div data-marqueebox className="overflow-hidden border-y border-line py-8">
        {/* Two identical halves, so -50% loops seamlessly; the copy reuses the first half's paths (<use>). */}
        <div data-marquee className="flex w-max will-change-transform">
          {[0, 1].map(copy => (
            <div key={copy} aria-hidden={copy > 0 || undefined} className="flex shrink-0">
              {LOGOS.map(l => (
                <span key={l.slug} data-logo className="mx-8 inline-flex items-center gap-3 text-fg opacity-80 md:mx-12">
                  {copy
                    ? <svg viewBox="0 0 24 24" className="size-9 fill-current md:size-11"><use href={`#logo-${l.slug}`} /></svg>
                    : <svg role="img" aria-label={l.title} viewBox="0 0 24 24" className="size-9 fill-current md:size-11"><path id={`logo-${l.slug}`} d={l.path} /></svg>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-[1400px] px-4 md:px-8">
        <div ref={grid} className="bento">
          <Tile name="Core languages" className="tile-lead md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:!p-10 md:!pr-16">
            <p className="display text-display-stat">{slash(skills.core)}</p>
          </Tile>
          <Tile name="Frameworks" className="md:col-span-3"><List items={skills.frameworks} /></Tile>
          <Tile name="AI / LLM" className="justify-center md:col-span-3 md:row-span-2 md:gap-5">
            <p className="display text-display-small font-bold !leading-[1.05]">{slash(skills.ai.providers)}</p>
            <List items={skills.ai.items} />
          </Tile>
          <Tile name="Data" className="md:col-span-3"><List items={skills.data} /></Tile>
          <Tile name="Infra" className="md:col-span-3 lg:col-span-2"><List items={skills.infra} /></Tile>
          <Tile name="Tooling" className="md:col-span-3 lg:col-span-4"><List items={skills.tooling} /></Tile>
        </div>
      </div>
    </section>
  );
}
