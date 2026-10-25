import { useRef, type CSSProperties, type ReactNode } from 'react';
import { gsap } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

/**
 * Project card. Desktop hover (or keyboard focus) draws one red sector line
 * around the card with DrawSVG, and it retracts, quicker, on leave. The tilt
 * and the local spotlight come from useBentoPointer on the grid.
 */
export function ProjectCard({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), line = useRef<SVGRectElement>(null);
  const draw = (on: boolean) => {
    const el = box.current, r = line.current;
    if (!el || !r || !motionEnabled()) return;
    if (on) {
      const w = el.offsetWidth, h = el.offsetHeight; // both read before either write
      r.setAttribute('width', String(w - 1));
      r.setAttribute('height', String(h - 1));
      gsap.fromTo(r, { drawSVG: '0%' }, { drawSVG: '100%', duration: DUR.wipe, ease: EASE.out, overwrite: true });
    } else {
      gsap.to(r, { drawSVG: '100% 100%', duration: DUR.split, ease: EASE.in, overwrite: true });
    }
  };
  return (
    // The whole card opens its details: a click anywhere that isn't another control
    // is passed to the Details button (which keeps keyboard access and the dialog origin).
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- mouse shortcut to the Details button
    <article data-card data-cursor="view" className={className} style={{ '--i': index } as CSSProperties}
      onClick={e => { if (!(e.target as Element).closest('button, a')) e.currentTarget.querySelector<HTMLButtonElement>('[data-details]')?.click(); }}
      onPointerEnter={() => { if (!isTouch()) draw(true); }} onPointerLeave={() => { if (!isTouch()) draw(false); }}
      onFocus={() => draw(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) draw(false); }}>
      <div ref={box} data-tilt className="card relative isolate cursor-pointer overflow-hidden border border-line bg-graphite has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ac">
        <span aria-hidden="true" className="card-spot" />
        {children}
        <span data-cardshade aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-carbon opacity-0" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible">
          <rect ref={line} x="0.5" y="0.5" width="0" height="0" fill="none" stroke="var(--ac)" strokeWidth="2" style={{ strokeDasharray: '0 1' }} />
        </svg>
      </div>
    </article>
  );
}
