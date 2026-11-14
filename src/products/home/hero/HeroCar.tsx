// The hero: an F1 car, drawn flat and side-on, that is built in front of you. Each part stands for
// a layer of the work. Point at one (or its label) and it shows what it is; scrolling sends the car
// off down the road.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { onReveal } from '../../arrive';
import { pad } from '../../format';
import { gsap, useGSAP } from '../../motion';
import { AXLE, Car, PARTS, VIEW, type PartId } from './Car';
import { SiteHeader } from '../Header';
import { FACTS, ME, toNext } from './shared';
import '../../styles/hero-car.css';

/** How far the car travels when it leaves, in drawing units: well off the edge. */
const RUN = 2400;
const isPart = (v: string | undefined): v is PartId => PARTS.some(p => p.id === v);

export function HeroCar() {
  const root = useRef<HTMLElement>(null);
  // Two ways to pick a part: pointing at it shows it while the pointer is there; a click (or tap, or
  // the keyboard) keeps it shown. Pointing wins while it lasts.
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [pinned, setPinned] = useState<PartId | null>(null);
  const leaving = useRef(0);
  const picked = hovered ?? pinned;
  const layer = picked ? ME.layers[PARTS.find(p => p.id === picked)?.layer ?? 0] : null;

  /** Point at a part, or at nothing. Leaving waits a moment, so crossing a gap between parts does not flicker. */
  const point = (id: PartId | null) => {
    window.clearTimeout(leaving.current);
    if (id) setHovered(id);
    else leaving.current = window.setTimeout(() => setHovered(null), 140);
  };
  useEffect(() => () => window.clearTimeout(leaving.current), []);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // GSAP turns SVG about the box's corner by default, which swings a wheel off its axle; turn it about the hub. Set before any tween.
      gsap.set('.hc-spin', { transformOrigin: '50% 50%' });
      const part = (id: PartId) => el.querySelector(`[data-part="${id}"] .hc-in`);
      const thud = { y: 3, duration: 0.05, ease: 'power1.out', yoyo: true, repeat: 1 };

      // The build: floor first, then everything that bolts to it, wheels last. Held until the page is seen.
      const build = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .from('.hc-words', { autoAlpha: 0, y: 40, duration: 0.9 }, 0)
        .from('.hc-ground', { scaleX: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'expo.out' }, 0)
        .from('.hc-start', { autoAlpha: 0, duration: 0.5 }, 0.6)
        .from('.hc-pool', { autoAlpha: 0, duration: 0.8 }, 0.1)
        .from(part('floor'), { x: -460, autoAlpha: 0, duration: 0.6 }, 0.1)
        .from(part('body'), { y: -150, autoAlpha: 0, duration: 0.42, ease: 'power2.in' }, 0.5)
        .to('.hc-shake', thud, 0.92)
        .from(part('power'), { y: -170, x: -40, autoAlpha: 0, duration: 0.42, ease: 'power2.in' }, 0.74)
        .to('.hc-shake', thud, 1.16)
        .from(part('driver'), { y: -150, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0.98)
        .from(part('wing'), { x: 260, autoAlpha: 0, duration: 0.5 }, 1.12)
        .from('.hc-seat', { scale: 1.55, autoAlpha: 0, duration: 0.42, stagger: 0.14 }, 1.4)
        .from('.hc-spin', { rotation: -300, duration: 0.75, stagger: 0.14 }, 1.4)
        .to('.hc-shake', thud, 1.86)
        .from('.hc-tag', { autoAlpha: 0, duration: 0.4, stagger: 0.05 }, 1.7) // fade only: the CSS owns the labels' position
        .from('.hc-band > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.08 }, 0.5);
      const off = onReveal(() => build.play());

      // A band of light crosses the bodywork after the build, and again every few seconds.
      const sheen = gsap.fromTo('.hc-sheen', { x: 0 }, { x: 2200, duration: 1.7, ease: 'power2.inOut', repeat: -1, repeatDelay: 6, delay: 2.4, paused: true });
      const watch = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) sheen.play(); else sheen.pause(); });
      watch.observe(el);

      // Leaving: the car pulls away, wheels turning, as the page scrolls on.
      gsap.timeline({ defaults: { ease: 'power2.in', duration: 1 }, scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
        .to('.hc-drive', { x: RUN }, 0)
        .to('.hc-spin', { rotation: (RUN / (2 * Math.PI * AXLE.r)) * 360 }, 0)
        .fromTo('.hc-streaks', { autoAlpha: 0 }, { autoAlpha: 0.5, duration: 0.3, ease: 'none' }, 0.04)
        .to('.hc-words', { xPercent: -8, ease: 'none' }, 0)
        .to('.hc-band, .hc-tags', { autoAlpha: 0, y: -24, duration: 0.3, ease: 'none' }, 0);

      // The words behind the car drift a little against the pointer, for depth.
      const drift = gsap.quickTo('.hc-words', 'x', { duration: 0.9, ease: 'power3' });
      const onMove = (e: globalThis.PointerEvent) => { if (e.pointerType === 'mouse') drift((0.5 - e.clientX / window.innerWidth) * 36); };
      el.addEventListener('pointermove', onMove);

      return () => { off(); watch.disconnect(); el.removeEventListener('pointermove', onMove); };
    });
  }, { scope: root });

  /** Which part's fixed hit zone the pointer is over, if any. */
  const zone = (e: { target: EventTarget }) => {
    const id = (e.target as Element).closest<SVGElement>('[data-hit]')?.dataset.hit;
    return isPart(id) ? id : null;
  };
  // The labels own their hover: their pointerover bubbles up here too and would otherwise read as "over nothing".
  const overCar = (e: PointerEvent<HTMLDivElement>) => { if (e.pointerType === 'mouse' && !(e.target as Element).closest('.hc-tag')) point(zone(e)); };
  const pin = (id: PartId | null) => { if (id) setPinned(now => (now === id ? null : id)); };

  return (
    <section className="hero hc" aria-label="Introduction" ref={root} data-picked={picked ?? undefined}>
      <SiteHeader />
      <div className="hc-stage">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- pointer shortcut only: every part has a real button in the label row below */}
        <div className="hc-fit" onPointerOver={overCar} onPointerLeave={() => point(null)} onClick={e => pin(zone(e))}>
          <p className="hc-words pp-display" aria-hidden="true">I build.</p>
          <Car />
          <div className="hc-tags">
            {PARTS.map(p => (
              <button type="button" className="hc-tag pp-mono" key={p.id} style={{ '--at': `${(p.at[0] / VIEW.w) * 100}%` } as CSSProperties}
                aria-pressed={pinned === p.id} data-on={picked === p.id ? '' : undefined}
                onPointerEnter={e => { if (e.pointerType === 'mouse') point(p.id); }} onPointerLeave={() => point(null)}
                onFocus={() => point(p.id)} onBlur={() => point(null)}
                onClick={e => { e.stopPropagation(); pin(p.id); }}>
                <b>{pad(p.layer + 1)}</b>{ME.layers[p.layer].name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="hc-band">
        <div className="hc-say">
          <h1 className="hc-name pp-mono"><span className="pp-sr">I build. </span>{ME.name}</h1>
          <p className="hc-line pp-lede">{ME.line}</p>
          <div className="hc-cta">
            <button type="button" className="pp-btn" onClick={() => toNext(root.current)}>See the products ↓</button>
            <a className="pp-btn pp-btn--ghost" href="/">Portfolio ↗</a>
          </div>
        </div>
        <div className="hc-side">
          <p className="hc-note pp-mono" aria-live="polite">
            {layer ? <><b>{layer.name}.</b> {layer.note}</> : <span className="hc-cue">Every part is a layer of the work. Point at one.</span>}
          </p>
          <dl className="hc-facts">
            {FACTS.map(f => <div key={f.label}><dt className="pp-mono">{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
        </div>
      </div>
    </section>
  );
}
