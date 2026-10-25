import { CvLink } from '@/components/CvLink';
import { LazyMap } from '@/components/LazyMap';
import { EMAIL, profile, SECTIONS, SOCIAL } from '@/content/data';
import { useSectionMotion } from '@/motion/useSectionMotion';
import { buildContact, useStaticLapTime } from './contactMotion';
import { CopyPhone } from './CopyPhone';
import { Headline } from './Headline';

/** Every section but this one, by its short name: the footer's page list. */
const PAGES = SECTIONS.filter(s => s.menu && s.id !== 'contact');
/** The build's year (vite.config.ts), the same in the prerendered HTML and on the client. */
const YEAR: string = import.meta.env.BUILD_YEAR;

/** One row of the footer's two lists: big expanded caps that roll and turn red on hover. */
const row = 'display inline-block whitespace-nowrap py-1 text-display-small leading-none transition-colors duration-(--dur-hit) hover:text-ac2 focus-visible:text-ac2';

/**
 * The finish: the last screen as a card in a frame that deepens to red at the bottom. A tab
 * in its top edge holds the visitor's lap time, a notch in each bottom corner the legal line,
 * and the helmet parks in the middle (gl/flight). The static markup is the finished card.
 */
export function Contact() {
  const ref = useSectionMotion(buildContact);
  useStaticLapTime(ref);

  const label = 'label mb-5 block';
  return (
    <footer ref={ref} id="contact" tabIndex={-1} data-bg="#0b0b0c,#101114"
      className="footer relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-[calc(var(--fw)+1rem)] pb-[calc(var(--fw)+var(--nh)+1.5rem)] pt-[calc(var(--navh)+2rem)] md:px-[calc(var(--fw)+2.5rem)] md:pb-[calc(var(--fw)+var(--nh)+1.75rem)] md:pt-[calc(var(--fw)+var(--td)+6rem)]">
      <h2 className="sr-only">Contact</h2>

      {/* The frame's gradient, and the card over it with its shadow and light edge. */}
      <div data-fframe aria-hidden="true" className="footer-frame -z-30" />
      <div aria-hidden="true" className="footer-card -z-20"><div className="footer-card-shape" /></div>

      {/* The career map, faint behind everything (not on phones, where it would run through the lists). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[10%] -z-10 mx-auto hidden w-[min(90%,1250px)] text-fg/[0.13] md:block">
        <LazyMap />
      </div>

      <Headline />

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
            style={{ WebkitTextStroke: '1px color-mix(in srgb, var(--letter) 14%, transparent)' }}>04</div>
          {/* Where the helmet parks (gl/flight): placed by layout only, no transforms. */}
          <div data-helmet-anchor="parc" aria-hidden="true" className="pointer-events-none invisible size-[min(38vw,21vh)] md:size-[min(21vw,32vh)]" />
        </div>

        <div className="text-right max-md:order-3 md:min-h-60">
          <span className={label}>Contact</span>
          <ul>
            <li data-flink><a href={`mailto:${EMAIL}`} className={row}><span data-letter-roll>Email</span></a></li>
            {SOCIAL.map(s => (
              <li key={s.label} data-flink><a href={s.href} target="_blank" rel="noreferrer" className={row}><span data-letter-roll>{s.label}</span></a></li>
            ))}
            <li data-flink><CopyPhone className={row} /></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-center md:absolute md:inset-x-0 md:bottom-[calc(var(--fw)+0.6rem)] md:mt-0">
        <span data-cta className="inline-flex"><span data-ctamag className="inline-flex">
          <CvLink className="btn btn-primary !px-7 !py-4 !text-sm" />
        </span></span>
      </div>

      <div data-ftab className="footer-tab">
        <span data-tabflash aria-hidden="true" className="invisible absolute inset-0 bg-fg" />
        {/* Filled in on the client (never prerendered with a made-up time). */}
        <p data-laptotal hidden className="footer-text justify-center">
          <span className="text-mute"><span className="max-sm:hidden">Lap complete</span><span className="sm:hidden">Lap</span></span>
          <span data-lapclock className="font-mono tabular-nums" />
        </p>
      </div>
      <div data-fnotch="l" className="footer-corner left-0">
        <p className="footer-text right-(--nh) pl-[calc(var(--fw)+1rem)] md:pl-[calc(var(--fw)+1.5rem)]"><span>&copy; {YEAR} {profile.name}<span className="max-xl:hidden">, {profile.location.split(',')[0]}</span></span></p>
      </div>
      <div data-fnotch="r" className="footer-corner right-0">
        <p className="footer-text left-(--nh) justify-end pr-[calc(var(--fw)+1rem)] text-right md:pr-[calc(var(--fw)+1.5rem)]"><span>Open to <span className="whitespace-nowrap">full stack / AI roles</span></span></p>
      </div>
    </footer>
  );
}
