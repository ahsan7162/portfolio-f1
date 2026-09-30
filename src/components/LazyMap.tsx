import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { DottedMapProps } from '@/components/ui/dotted-map';

/**
 * The dotted world map carries a large geo dataset, so it is kept out of the
 * main bundle and the prerendered HTML. It loads when Contact nears the viewport.
 */
export function LazyMap(props: DottedMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const [Map, setMap] = useState<ComponentType<DottedMapProps> | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      import('@/components/ui/dotted-map').then(m => setMap(() => m.DottedMap));
    }, { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={box} className="aspect-[2/1] w-full">{Map && <Map {...props} />}</div>;
}
