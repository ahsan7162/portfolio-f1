// The top of the main page: each featured product gets the whole screen, one after another,
// with the product itself on a stage beside its name.
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { brandVars } from '../brand';
import { gsap, ScrollTrigger, useGSAP } from '../motion';
import { pad } from '../format';
import { Link, productPath } from '../router';
import { isJumping, setWheelGate, stepToY } from '../scroll';
import { Stage, TALLY } from '../stage/Stage';
import { FILM_ID, findBlock, KINDS, type Product } from '../types';
import { SiteHeader, toAll } from './Header';

const DESKTOP = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';
const FLOOD_AT = '72% 48%';

function Slide({ product, index, active, tally, report }: {
  product: Product; index: number; active: boolean; tally: number | undefined; report: (slug: string, value: number) => void;
}) {
  const el = useRef<HTMLElement>(null);
  const mounted = useRef(false);
  // PR Dashboard's demo ends when every blocker is cleared: the screen floods and stamps Merged.
  const done = product.stage === 'pr-demo' && tally === 0;
  const onTally = useCallback((value: number) => report(product.slug, value), [report, product.slug]);
  const label = TALLY[product.stage];
  const film = findBlock(product, 'film');

  useGSAP(() => {
    // Only PR Dashboard has a finish to play (and a stamp to play it on).
    if (product.stage !== 'pr-demo') return;
    if (!mounted.current) { mounted.current = true; return; }
    if (done) {
      gsap.fromTo('.ft-flood', { clipPath: `circle(0% at ${FLOOD_AT})` }, { clipPath: `circle(150% at ${FLOOD_AT})`, duration: 1.1, ease: 'expo.out' });
      gsap.fromTo('.ft-stamp', { autoAlpha: 0, scale: 2.6, rotate: -26 }, { autoAlpha: 1, scale: 1, rotate: -9, duration: 0.6, delay: 0.2, ease: 'back.out(1.7)' });
    } else {
      gsap.to('.ft-flood', { clipPath: `circle(0% at ${FLOOD_AT})`, duration: 0.6, ease: 'expo.inOut' });
      gsap.to('.ft-stamp', { autoAlpha: 0, duration: 0.2 });
    }
  }, { scope: el, dependencies: [done, product.stage] });

  return (
    <article className="ft-slide" ref={el} style={brandVars(product.brand)} data-kind={product.kind} data-active={active ? '' : undefined} data-done={done ? '' : undefined}>
      <div className="ft-flood" />
      <div className="ft-copy">
        <div className="ft-meta ft-fade pp-mono">
          <span className="pp-tag">{pad(index + 1)}</span>
          <span>{[KINDS[product.kind].label, ...product.facts].join(' · ')}</span>
          {product.sample && <span className="pp-sample">Sample</span>}
        </div>
        <h2 className="ft-name pp-display" style={{ '--fit': Math.max(...product.lines.map(l => l.length)) } as CSSProperties}>
          {product.lines.map(line => <span className="ft-line" key={line}><span className="ft-line-in">{line}</span></span>)}
        </h2>
        <p className="ft-hook ft-fade pp-lede">{done ? 'Nothing left. Ship it.' : product.hook}</p>
        <p className="ft-hint ft-fade pp-branded"><i />{done ? 'You just used the product. Now see how it was built.' : product.hint}</p>
        <div className="ft-cta ft-fade">
          <Link className="pp-btn" to={productPath(product.slug)} data-cursor="Open">Open the case study →</Link>
          {film && <Link className="pp-btn pp-btn--ghost" to={`${productPath(product.slug)}#${FILM_ID}`}>Watch the film · {film.duration}</Link>}
        </div>
      </div>
      <div className="ft-stage-wrap">
        <div className="ft-stage pp-branded" data-stage={product.stage}>
          <div className="ft-glow" />
          <div className="ft-tilt"><Stage product={product} active={active} onTally={onTally} /></div>
          {product.stage === 'pr-demo' && <div className="ft-stamp pp-display" aria-hidden={!done}>Merged</div>}
        </div>
      </div>
      {label && (
        <div className="ft-tally ft-fade pp-branded" aria-live="polite">
          <span className="pp-mono">{label[0]}<br />{label[1]}</span>
          <b className="pp-display" key={tally}>{tally ?? ''}</b>
        </div>
      )}
    </article>
  );
}

