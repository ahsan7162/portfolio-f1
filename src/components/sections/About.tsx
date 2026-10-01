import { SWOOSH_PATH } from '@/art/circuit';
import { profile } from '@/content/data';
import { gsap, SplitText } from '@/motion/gsap';
import { batchReveal, drawPath } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';

const FACTS = [
  { k: 'Now', v: 'Careem, AI agent platform and partner tools' },
  { k: 'Before', v: 'Xtel (performance) and Astera (AI infrastructure)' },
  { k: 'Education', v: 'BS Computer Science, FAST-NUCES' },
];

export function About() {
  const ref = useSectionMotion<HTMLElement>(({ q, qa, short, markers }) => {
    const text = q('[data-statement]')!;
    const pin = q('[data-pin]')!;
    // Pinned statement: words light up as you scroll (Lando's manifesto).
    const split = SplitText.create(text, { type: 'words', aria: 'auto' });
    // The helmet's About move is timed against this pin (helmetPath), so it pins on
    // every screen but landscape phones, and the statement's size also follows the
    // screen height so it fits. Short screens light the words up as it scrolls past.
    const tl = gsap.timeline({
      scrollTrigger: short
        ? { trigger: text, start: 'top 80%', end: 'bottom 40%', scrub: true, markers }
        : { trigger: pin, start: 'top top', end: '+=120%', pin: true, scrub: true, markers },
    });
    tl.fromTo(split.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: 'none', duration: 1 });
    drawPath(q('[data-swoosh] path'), { timeline: tl, at: '>-0.2', duration: 0.6 });
    batchReveal(qa('[data-fact]'));
  });

  const words = profile.about.split(' ');
  return (
    <section ref={ref} id="about" tabIndex={-1} data-bg="#111113,#0b0b0c" className="relative px-4 md:px-8">
      <div data-pin className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center py-24">
        <h2 className="label mb-8">About me</h2>
        <p data-statement className="display max-w-[20ch] text-[clamp(2.2rem,min(6.2vw,calc(15svh_-_45px)),6rem)] !leading-[0.95]">
          {words.map((w, i) => (
            <span key={i}>
              {profile.aboutAccent.includes(w) ? <em className="display-em">{w}</em> : w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
        <svg data-swoosh aria-hidden="true" viewBox="0 0 344 36" fill="none" className="mt-6 w-[min(420px,70vw)]">
          <path d={SWOOSH_PATH} stroke="var(--ac)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-px border-y border-line pb-0 md:grid-cols-3">
        {FACTS.map(f => (
          <div key={f.k} data-fact className="py-6 md:px-6 md:first:pl-0">
            <div className="label mb-2">{f.k}</div>
            <p className="text-lg leading-snug">{f.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
