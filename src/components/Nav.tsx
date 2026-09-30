import { useRef } from 'react';
import { HyperText } from '@/components/ui/hyper-text';
import { CV_FILE } from '@/content/data';
import { ScrollTrigger } from '@/motion/gsap';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { useNavHeight } from '@/motion/useNavHeight';
import { gsap } from '@/motion/gsap';
import { EASE } from '@/motion/tokens';

export const NAV = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
] as const;

export const cvHref = () => `${import.meta.env.BASE_URL}${CV_FILE}`;

export function Nav() {
  const ind = useRef<HTMLSpanElement>(null);
  const ref = useSectionMotion<HTMLElement>(({ root, qa }) => {
    // Hide on scroll down, show on scroll up (Lando's nav).
    const show = gsap.quickTo(root, 'yPercent', { duration: 0.45, ease: EASE.soft });
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => show(self.direction > 0 && self.scroll() > innerHeight * 0.6 ? -110 : 0),
    });

    // Active section underline: moves with x + scaleX only.
    const links = qa<HTMLAnchorElement>('[data-navlink]');
    const bar = ind.current!;
    const moveTo = (a: HTMLAnchorElement | null) => {
      links.forEach(l => l.toggleAttribute('aria-current', l === a));
      if (!a) { gsap.to(bar, { autoAlpha: 0, duration: 0.3 }); return; }
      gsap.to(bar, { autoAlpha: 1, x: a.offsetLeft, scaleX: a.offsetWidth / 100, duration: 0.6, ease: EASE.out });
    };
    // refreshPriority -1: measure after the pins inside sections add their height.
    let current: HTMLAnchorElement | null = null;
    NAV.forEach(n => {
      const sec = document.getElementById(n.id);
      const link = links.find(l => l.dataset.navlink === n.id) ?? null;
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1,
        onToggle: self => {
          if (self.isActive) { current = link; moveTo(link); }
          else if (current === link) { current = null; moveTo(null); }
        },
      });
    });
  });
  useNavHeight(ref);

  return (
    <header ref={ref} className="fixed inset-x-0 top-0 z-50 bg-carbon/85">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <a href="#top" className="font-sans text-sm font-extrabold uppercase tracking-tight [font-stretch:125%]" aria-label="Muhammad Ahsan, back to top">
          <HyperText as="span" className="py-0 text-sm font-extrabold" duration={600} startOnView={false} animateOnHover>AHSAN</HyperText>
          <span className="sr-only">Muhammad Ahsan</span>
        </a>
        <div className="relative hidden items-center gap-7 md:flex">
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`} data-navlink={n.id}
              className="py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mute transition-colors duration-300 hover:text-fg aria-[current]:text-fg">
              {n.label}
            </a>
          ))}
          <span ref={ind} aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[100px] origin-left bg-ac opacity-0" />
        </div>
        <a href={cvHref()} download={CV_FILE} className="btn btn-primary !px-4 !py-2">Download CV</a>
      </nav>
    </header>
  );
}
