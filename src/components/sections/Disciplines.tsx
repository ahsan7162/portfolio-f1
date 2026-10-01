import { useRef, useState } from 'react';
import { disciplines } from '@/content/data';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { clipReveal, fitsViewport, splitReveal } from '@/motion/patterns';
import { EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { cn } from '@/lib/utils';

type Id = (typeof disciplines)[number]['id'];

/**
 * Lando's ON TRACK / OFF TRACK split, as FRONTEND / BACKEND. With motion the
 * section pins for two short steps: the first scroll shows Frontend, the next
 * Backend. Hover, focus and tap still switch it directly.
 */
export function Disciplines() {
  const [active, setActive] = useState<Id>('frontend');
  const activeRef = useRef<Id>('frontend');

  const pick = (id: Id) => {
    if (id === activeRef.current) return;
    activeRef.current = id;
    setActive(id);
    const panel = document.getElementById(`disc-${id}`);
    if (panel && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      gsap.fromTo(panel.querySelectorAll('[data-pitem]'), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.04, duration: 0.6, ease: EASE.soft, overwrite: true });
    }
  };

  const ref = useSectionMotion<HTMLElement>(({ q, qa, markers }) => {
    splitReveal(q('h2'), { type: 'words' });
    qa('[data-dword]').forEach((w, i) => splitReveal(w, { type: 'chars', delay: i * 0.1 }));
    clipReveal(q('[data-dpanels]'), { trigger: q('[data-dpanels]')!, from: 'inset(0% 100% 0% 0%)' });

    // Two steps, one short scroll each (same feel as the career timeline).
    // Too tall to pin (small phones): the steps still follow the scroll as the
    // section passes through the middle of the screen, just without the pin.
    const pin = q('[data-dpin]')!;
    const n = disciplines.length;
    const at = (p: number) => disciplines[Math.min(n - 1, Math.floor(p * n))].id;
    const follow = { onUpdate: (self: ScrollTrigger) => pick(at(self.progress)), onEnter: (self: ScrollTrigger) => pick(at(self.progress)), onEnterBack: (self: ScrollTrigger) => pick(at(self.progress)) };
    if (fitsViewport(pin)) ScrollTrigger.create({ trigger: pin, start: 'top top', end: `+=${n * 35}%`, pin: true, markers, ...follow });
    else ScrollTrigger.create({ trigger: q('[data-dpanels]')!, start: 'top 75%', end: 'bottom 45%', markers, ...follow });
  }, [], { fit: true });

  return (
    <section ref={ref} id="skills-overview" tabIndex={-1} data-bg="#0d1013,#0b0b0c" className="relative">
      <div data-dpin className="flex min-h-[100dvh] items-center px-4 pb-6 pt-[calc(var(--navh)+1.5rem)] md:px-8 md:py-24">
      <div className="mx-auto w-full max-w-[1400px]">
        <h2 className="mb-8 max-w-[24ch] md:mb-12 text-2xl font-semibold tracking-tight [font-stretch:110%] md:text-4xl">
          Frontend and backend development
        </h2>
        <div className="grid gap-8 md:grid-cols-[1.25fr_1fr] md:items-center md:gap-10">
          <div className="flex flex-col">
            {disciplines.map(d => (
              <h3 key={d.id} className="m-0">
                <button type="button"
                  aria-expanded={active === d.id} aria-controls={`disc-${d.id}`}
                  onMouseEnter={() => pick(d.id)} onFocus={() => pick(d.id)} onClick={() => pick(d.id)}
                  className={cn('group flex w-full items-baseline gap-4 py-1 text-left transition-[opacity,transform] duration-500 ease-out-expo',
                    active === d.id ? 'opacity-100' : 'opacity-30 hover:opacity-60')}>
                  <span data-dword className={cn('display whitespace-nowrap text-[clamp(2.4rem,7.4vw,7.5rem)] transition-colors duration-500',
                    active === d.id && 'text-ac')}>{d.name}</span>
                  <span aria-hidden="true" className={cn('font-mono text-sm transition-transform duration-500 ease-out-expo',
                    active === d.id ? 'translate-x-0 text-ac' : '-translate-x-2')}>→</span>
                </button>
              </h3>
            ))}
          </div>

          <div data-dpanels className="relative grid border border-line bg-graphite/70 p-6 md:min-h-[360px] md:p-10">
            {disciplines.map(d => (
              <div key={d.id} id={`disc-${d.id}`} role="region" aria-label={d.name}
                className={cn('[grid-area:1/1] transition-[opacity,visibility] duration-500',
                  active === d.id ? 'visible opacity-100' : 'invisible opacity-0')}>
                <p data-pitem className="text-xl leading-snug md:text-2xl">{d.summary}</p>
                <ul data-pitem className="mt-6 flex flex-wrap gap-2" aria-label={`${d.name} stack`}>
                  {d.stack.map(s => (
                    <li key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-mute">{s}</li>
                  ))}
                </ul>
                <div data-pitem className="mt-10 border-t border-line pt-6">
                  <div className="display text-5xl text-ac md:text-6xl">{d.result.stat}</div>
                  <p className="mt-3 max-w-[40ch] text-mute">{d.result.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
