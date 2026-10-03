import type { ReactNode } from 'react';
import {
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
  type SimpleIcon,
} from 'simple-icons';
import { skills } from '@/content/data';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { scrollState } from '@/motion/SmoothScroll';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { inView } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

const LOGOS: SimpleIcon[] = [
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
];

const slash = (xs: string[]) => xs.join(' / ');

function Tile({ name, accent, className, children }: { name: string; accent?: boolean; className?: string; children: ReactNode }) {
  return (
    <div data-tile data-tilt className={cn('tile flex flex-col gap-5 p-6 md:p-8', className)}>
      <h3 className={cn('label', accent && '!text-ac')}>{name}</h3>
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
  const ref = useSectionMotion<HTMLElement>(({ q, qa, onRevert }) => {
    // No heading animation: the logo marquee coming in is the entrance.
    // The marquee only moves while you scroll, at the scroll's speed and direction,
    // then coasts to a stop: like a car, it only moves while racing. One ticker
    // function eases toward Lenis's (already smooth) velocity every frame and moves
    // the paused loop directly, so the speed glides instead of stepping, and it only
    // runs while the bar is on screen.
    const loop = gsap.to(q('[data-marquee]'), { xPercent: -50, ease: EASE.none, duration: 40, repeat: -1, paused: true });
    loop.totalTime(loop.duration() * 1000); // far from 0, so it can run backwards too
    let speed = 0;
    const tick = () => {
      const r = gsap.ticker.deltaRatio(60);
      const target = gsap.utils.clamp(-8, 8, scrollState.velocity * 0.25);
      speed += (target - speed) * (1 - Math.pow(0.92, r)); // ~1 s coast at any frame rate
      if (Math.abs(speed) < 0.002 && target === 0) speed = 0;
      if (speed) loop.totalTime(loop.totalTime() + (r / 60) * speed);
    };
    ScrollTrigger.create({
      trigger: q('[data-marqueebox]')!, start: 'top bottom', end: 'bottom top',
      onToggle: self => { if (self.isActive) gsap.ticker.add(tick); else { gsap.ticker.remove(tick); speed = 0; } },
    });
    onRevert(() => gsap.ticker.remove(tick));
    gsap.fromTo(qa('[data-tile]'), { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: EASE.wipe, stagger: STAGGER.line, clearProps: 'clipPath',
      scrollTrigger: inView(q('.bento')!, { start: 'top 80%' }),
    });
  });
  return (
    <section ref={ref} id="skills" tabIndex={-1} data-bg="#0b0b0c,#111113" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <h2 className="display mb-14 text-[clamp(2.4rem,7vw,6.5rem)]">Tech stack</h2>
      </div>
      <div data-marqueebox className="overflow-hidden border-y border-line py-8">
        {/* Two identical halves, so -50% loops seamlessly. One list is wider than any screen;
            the copy reuses the first half's paths (<use>), so the page HTML carries each logo once. */}
        <div data-marquee className="flex w-max will-change-transform">
          {[0, 1].map(copy => (
            <div key={copy} aria-hidden={copy > 0 || undefined} className="flex shrink-0">
              {LOGOS.map(l => (
                <span key={l.slug} className="mx-8 inline-flex items-center gap-3 text-fg/80 md:mx-12">
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
          <Tile name="Core languages" accent className="tile-lead md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:p-10 md:pr-16">
            <p className="display text-[clamp(2rem,4.6vw,4.75rem)]">{slash(skills.core)}</p>
          </Tile>
          <Tile name="Frameworks" className="md:col-span-3"><List items={skills.frameworks} /></Tile>
          <Tile name="AI / LLM" accent className="justify-center md:col-span-3 md:row-span-2 md:gap-5">
            <p className="display text-[clamp(1.5rem,2.5vw,2.5rem)] !leading-[1.05]">{slash(skills.ai.providers)}</p>
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
