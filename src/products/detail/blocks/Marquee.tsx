// A full-bleed band of huge words drifting sideways. Scrolling speeds it up and flips it with the
// scroll's direction, then it eases back to its drift. Decorative: screen readers get the words once.
import { useRef } from 'react';
import { gsap, ScrollTrigger } from '../../motion';
import type { BlockProps } from './shared';
import { useBlockMotion } from './shared';
import '../../styles/blocks-visual.css';

/** Copies of the words in one half of the track: enough to be wider than any screen. */
const REPEAT = 3;

export function Marquee({ block }: BlockProps<'marquee'>) {
  const root = useRef<HTMLElement>(null);
  const run = Array.from({ length: REPEAT }, (_, r) => block.words.map((w, i) => ({ w, id: `${r}-${i}` }))).flat();

  useBlockMotion(root, ({ q }) => {
    const band = root.current;
    const track = q('.bv-mq-track');
    if (!band || !track) return;
    // The track is two identical halves: moving it by -50% loops seamlessly.
    const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 28 * (block.words.length / 4), repeat: -1 });
    // Start far into the endless repeat, so a reversed timeScale has room to run backwards.
    loop.totalTime(loop.duration() * 1000);
    let dir = 1;
    const st = ScrollTrigger.create({
      trigger: band, start: 'top bottom', end: 'bottom top',
      onToggle: self => { if (self.isActive) loop.play(); else loop.pause(); },
      onUpdate: self => {
        dir = self.direction;
        const boost = Math.min(6, Math.abs(self.getVelocity()) / 250);
        gsap.to(loop, { timeScale: dir * (1 + boost), duration: 0.12, overwrite: true, onComplete: () => { gsap.to(loop, { timeScale: dir, duration: 0.6, ease: 'power2.out' }); } });
      },
    });
    if (!st.isActive) loop.pause();
  });

  return (
    <section className="dt-block bv-mq" ref={root} aria-label="In short">
      <ul className="pp-sr">{block.words.map(w => <li key={w}>{w}</li>)}</ul>
      <div className="bv-mq-band" aria-hidden="true">
        <div className="bv-mq-track">
          {[0, 1].map(half => (
            <span className="bv-mq-half" key={half}>
              {run.map(x => (
                <span className="bv-mq-item" key={x.id}>
                  <span className="bv-mq-word pp-display">{x.w}</span>
                  <span className="bv-mq-star">✳</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
