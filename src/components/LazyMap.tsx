import { useEffect, useRef, useState, type ComponentType } from 'react';

/** The dotted world map (15 KB of dots), kept out of the main bundle and the prerender: it loads as Contact nears the screen. */
export function LazyMap() {
  const box = useRef<HTMLDivElement>(null);
  const [Map, setMap] = useState<ComponentType | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      // The map is decorative: if its chunk fails to load (offline, a stale deploy), the box stays empty.
      import('@/components/WorldMap').then(m => setMap(() => m.WorldMap)).catch(() => {});
    }, { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={box} className="aspect-[2/1] w-full">{Map && <Map />}</div>;
}
