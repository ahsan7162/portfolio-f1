import { CIRCUIT_PATH, CIRCUIT_VIEWBOX } from '@/art/circuit';
import { EMAIL } from '@/content/data';

/** The headline, signed with the hero's circuit (drawn, then lapped by a light: contactMotion.ts). */
export function Headline() {
  return (
    <div className="relative mx-auto w-fit text-center">
      {/* The link holds the headline (not the other way round): the headline is split into
          letters, which are hidden from screen readers, so the link carries its own name. */}
      <a href={`mailto:${EMAIL}`} aria-label="Let’s build something fast. Email me" className="block transition-colors duration-(--dur-hit) hover:text-ac2">
        <p data-ctitle data-speed aria-hidden="true" className="display text-display-section">
          Let’s build<br className="max-sm:hidden" /> something fast<span className="text-ac">.</span>
        </p>
      </a>
      <svg aria-hidden="true" viewBox={CIRCUIT_VIEWBOX} fill="none"
        className="pointer-events-none absolute -top-[46%] right-[4%] w-[23%] min-w-28 -rotate-[7deg] overflow-visible max-sm:-top-[30%] max-sm:right-0">
        <path data-sig d={CIRCUIT_PATH} stroke="var(--ac2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* Motion only: the light that runs the lap. */}
        <path data-siglight d={CIRCUIT_PATH} pathLength={1} strokeDasharray="0.05 0.95" stroke="var(--fg)" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="invisible" />
        {/* The start and finish line. */}
        <path data-sigline d="M58 184 V208" stroke="var(--fg)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
