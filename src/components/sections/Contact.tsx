import { useEffect, useRef, useState } from 'react';
import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { PALETTE } from '@/art/palette';
import { CvLink } from '@/components/CvLink';
import { LazyMap } from '@/components/LazyMap';
import { EMAIL, PHONE, PHONE_DISPLAY, profile, SECTIONS, SOCIAL } from '@/content/data';
import { lapTime } from '@/lib/format';
import { gsap } from '@/motion/gsap';
import { batchReveal, gridSlot, inView, magnet } from '@/motion/patterns';
import { motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';
import { useSectionMotion } from '@/motion/useSectionMotion';

/** Every section but this one, by its short name: the footer's page list. */
const PAGES = SECTIONS.filter(s => s.menu && s.id !== 'contact');
const YEAR = new Date().getFullYear();

/** One row of the footer's two lists: big expanded caps that roll and turn red on hover. */
const row = 'display inline-block py-1 text-display-small leading-none transition-colors duration-(--dur-hit) hover:text-ac focus-visible:text-ac';

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
    <button type="button" onClick={copy} aria-live="polite" className={row}>
      {/* Keyed by state: a new label mounts unsplit when the text changes (useLetterRoll). */}
      <span key={state} data-letter-roll>{state === 'shown' ? PHONE_DISPLAY : state === 'copied' ? 'Copied' : 'Copy phone'}</span>
    </button>
  );
}

/**
 * The finish: the last screen as a card, its own carbon surface, with the page running on
 * around it: the frame's gradient is clear at the top and deepens to red at the bottom,
 * where the card's shadow falls. A tab hangs into the card's top edge with the visitor's
 * lap time, and a notch in each bottom corner holds the legal line. The circuit from the
 * hero signs the headline, the helmet parks in the middle (gl/flight), pages on the left,
 * contact on the right, the CV pill in the tongue between the notches. The static markup
 * is the finished card.
 */
