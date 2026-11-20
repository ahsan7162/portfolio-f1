// The main page: the introduction, the featured products, then the whole catalogue.
import { lazy, startTransition, Suspense, useEffect, useRef, useState } from 'react';
import { products } from '../data';
import { KINDS } from '../types';
import { Catalogue } from './Catalogue';
import { Featured } from './Featured';
import { HeroCar } from './hero/HeroCar';
import '../styles/home.css';

// The footer room is the heaviest drawing on the page: it loads on its own, only when the footer comes near.
const Room = lazy(() => import('./room/Room'));

const words = Object.values(KINDS).map(k => k.plural);

export function Home() {
  return (
    <>
      <main className="home">
        <HeroCar />
        <Featured items={products.filter(p => p.featured)} total={products.length} />
        <Catalogue items={products} />
      </main>
      <footer className="ftr">
        <div className="ftr-marquee pp-display" aria-hidden="true">
          {[0, 1].map(n => (
            <div className="ftr-track" key={n}>{words.flatMap(w => [<span key={w}>{w}</span>, <span key={`${w}-star`}>✳</span>])}</div>
          ))}
        </div>
        <RoomSlot />
        <div className="ftr-base pp-mono">
          <span>Built by Muhammad Ahsan</span>
          <span><a href="/">Portfolio ↗</a></span>
        </div>
      </footer>
    </>
  );
}

/** Holds the room's exact space until it loads, so nothing below it moves. */
function RoomSlot() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    let idle = 0;
    // mounted in idle time, as a transition React can split up, so it never lands in a scroll frame
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      idle = requestIdleCallback(() => startTransition(() => setNear(true)), { timeout: 1500 });
    }, { rootMargin: '900px 0px' });
    io.observe(ref.current!);
    return () => { io.disconnect(); cancelIdleCallback(idle); };
  }, []);
  const shell = <div className="rm"><div className="rm-stage" /><div className="rm-bar" /></div>;
  return <div ref={ref}>{near ? <Suspense fallback={shell}><Room /></Suspense> : shell}</div>;
}
