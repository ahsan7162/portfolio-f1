import { useEffect, useRef, useState, type ComponentType } from 'react';

type Props = { markerColor: string };

/**
 * The dotted world map's data (15 KB of dots) stays out of the main bundle and
 * the prerendered HTML; it loads when Contact nears the viewport. The dots are
 * precomputed, so showing it costs one SVG path, not a computation.
 */
export function LazyMap(props: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [Map, setMap] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      import('@/components/WorldMap').then(m => setMap(() => m.WorldMap));
    }, { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={box} className="aspect-[2/1] w-full">{Map && <Map {...props} />}</div>;
}
