// The product itself: its live demo or framed screens, settling into place as it scrolls in.
import { useEffect, useRef, useState } from 'react';
import { gsap } from '../../motion';
import { Stage, TALLY } from '../../stage/Stage';
import { useBlockMotion, type BlockProps } from './shared';

export function StageBlock({ product }: BlockProps<'stage'>) {
  const root = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [tally, setTally] = useState<number | null>(null);
  const counts = TALLY[product.stage];

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => setActive(entries.some(e => e.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useBlockMotion(root, () => {
    const stage = stageRef.current;
    if (!stage) return;
    gsap.fromTo(stage,
      { scale: 0.9, rotateX: 16, transformPerspective: 1400, transformOrigin: '50% 0%' },
      { scale: 1, rotateX: 0, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 25%', scrub: true } });
  });

  return (
    <div className="dt-block dt-stage-wrap pp-wrap" ref={root}>
      {/* Named for screen readers: the demos' own headings sit under this one. */}
      <h2 className="pp-sr">The product</h2>
      <div className={`dt-stage dt-stage--${product.stage}`} ref={stageRef}>
        <Stage product={product} active={active} onTally={setTally} />
      </div>
      <p className="dt-hint pp-mono">
        <span className="dt-live" aria-hidden="true" />
        {product.hint}
        {counts && tally !== null && <span className="dt-tally" aria-live="polite">{tally} {counts.join(' ')}</span>}
      </p>
    </div>
  );
}