export function Contact() {
  const ref = useSectionMotion(({ root, q, qa, onRevert }) => {
    const title = q('[data-ctitle]')!;
    gridSlot(title, { start: 'top 92%', end: 'top 50%' });

    // The visitor's real time on the page so far, frozen as their lap time.
    const clock = q('[data-lapclock]')!, total = q('[data-laptotal]')!;
    const freeze = () => {
      clock.textContent = lapTime(performance.now() / 1000);
      total.hidden = false;
      gsap.fromTo(total, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: DUR.split, ease: EASE.out });
    };
    onRevert(() => { total.hidden = true; clock.textContent = ''; });

    // The signature: the hero's circuit draws itself over the headline, then a light runs
    // one lap of it. The time freezes as it crosses the line, and the tab flashes chalk.
    const light = q('[data-siglight]');
    gsap.timeline({ scrollTrigger: inView(title, { start: 'top 70%' }) })
      .fromTo(q('[data-sig]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: DUR.show, ease: EASE.wipe })
      .fromTo(q('[data-sigline]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: DUR.split }, '-=0.4')
      .fromTo(light, { strokeDashoffset: 0, autoAlpha: 1 }, { strokeDashoffset: -1, duration: 1.3, ease: 'power1.inOut', immediateRender: false }, '-=0.35')
      .add(freeze)
      .fromTo(q('[data-tabflash]'), { autoAlpha: 0.9 }, { autoAlpha: 0, duration: DUR.wipe, ease: EASE.out, immediateRender: false }, '<')
      .to(light, { autoAlpha: 0, duration: DUR.split });

    batchReveal(qa('[data-flink]'), { y: 16, stagger: 0.04 });
    onRevert(magnet(q('[data-cta]'), q('[data-ctamag]'), 0.3));

    // The card holds its place, so the page keeps flowing past its edges; around it the
    // frame's red comes up as the footer arrives. Then the lap readout drops into the tab
    // and the legal lines slide into the notches. Locked to the scroll, done as the page ends.
    gsap.timeline({ defaults: { ease: EASE.none }, scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } })
      .fromTo(q('[data-fframe]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, 0)
      .fromTo(q('[data-ftab]'), { yPercent: -101 }, { yPercent: 0, duration: 0.3 }, 0.55)
      .fromTo(q('[data-fnotch="l"]'), { xPercent: -101 }, { xPercent: 0, duration: 0.35 }, 0.65)
      .fromTo(q('[data-fnotch="r"]'), { xPercent: 101 }, { xPercent: 0, duration: 0.35 }, 0.65);
  });

  // Without motion the lap time still freezes, just without the light, when the footer shows.
  useEffect(() => {
    const root = ref.current;
    if (!root || motionEnabled()) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      root.querySelector('[data-lapclock]')!.textContent = lapTime(performance.now() / 1000);
      root.querySelector<HTMLElement>('[data-laptotal]')!.hidden = false;
    }, { threshold: 0.5 });
    io.observe(root);
    return () => io.disconnect();
  }, [ref]);

  const label = 'label mb-5 block';
  return (
    <footer ref={ref} id="contact" tabIndex={-1} data-bg="#0b0b0c,#101114"
      className="footer relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-[calc(var(--fw)+1rem)] pb-[calc(var(--fw)+var(--nh)+1.5rem)] pt-[calc(var(--navh)+2rem)] md:px-[calc(var(--fw)+2.5rem)] md:pb-[calc(var(--fw)+var(--nh)+1.75rem)] md:pt-[calc(var(--fw)+var(--td)+6rem)]">
      <h2 className="sr-only">Contact</h2>

      {/* The frame's gradient, and the card over it with its shadow and light edge. */}
      <div data-fframe aria-hidden="true" className="footer-frame -z-30" />
      <div aria-hidden="true" className="footer-card -z-20"><div className="footer-card-shape" /></div>

      {/* Texture: the career map (Karachi, Dubai, Milan), faint behind everything. Not on
          phones, where its arcs would run through the lists. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[10%] -z-10 mx-auto hidden w-[min(90%,1250px)] text-fg/[0.13] md:block">
        <LazyMap markerColor={PALETTE.ac} />
      </div>

      {/* The headline, signed with the circuit. */}
      <div className="relative mx-auto w-fit text-center">
        {/* The link holds the headline (not the other way round): the headline is split into
            letters, which are hidden from screen readers, so the link carries its own name. */}
        <a href={`mailto:${EMAIL}`} aria-label="Let's build something fast. Email me" className="block transition-colors duration-(--dur-hit) hover:text-ac">
          <p data-ctitle data-speed aria-hidden="true" className="display text-display-section">
            Let's build<br className="max-sm:hidden" /> something <em className="display-em">fast</em>.
          </p>
        </a>
        <svg aria-hidden="true" viewBox={CIRCUIT_VIEWBOX} fill="none"
          className="pointer-events-none absolute -top-[46%] right-[4%] w-[23%] min-w-28 -rotate-[7deg] overflow-visible max-sm:-top-[30%] max-sm:right-0">
          <path data-sig d={CIRCUIT_PATH} stroke="var(--ac)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {/* Motion only: the light that runs the lap. */}
          <path data-siglight d={CIRCUIT_PATH} pathLength={1} strokeDasharray="0.05 0.95" stroke="var(--fg)" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="invisible" />
          {/* The start and finish line. */}
          <path data-sigline d="M58 184 V208" stroke="var(--fg)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* Pages, the helmet's parking spot, contact. */}
      <div className="mt-6 grid flex-1 grid-cols-2 items-start gap-x-4 gap-y-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-x-8">
        <nav aria-label="Sections" className="max-md:order-2 md:min-h-60">
          <span className={label}>Sections</span>
          <ul>
            {PAGES.map(s => (
              <li key={s.id} data-flink><a href={`#${s.id}`} className={row}><span data-letter-roll>{s.short}</span></a></li>
            ))}
          </ul>
        </nav>

        <div className="relative col-span-2 grid place-items-center self-center md:col-span-1">
          {/* The race number, the helmet's stand-in when there is no WebGL. */}
          <div aria-hidden="true" className="display pointer-events-none absolute select-none text-[min(36vw,24vh)] leading-none text-transparent md:text-[min(23vw,36vh)]"
            style={{ WebkitTextStroke: '1px rgb(244 244 237 / 0.14)' }}>04</div>
          {/* Where the helmet parks (gl/flight). Placed by layout only, no transforms. */}
          <div data-helmet-anchor="parc" aria-hidden="true" className="pointer-events-none invisible size-[min(38vw,21vh)] md:size-[min(21vw,32vh)]" />
        </div>

        <div className="text-right max-md:order-3 md:min-h-60">
          <span className={label}>Contact</span>
          <ul>
            <li data-flink><a href={`mailto:${EMAIL}`} className={row}><span data-letter-roll>Email</span></a></li>
            {SOCIAL.map(s => (
              <li key={s.label} data-flink><a href={s.href} target="_blank" rel="noreferrer" className={row}><span data-letter-roll>{s.label}</span></a></li>
            ))}
            <li data-flink><CopyPhone /></li>
          </ul>
        </div>
      </div>

      {/* The CV pill, in the tongue between the notches (in the flow on phones). */}
      <div className="mt-8 flex justify-center md:absolute md:inset-x-0 md:bottom-[calc(var(--fw)+0.6rem)] md:mt-0">
        <span data-cta className="inline-flex"><span data-ctamag className="inline-flex">
          <CvLink className="btn btn-primary !px-7 !py-4 !text-sm" />
        </span></span>
      </div>

      {/* On the frame: the lap readout in the tab, the legal line in the notches. */}
      <div data-ftab className="footer-tab">
        {/* Motion only: the flash as the lap time lands. */}
        <span data-tabflash aria-hidden="true" className="invisible absolute inset-0 bg-fg" />
        {/* Filled in on the client (never prerendered with a made-up time). */}
        <p data-laptotal hidden className="footer-text justify-center">
          <span className="text-mute"><span className="max-sm:hidden">Lap complete</span><span className="sm:hidden">Lap</span></span>
          <span data-lapclock className="tabular-nums" />
        </p>
      </div>
      <div data-fnotch="l" className="footer-notch left-0">
        <p className="footer-text right-(--nh) pl-[calc(var(--fw)+1rem)] md:pl-[calc(var(--fw)+1.5rem)]"><span>&copy; {YEAR} {profile.name}<span className="max-xl:hidden">, {profile.location.split(',')[0]}</span></span></p>
      </div>
      <div data-fnotch="r" className="footer-notch right-0">
        <p className="footer-text left-(--nh) justify-end pr-[calc(var(--fw)+1rem)] text-right md:pr-[calc(var(--fw)+1.5rem)]"><span>Open to <span className="whitespace-nowrap">full stack / AI roles</span></span></p>
      </div>
    </footer>
  );
}