export function Featured({ items, total }: { items: Product[]; total: number }) {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  /** Glides to a product by its place in the list (set while the section is pinned). */
  const stepTo = useRef<((i: number) => void) | null>(null);
  const [current, setCurrent] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [tally, setTally] = useState<Record<string, number>>({});
  const last = items.length - 1;
  const report = useCallback((slug: string, value: number) => setTally(t => (t[slug] === value ? t : { ...t, [slug]: value })), []);
  const shown = items[current];
  const flooded = !!shown && shown.stage === 'pr-demo' && tally[shown.slug] === 0;

  useGSAP(() => {
    const slides = gsap.utils.toArray<HTMLElement>('.ft-slide');
    if (!slides.length) return;
    const q = (slide: HTMLElement, sel: string) => slide.querySelectorAll(sel);
    const mm = gsap.matchMedia();

    mm.add(DESKTOP, () => {
      setPinned(true);
      // One gesture, one product. While the section is on screen it takes the wheel: each push glides to
      // the next product in a fixed time and nothing can interrupt it, so a hard flick or a trackpad's
      // momentum cannot skip one. At the first and last product the page scrolls on as usual.
      let busy = false, endedAt = 0, lastAt = 0, lastSize = 0, hand = 0;
      /** The push that caused the last move is still going (no pause since). */
      let carried = false;
      /** Only wheel scrolling is caught and stepped; the keys, the scrollbar and touch scroll freely. */
      const wheeling = () => performance.now() - lastAt < 500;
      const nearest = () => {
        const st = trigger.current;
        return st ? Math.round(((window.scrollY - st.start) / (st.end - st.start)) * last) : 0;
      };
      const step = (i: number) => {
        const st = trigger.current;
        if (!st || busy) return;
        busy = true;
        const free = () => { busy = false; endedAt = performance.now(); hand = 0; };
        const guard = window.setTimeout(free, 1200);
        stepToY(st.start + (st.end - st.start) * (Math.max(0, Math.min(last, i)) / Math.max(1, last)), () => { window.clearTimeout(guard); free(); });
      };
      stepTo.current = step;
      /**
       * Is this wheel event a hand pushing, or momentum fading out after one? Momentum arrives without a
       * pause and only ever shrinks. A hand starts after a pause, or grows, or holds steady: any of those
       * counts, however gentle, so a slow two-finger drag works as well as a flick or a wheel notch.
       */
      const pushing = (size: number, now: number) => {
        if (now - lastAt > 110) { hand = 2; carried = false; }
        else if (size > lastSize * 1.15 + 1) hand += 2;
        else if (size >= lastSize) hand += 1;
        else hand = Math.max(0, hand - 1);
        lastAt = now; lastSize = size;
        return hand >= 2;
      };
      setWheelGate(({ deltaY, event }) => {
        const st = trigger.current;
        if (!st || last < 1 || !(event instanceof WheelEvent) || event.ctrlKey || isJumping()) return true;
        const now = performance.now();
        const byHand = pushing(Math.abs(deltaY), now);
        const y = window.scrollY;
        if (y < st.start - 1 || y > st.end + 1) return true;
        // One push moves one product. A push that is still going after its move has to keep going a
        // good while longer before it counts again, so one long drag or spin does not skip a product.
        const push = byHand && !busy && now - endedAt > (carried ? 600 : 120);
        const to = nearest() + (deltaY > 0 ? 1 : -1);
        // Past the first or last product a push hands the wheel back to the page; otherwise it moves one product.
        if (push && (to < 0 || to > last)) return true;
        if (push) { carried = true; step(to); }
        if (event.cancelable) event.preventDefault();
        return false;
      });
      // Arriving in the section with speed (or by the keys or the scrollbar): come to rest on a product.
      const land = () => { if (!isJumping() && wheeling()) step(nearest()); };
      const settle = gsap.delayedCall(0.16, () => {
        const st = trigger.current;
        if (!st || last < 1 || busy || isJumping() || !wheeling() || !st.isActive) return;
        if (Math.abs(nearest() / last - st.progress) > 0.004) step(nearest());
      }).pause();
      // One pinned screen. Scrolling plays the hand-over from each product to the next, and rests on each.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current, start: 'top top', end: () => `+=${last * window.innerHeight * 0.9}`,
          // Linked straight to the scroll: the page's smooth scrolling is the only easing, so nothing trails.
          pin: true, scrub: true, invalidateOnRefresh: true,
          onEnter: land, onEnterBack: land,
          onUpdate: self => { setCurrent(Math.round(self.progress * last)); settle.restart(true); },
        },
      });
      trigger.current = tl.scrollTrigger ?? null;
      slides.forEach((slide, i) => {
        if (i === 0) return;
        const prev = slides[i - 1], at = i - 1;
        tl.to(q(prev, '.ft-line-in'), { yPercent: -110, duration: 0.42, stagger: 0.04, ease: 'power2.in' }, at)
          .to(q(prev, '.ft-fade'), { autoAlpha: 0, y: -24, duration: 0.34, ease: 'power2.in' }, at)
          .to(q(prev, '.ft-stage'), { autoAlpha: 0, xPercent: 16, rotate: 5, scale: 0.92, duration: 0.46, ease: 'power2.in' }, at)
          .to(q(prev, '.ft-flood'), { autoAlpha: 0, duration: 0.4 }, at)
          .fromTo(q(slide, '.ft-line-in'), { yPercent: 110 }, { yPercent: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, at + 0.44)
          .fromTo(q(slide, '.ft-fade'), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.04, ease: 'power2.out' }, at + 0.5)
          .fromTo(q(slide, '.ft-stage'), { autoAlpha: 0, xPercent: -12, rotate: -5, scale: 0.9 }, { autoAlpha: 1, xPercent: 0, rotate: 0, scale: 1, duration: 0.56, ease: 'power3.out' }, at + 0.4);
      });

      // The stage leans, and follows the pointer a little.
      const tilts = gsap.utils.toArray<HTMLElement>('.ft-tilt');
      gsap.set(tilts, { transformPerspective: 1500, rotateY: -9, rotateX: 3 });
      const turn = tilts.map(t => [gsap.quickTo(t, 'rotateY', { duration: 0.5, ease: 'power3' }), gsap.quickTo(t, 'rotateX', { duration: 0.5, ease: 'power3' })] as const);
      const onMove = (e: PointerEvent) => {
        const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
        turn.forEach(([ry, rx]) => { ry(-9 + x * 8); rx(3 - y * 6); });
      };
      root.current?.addEventListener('pointermove', onMove);

      // The first product comes in as the section scrolls into view (it sits below the hero).
      const first = slides[0];
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 72%', once: true } })
        .from(q(first, '.ft-copy'), { autoAlpha: 0, y: 44, duration: 0.7 }, 0)
        .from(q(first, '.ft-stage-wrap'), { autoAlpha: 0, x: 120, rotate: 5, duration: 0.9 }, 0.06);

      return () => { settle.kill(); setWheelGate(null); stepTo.current = null; root.current?.removeEventListener('pointermove', onMove); trigger.current = null; setPinned(false); };
    });

    // Phones: the products simply follow one another down the page.
    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
      slides.forEach(slide => {
        gsap.from(q(slide, '.ft-copy > *, .ft-stage-wrap'), { autoAlpha: 0, y: 34, stagger: 0.07, scrollTrigger: { trigger: slide, start: 'top 78%' } });
      });
    });
  }, { scope: root, dependencies: [items.length] });

  const goTo = (i: number) => stepTo.current?.(i);

  return (
    <section className="ft" ref={root} aria-label="Featured products" style={shown ? brandVars(shown.brand) : undefined} data-flooded={flooded ? '' : undefined}>
      <SiteHeader total={total} />
      {items.map((product, i) => (
        <Slide key={product.slug} product={product} index={i} active={!pinned || i === current} tally={tally[product.slug]} report={report} />
      ))}
      <nav className="ft-strip pp-mono" aria-label="Jump to a featured product">
        {items.map((product, i) => (
          <button type="button" className="ft-seg pp-mono" key={product.slug} aria-current={i === current} onClick={() => goTo(i)}>
            <b>{pad(i + 1)}</b>{product.name}
          </button>
        ))}
        <button type="button" className="ft-seg ft-seg--all pp-mono" onClick={toAll}>All {total} ↓</button>
      </nav>
    </section>
  );
}
