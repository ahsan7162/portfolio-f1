import { useEffect, useRef, useState } from 'react';
import { LazyMap } from '@/components/LazyMap';
import { cvHref } from '@/components/Nav';
import { CV_FILE, EMAIL, GITHUB, LINKEDIN, PHONE, PHONE_DISPLAY, profile } from '@/content/data';
import { batchReveal, clipReveal, splitReveal } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';

const MARKERS = [
  { lat: 24.86, lng: 67.0, size: 1.4, pulse: true }, // Karachi
  { lat: 25.2, lng: 55.27, size: 1 },               // Dubai (Careem)
  { lat: 45.46, lng: 9.19, size: 1 },               // Milan (Xtel, remote)
];

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
    splitReveal(q('[data-ctitle]'), { type: 'lines' });
    clipReveal(q('[data-finish]'), { trigger: q('[data-finish]')!, from: 'inset(0% 100% 0% 0%)', duration: 1.4 });
    batchReveal(qa('[data-clink]'), { y: 16, stagger: 0.05 });
  });

  return (
    <footer ref={ref} id="contact" tabIndex={-1} data-bg="#070708,#0b0b0c" className="relative overflow-hidden px-4 pb-10 pt-28 md:px-8 md:pt-40">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="label mb-8">Contact</h2>
        <div className="grid items-end gap-12 lg:grid-cols-[1.4fr_1fr]">
          <p data-ctitle className="display text-[clamp(3rem,9vw,8.5rem)]">
            <a href={`mailto:${EMAIL}`} className="transition-colors duration-500 hover:text-ac">
              Let's build something <em className="display-em">fast</em>.
            </a>
          </p>
          <div aria-hidden="true" className="text-fg/25">
            <LazyMap markers={MARKERS} markerColor="#ff2438" dotRadius={0.25} mapSamples={3000} className="w-full" />
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
