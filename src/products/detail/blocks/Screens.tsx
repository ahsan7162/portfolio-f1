// A sideways gallery: pinned and moved by the scroll on desktop with a mouse, a native swipe row elsewhere.
import { useId, useRef } from 'react';
import { pad } from '../../format';
import { gsap } from '../../motion';
import { srcSet } from '../../paths';
import { KindFrame, SampleScreen } from '../../stage/Frames';
import { Label, useBlockMotion, usePreload, type BlockProps } from './shared';

export function Screens({ block, product, n }: BlockProps<'screens'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  // A second gallery of sample screens on the same page starts further on, in the dark theme, so the two differ.
  const nth = product.blocks.filter(b => b.type === 'screens').indexOf(block);
  const v = (product.variant ?? 0) + nth;
  const shots = block.screens.length
    ? block.screens.map(s => ({ id: s.src, title: s.title, caption: s.caption, body: <img className="dt-shot-img" src={s.src} srcSet={srcSet(s.src)} sizes="(min-width: 900px) 60vw, 84vw" alt={s.title} loading="lazy" decoding="async" /> }))
    : [0, 1, 2].map(i => ({ id: `sample-${i}`, title: 'Sample screen', caption: '', body: <SampleScreen kind={product.kind} variant={(v + i) % 3} dark={nth % 2 === 1} /> }));

  // Decode the screenshots before the pin moves them: decoding mid-scroll is what drops frames.
  usePreload(root);

  useBlockMotion(root, ({ pin, q, qa, enter }) => {
    const sec = root.current;
    const gal = q('.dt-gal');
    const track = q('.dt-track');
    if (!sec || !gal || !track) return;
    if (!pin) {
      gsap.from(qa('.dt-shot'), { x: 48, autoAlpha: 0, duration: 0.5, stagger: 0.05, scrollTrigger: enter(gal) });
      return;
    }
    const dist = () => Math.max(0, track.getBoundingClientRect().width - gal.clientWidth);
    gsap.timeline({
      scrollTrigger: {
        trigger: sec, pin: true, scrub: true, invalidateOnRefresh: true,
        start: () => (sec.offsetHeight > window.innerHeight ? 'top top' : 'center center'),
        // a little less scroll than the distance travelled, so a long gallery does not drag
        end: () => `+=${dist() * 0.6}`,
      },
    })
      .to(track, { x: () => -dist(), ease: 'none' })
      .fromTo(q('.dt-gal-bar'), { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);
  });

  return (
    <section className="dt-block dt-sec dt-screens pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <div className="dt-gal">
        <ul className="dt-track">
          {shots.map((s, i) => (
            <li key={s.id} className={`dt-shot dt-shot--${product.kind}`}>
              <figure>
                <KindFrame kind={product.kind} slug={product.slug} title={s.title} className="dt-frame">{s.body}</KindFrame>
                <figcaption className="pp-mono">
                  <b>{pad(i + 1)} {s.title}</b>{s.caption && <span className="pp-dim"> · {s.caption}</span>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
      <div className="dt-gal-progress" aria-hidden="true"><span className="dt-gal-bar" /></div>
    </section>
  );
}
