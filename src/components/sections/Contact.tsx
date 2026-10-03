import { useEffect, useRef, useState } from 'react';
import { LazyMap } from '@/components/LazyMap';
import { cvHref } from '@/components/Nav';
import { CV_FILE, EMAIL, GITHUB, LINKEDIN, PHONE, PHONE_DISPLAY, profile } from '@/content/data';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { batchReveal, clipReveal, gridSlot, inView, magnet } from '@/motion/patterns';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

function CopyPhone() {
  const [state, setState] = useState<'idle' | 'copied' | 'shown'>('idle');
  const t = useRef(0);
  useEffect(() => () => clearTimeout(t.current), []);
  const copy = () => {
    if (!navigator.clipboard?.writeText) { setState('shown'); return; }
    navigator.clipboard.writeText(PHONE).then(() => {
      setState('copied');
      clearTimeout(t.current);
      t.current = window.setTimeout(() => setState(s => (s === 'copied' ? 'idle' : s)), 1800);
    }).catch(() => setState('shown'));
  };
  return (
    <button type="button" onClick={copy} aria-live="polite" className="btn btn-ghost">
      {state === 'shown' ? PHONE_DISPLAY : state === 'copied' ? 'Copied' : 'Copy phone'}
    </button>
  );
}

// Time on the page so far, as a lap time (m:ss.mmm).
const lapTime = (ms: number) => {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;
};

export function Contact() {
  const ref = useSectionMotion<HTMLElement>(({ root, q, qa, onRevert }) => {
    // Crossing the line: a chequered band sweeps across once as Contact reaches the
    // middle of the screen, the visitor's real time on the page freezes as their lap
    // time, and the heading's letters pull in from the right, carrying on the 450+ drift.
    gsap.fromTo(q('[data-flag]'), { xPercent: -100, autoAlpha: 1 }, { xPercent: 100, duration: DUR.show, ease: EASE.wipe,
      scrollTrigger: inView(root, { start: 'top 55%' }) });
    const clock = q('[data-lapclock]')!, line = q('[data-laptotal]')!;
    ScrollTrigger.create({ trigger: root, start: 'top 55%', once: true, onEnter: () => {
      clock.textContent = lapTime(performance.now());
      line.hidden = false;
      gsap.fromTo(line, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out, delay: 0.5 });
    } });
    onRevert(() => { line.hidden = true; clock.textContent = ''; });
    gridSlot(q('[data-ctitle]'), { start: 'top 98%', end: 'top 55%' });
    clipReveal(q('[data-finish]'), { trigger: q('[data-finish]')!, from: 'inset(0% 100% 0% 0%)' });
    batchReveal(qa('[data-clink]'), { y: 16, stagger: 0.05 });
    qa('[data-clink]').forEach(w => onRevert(magnet(w, w.firstElementChild as HTMLElement, 0.3)));
  });

  return (
    <footer ref={ref} id="contact" tabIndex={-1} data-bg="#070708,#0b0b0c" className="relative overflow-hidden px-4 pb-10 pt-28 md:px-8 md:pt-48">
      {/* Motion only: the chequered flag that sweeps across once. */}
      <div data-flag aria-hidden="true" className="checker pointer-events-none invisible absolute inset-x-0 top-0 !h-10 ![background-size:20px_20px]" />
      <div className="mx-auto max-w-[1400px]">
        <h2 className="sr-only">Contact</h2>
        <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          <p data-ctitle data-speed className="display text-[clamp(3rem,9vw,8.5rem)]">
            <a href={`mailto:${EMAIL}`} className="transition-colors duration-(--dur-hit) hover:text-ac">
              Let's build something <em className="display-em">fast</em>.
            </a>
          </p>
          <div aria-hidden="true" className="text-fg/25">
            {/* Karachi, Dubai (Careem), Milan (Xtel): set in scripts/world-dots.ts */}
            <LazyMap markerColor="#ff2438" />
          </div>
        </div>

        {/* Filled in on the client (never prerendered with a made-up time). */}
        <p data-laptotal hidden className="label mt-10">Lap complete <span aria-hidden="true">/</span> <span data-lapclock className="tabular-nums text-fg" /></p>
        <div className="mt-12 flex flex-wrap gap-3">
          <span data-clink className="inline-flex"><a href={cvHref()} download={CV_FILE} className="btn btn-primary">Download CV</a></span>
          <span data-clink className="inline-flex"><a href={`mailto:${EMAIL}`} className="btn btn-ghost">Email</a></span>
          <span data-clink className="inline-flex"><a href={GITHUB} target="_blank" rel="noopener" className="btn btn-ghost">GitHub</a></span>
          <span data-clink className="inline-flex"><a href={LINKEDIN} target="_blank" rel="noopener" className="btn btn-ghost">LinkedIn</a></span>
          <span data-clink className="inline-flex"><CopyPhone /></span>
        </div>

        <div data-finish aria-hidden="true" className="checker mt-20 w-full" />
        <div className="mt-6 flex flex-wrap justify-between gap-4 font-mono text-xs text-mute">
          <span>{profile.name}, {profile.location}</span>
          <span>Open to senior full-stack roles</span>
        </div>
      </div>
    </footer>
  );
}
