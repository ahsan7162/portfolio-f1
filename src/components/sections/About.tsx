import { SWOOSH_PATH } from '@/art/circuit';
import { profile } from '@/content/data';
import { gsap, ScrollTrigger, SplitText } from '@/motion/gsap';
import { drawPath } from '@/motion/patterns';
import { useSectionMotion } from '@/motion/useSectionMotion';

export function About() {
  const ref = useSectionMotion(({ q, qa, short, markers }) => {
    const text = q('[data-statement]')!;
    const pin = q('[data-pin]')!;
    // Pinned statement: words light up and rise into place as you scroll (Lando's manifesto).
    // Hidden from screen readers in the markup (they read the copy above it), so no aria-label.
    const split = SplitText.create(text, { type: 'words', aria: 'none' });
    // The accent words carry the joke: "slowest" trickles in letter by letter, late;
    // "fast." snaps in at once with a kick and a red streak behind it.
    const [slow, fast] = qa('[data-statement] em');
    const slowChars = slow ? SplitText.create(slow, { type: 'chars', aria: 'none' }).chars : [];
    const words = split.words.filter(w => !slow?.contains(w) && !w.contains(slow));

    // The helmet lands in this sentence and holds through this pin (gl/flight), so it
    // pins on every screen but landscape phones, and the statement's size also follows
    // the screen height so it fits. Short screens light the words up as it scrolls past.
    // The pin itself has no animation: the light-up starts earlier, while the hero
    // is still leaving (from the pin's top at 40% of the screen), so there is no dead
    // frame between them, and runs to the end of the pin.
    let st: ScrollTrigger.Vars;
    if (short) st = { trigger: text, start: 'top 80%', end: 'bottom 40%', scrub: true, markers };
    else {
      const p = ScrollTrigger.create({ trigger: pin, start: 'top top', end: '+=120%', pin: true, markers });
      st = { trigger: pin, start: 'top 40%', end: () => p.end, scrub: true };
    }
    const tl = gsap.timeline({ scrollTrigger: st });
    tl.fromTo(words, { opacity: 0.14, yPercent: 30 }, { opacity: 1, yPercent: 0, stagger: 0.1, ease: 'none', duration: 1 });
    if (slow) {
      const at = split.words.indexOf(split.words.find(w => w.contains(slow) || slow.contains(w))!) * 0.1 + 0.4;
      tl.fromTo(slowChars, { opacity: 0.14, yPercent: 40 }, { opacity: 1, yPercent: 0, stagger: 0.12, ease: 'none', duration: 0.8 }, at);
    }
    if (fast) {
      const at = split.words.findIndex(w => w.contains(fast)) * 0.1 + 0.25;
      tl.fromTo(fast, { skewX: -14, xPercent: 12 }, { skewX: 0, xPercent: 0, ease: 'none', duration: 0.25 }, at)
        .fromTo(q('[data-fastline]'), { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 0.3 }, at)
        .to(q('[data-fastline]'), { scaleX: 0, transformOrigin: '100% 50%', ease: 'none', duration: 0.3 }, at + 0.35);
    }
    drawPath(q('[data-swoosh] path'), { timeline: tl, at: '>-0.2', duration: 0.6 });
    // Handoff to the Lap: over the last part of the pin, the statement steps back and
    // dims while the Lap's veil starts to open behind it.
    if (!short) tl.to(q('[data-pinbody]'), { scale: 0.94, opacity: 0.3, transformOrigin: '0% 50%', ease: 'none', duration: tl.duration() * 0.18 });
  });

  const words = profile.about.split(' ');
  return (
    <section ref={ref} id="about" tabIndex={-1} data-bg="#111113,#0b0b0c" className="relative px-4 md:px-8">
      <div data-pin className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center py-24">
        <div data-pinbody>
        <h2 className="sr-only">About me</h2>
        {/* What screen readers hear: the statement below is split into words for the light-up. */}
        <p className="sr-only">{profile.about}</p>
        <p data-statement aria-hidden="true" className="display max-w-[20ch] text-[clamp(1.875rem,min(5.3vw,calc(12.75svh_-_38px)),5.1rem)] !leading-[0.95]">
          {words.map((w, i) => (
            // The statement is static and repeats words, so the position is the key.
            // oxlint-disable-next-line react/no-array-index-key
            <span key={i}>
              {profile.aboutAccent.includes(w)
                ? <em className="display-em relative isolate inline-block">{w}{w === 'fast.' && <span data-fastline className="absolute inset-x-0 top-1/2 -z-10 h-[0.12em] origin-left scale-x-0 bg-ac/60" />}</em>
                : w}
              {/* The helmet lands here, after "fast." (gl/flight); no room unless it flies. */}
              {w === 'fast.' && <span data-helmet-anchor="slot" className="helmet-slot" />}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
        <svg data-swoosh aria-hidden="true" viewBox="0 0 344 36" fill="none" className="mt-6 w-[min(420px,70vw)]">
          <path d={SWOOSH_PATH} stroke="var(--ac)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        </div>
      </div>
    </section>
  );
}
