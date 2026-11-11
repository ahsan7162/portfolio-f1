// A dot that follows the pointer and grows into a labelled disc over anything with data-cursor="…".
import { useEffect, useRef } from 'react';
import { gsap } from './motion';

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    // Close behind the real pointer: a dot that trails reads as the page being slow.
    const x = gsap.quickTo(el, 'x', { duration: 0.16, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.16, ease: 'power3' });
    let shown = '';
    const move = (e: PointerEvent) => {
      x(e.clientX); y(e.clientY);
      el.dataset.on = '';
      const text = (e.target as Element | null)?.closest?.('[data-cursor]')?.getAttribute('data-cursor') ?? '';
      if (text === shown) return;
      shown = text;
      if (text && label.current) label.current.textContent = text;
      el.toggleAttribute('data-label', !!text);
    };
    const out = () => { delete el.dataset.on; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', out);
    return () => { window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', out); };
  }, []);

  return <div className="pp-cursor" ref={dot} aria-hidden="true"><span className="pp-mono" ref={label} /></div>;
}
