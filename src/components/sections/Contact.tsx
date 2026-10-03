import { useEffect, useRef, useState } from 'react';
import { LazyMap } from '@/components/LazyMap';
import { cvHref } from '@/components/Nav';
import { CV_FILE, EMAIL, GITHUB, LINKEDIN, PHONE, PHONE_DISPLAY, profile } from '@/content/data';
import { batchReveal, clipReveal, gridSlot } from '@/motion/patterns';
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

export function Contact() {
  const ref = useSectionMotion<HTMLElement>(({ q, qa }) => {
    gridSlot(q('[data-ctitle]'), { start: 'top 98%', end: 'top 55%' });
    clipReveal(q('[data-finish]'), { trigger: q('[data-finish]')!, from: 'inset(0% 100% 0% 0%)' });
    batchReveal(qa('[data-clink]'), { y: 16, stagger: 0.05 });
  });

  return (
    <footer ref={ref} id="contact" tabIndex={-1} data-bg="#070708,#0b0b0c" className="relative overflow-hidden px-4 pb-10 pt-28 md:px-8 md:pt-40">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="label mb-8">Contact</h2>
        <div className="grid items-end gap-12 lg:grid-cols-[1.4fr_1fr]">
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

        <div className="mt-12 flex flex-wrap gap-3">
          <a data-clink href={cvHref()} download={CV_FILE} className="btn btn-primary">Download CV</a>
          <a data-clink href={`mailto:${EMAIL}`} className="btn btn-ghost">Email</a>
          <a data-clink href={GITHUB} target="_blank" rel="noopener" className="btn btn-ghost">GitHub</a>
          <a data-clink href={LINKEDIN} target="_blank" rel="noopener" className="btn btn-ghost">LinkedIn</a>
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
