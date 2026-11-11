// The shell: picks the page from the URL, runs smooth scrolling, and wipes a curtain between pages.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { markCovered, markRevealed } from './arrive';
import { brandVars } from './brand';
import { Cursor } from './Cursor';
import { products } from './data';
import { homeMeta, productMeta } from './seo';
import { Detail } from './detail/Detail';
import { Home } from './home/Home';
import { gsap, reducedMotion, ScrollTrigger } from './motion';
import { onLeave, parseRoute, usePath } from './router';
import { focusOn, scrollToEl, scrollToY, setLenis, wheelGate } from './scroll';
import './styles/shell.css';

/** The curtain takes a deep shade of the product it opens onto (shell.css); the list's curtain stays dark neutral. */
function tint(curtain: HTMLElement | null, brand?: string) {
  if (!curtain) return;
  curtain.toggleAttribute('data-branded', !!brand);
  if (brand) curtain.style.setProperty('--brand', brand);
}

/** Where each page was scrolled to when it was left, so Back returns there. */
const scrollAt = new Map<string, number>();

export function App() {
  const path = usePath();
  const route = parseRoute(path);
  const product = route.page === 'detail' ? products.find(p => p.slug === route.slug) : undefined;
  const curtain = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  /** The curtain is covering the page: on first load, and after a link's leaving wipe. */
  const covered = useRef(true);
  /** False until the first page has been shown: focus is only moved on a change of page, never on load. */
  const arrived = useRef(false);
  /** The page the visit starts on: its name and colour go on the first curtain. */
  const [first] = useState(() => ({ name: product?.name ?? 'Products', brand: product?.brand }));

  useEffect(() => {
    if (reducedMotion()) return;
    // A light touch: enough to take the steps out of a mouse wheel without the page trailing behind the hand.
    const lenis = new Lenis({ lerp: 0.13, virtualScroll: wheelGate });
    setLenis(lenis);
    lenis.on('scroll', () => ScrollTrigger.update());
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); lenis.destroy(); setLenis(null); };
  }, []);

  // Leaving by a link: the curtain rises over the page, carrying the name of where it goes.
  useEffect(() => {
    onLeave(to => new Promise(resolve => {
      scrollAt.set(window.location.pathname, window.scrollY);
      const next = parseRoute(to.split('#')[0]);
      const target = next.page === 'detail' ? products.find(p => p.slug === next.slug) : undefined;
      if (label.current) label.current.textContent = target?.name ?? 'All products';
      tint(curtain.current, target?.brand);
      covered.current = true;
      markCovered();
      gsap.fromTo(curtain.current, { yPercent: 100 }, { yPercent: 0, duration: reducedMotion() ? 0 : 0.45, ease: 'power3.inOut', onComplete: resolve });
    }));
    return () => onLeave(null);
  }, []);

  // Arriving: a link lands at the top and the curtain lifts; Back and Forward return to where you were.
  useLayoutEffect(() => {
    document.title = (product ? productMeta(product) : homeMeta).title;
    scrollToY(covered.current ? 0 : scrollAt.get(path) ?? 0, true);
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    if (!covered.current) { markRevealed(); return () => cancelAnimationFrame(refresh); }
    let lift: gsap.core.Tween | undefined;
    let cancelled = false;
    // Wait for the display font (the first thing seen is a name set huge), then for the new page's
    // first two frames, so its layout work is done before the curtain starts to move.
    const settled = new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    void Promise.all([Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]), settled]).then(() => {
      if (cancelled) return;
      covered.current = false;
      ScrollTrigger.refresh();
      // The page's own entrance starts with the lift, so the two read as one movement.
      markRevealed();
      // A new page: keyboard and screen-reader focus starts at its heading, as it would after a real page load.
      if (arrived.current) focusOn(document.querySelector('h1'));
      arrived.current = true;
      // A link to a place on the page (#film): be there before the curtain lifts. The blocks have just
      // set up their pins, so measure again first.
      if (window.location.hash) {
        ScrollTrigger.refresh();
        scrollToEl(document.getElementById(window.location.hash.slice(1)), 24, true);
      }
      lift = gsap.to(curtain.current, { yPercent: -100, duration: reducedMotion() ? 0 : 0.55, ease: 'power3.inOut' });
    });
    return () => { cancelled = true; cancelAnimationFrame(refresh); lift?.kill(); };
  }, [path, product]);

  return (
    <>
      <a className="pp-skip pp-mono" href="#content" onClick={e => { e.preventDefault(); scrollToEl(document.querySelector('h1'), 24, true); }}>Skip to content</a>
      {product ? <Detail key={product.slug} product={product} /> : <Home />}
      <div className="pp-curtain" ref={curtain} aria-hidden="true" data-branded={first.brand ? '' : undefined} style={first.brand ? brandVars(first.brand) : undefined}><span className="pp-display" ref={label}>{first.name}</span></div>
      <Cursor />
      <div className="pp-grain" aria-hidden="true" />
    </>
  );
}
