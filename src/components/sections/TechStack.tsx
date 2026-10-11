import type { ReactNode } from 'react';
import {
  siGo, siPython, siDotnet, siReact, siNextdotjs, siJavascript, siNodedotjs, siFastapi, siGin, siPostgresql, siMysql, siApachekafka, siOpensearch, siLangchain, siAnthropic, siHuggingface, siPandas, siVite, siGithub, siJira,
  type SimpleIcon,
} from 'simple-icons';
import { skills } from '@/content/data';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { isTouch } from '@/motion/prefs';
import { scrollState } from '@/motion/SmoothScroll';
import { DUR, EASE, STAGGER } from '@/motion/tokens';
import { useBentoPointer } from '@/motion/useBentoPointer';
import { gridSlot, inView } from '@/motion/patterns';
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
  const ref = useSectionMotion(({ q, qa, onRevert }) => {
    gridSlot(q('h2'));
    // The marquee only moves while you scroll, at the scroll's speed and direction,
    // then coasts to a stop: like a car, it only moves while racing. One ticker
    // function eases toward Lenis's (already smooth) velocity every frame and moves
    // the paused loops directly, so the speed glides instead of stepping, and it only
    // runs while the bar is on screen. The second, dimmer row runs the other way.
    const row = q('[data-marquee]')!;
    // The second row is motion-only decoration, so it is built here rather than
    // prerendered: smaller, dimmer, offset, reusing the first row's paths (<use>).
    const row2 = document.createElement('div');
    row2.setAttribute('aria-hidden', 'true');
    row2.className = 'mt-6 flex w-max will-change-transform';
    const order = [...LOGOS.slice(7), ...LOGOS.slice(0, 7)];
    row2.innerHTML = [0, 1].map(() => `<div class="flex shrink-0">${order.map(l =>
      `<span class="mx-7 inline-flex items-center text-fg/30 md:mx-10"><svg viewBox="0 0 24 24" class="size-6 fill-current md:size-7"><use href="#logo-${l.slug}"/></svg></span>`).join('')}</div>`).join('');
    row.after(row2);
    onRevert(() => row2.remove());
    const loop = gsap.to(row, { xPercent: -50, ease: EASE.none, duration: 40, repeat: -1, paused: true });
    const loop2 = gsap.to(row2, { xPercent: -50, ease: EASE.none, duration: 40, repeat: -1, paused: true });
    loop.totalTime(loop.duration() * 1000); // far from 0, so it can run backwards too
    loop2.totalTime(loop2.duration() * 1000 + 13);

    // Centre emphasis (mouse and trackpad): logos near the middle of the screen grow
    // and brighten. Positions come from the loop's progress and each logo's offset,
    // measured on refresh, so no layout is read per frame; only changed values are written.
    const logos = qa('[data-logo]');
    const touch = isTouch();
    let offs: number[] = [], half = 0, left = 0;
    const shiftOf = () => ((gsap.getProperty(row, 'xPercent') as number) / 100) * half * 2;
    const measure = () => {
      gsap.set(logos, { scale: 1 });
      const r = row.getBoundingClientRect();
      half = row.offsetWidth / 2;
      left = r.left - shiftOf();
      offs = logos.map(l => { const b = l.getBoundingClientRect(); return b.left - r.left + b.width / 2; });
    };
    // quickSetter takes real properties only (not the `scale` shorthand).
    const sx = logos.map(l => gsap.quickSetter(l, 'scaleX') as (v: number) => void);
    const sy = logos.map(l => gsap.quickSetter(l, 'scaleY') as (v: number) => void);
    const alpha = logos.map(l => gsap.quickSetter(l, 'opacity') as (v: number) => void);
    const last = logos.map(() => 0);
    const emphasise = () => {
      if (touch || !half) return;
      const shift = shiftOf(), mid = innerWidth / 2, reach = innerWidth * 0.28;
      offs.forEach((o, i) => {
        const x = left + o + shift;
        const k = Math.max(0, 1 - Math.abs(x - mid) / reach), e = Math.round(k * k * (3 - 2 * k) * 100) / 100;
        if (e === last[i]) return;
        last[i] = e;
        sx[i](1 + 0.15 * e); sy[i](1 + 0.15 * e);
        alpha[i](0.8 + 0.2 * e);
      });
    };

    measure();
    let speed = 0;
    const tick = () => {
      const r = gsap.ticker.deltaRatio(60);
      const target = gsap.utils.clamp(-8, 8, scrollState.velocity * 0.25);
      speed += (target - speed) * (1 - Math.pow(0.92, r)); // ~1 s coast at any frame rate
      if (Math.abs(speed) < 0.002 && target === 0) speed = 0;
      if (!speed) return;
      const dt = (r / 60) * speed;
      loop.totalTime(loop.totalTime() + dt);
      loop2.totalTime(loop2.totalTime() - dt * 0.6);
      emphasise();
    };
    ScrollTrigger.create({
      trigger: q('[data-marqueebox]')!, start: 'top bottom', end: 'bottom top',
      onRefresh: () => { measure(); last.fill(-1); emphasise(); },
      onToggle: self => { if (self.isActive) gsap.ticker.add(tick); else { gsap.ticker.remove(tick); speed = 0; } },
    });
    onRevert(() => gsap.ticker.remove(tick));

    // Tiles wipe in, then each tile's pills drop in as it lands, so the grid fills up
    // instead of appearing full.
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
    <section ref={ref} id="skills" tabIndex={-1} data-bg="#0b0b0c,#111113" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <h2 data-speed className="display mb-14 text-display-section">Tech stack</h2>
      </div>
      <div data-marqueebox className="overflow-hidden border-y border-line py-8">
        {/* Two identical halves, so -50% loops seamlessly. One list is wider than any screen;
            the copy reuses the first half's paths (<use>), so the page HTML carries each logo once. */}
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
          <Tile name="Core languages" accent className="tile-lead md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:!p-10 md:!pr-16">
            <p className="display text-display-stat">{slash(skills.core)}</p>
          </Tile>
          <Tile name="Frameworks" className="md:col-span-3"><List items={skills.frameworks} /></Tile>
          <Tile name="AI / LLM" accent className="justify-center md:col-span-3 md:row-span-2 md:gap-5">
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
