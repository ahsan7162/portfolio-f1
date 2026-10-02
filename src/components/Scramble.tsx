import { useEffect, useRef, useState } from 'react';
import { ensureGsap, gsap } from '@/motion/gsap';
import { isTouch, motionEnabled } from '@/motion/prefs';
import { DUR, EASE } from '@/motion/tokens';

/**
 * Text that scrambles into place with ScrambleTextPlugin: whenever `text`
 * changes (`on="change"`), or when its link or button is hovered (`on="hover"`).
 * Never on load. GSAP owns the text node after mount, so React renders the
 * first value only (that keeps the prerendered markup) and never rewrites it.
 */
export function Scramble({ text, on = 'change', className }: { text: string; on?: 'change' | 'hover'; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [initial] = useState(text);
  const shown = useRef(text);

  const play = (to: string) => {
    const el = ref.current;
    if (!el) return;
    shown.current = to;
    if (!motionEnabled()) { el.textContent = to; return; }
    ensureGsap();
    gsap.to(el, { scrambleText: { text: to, chars: 'upperCase' }, duration: DUR.split, ease: EASE.none, overwrite: true });
  };

  useEffect(() => {
    if (on === 'change' && text !== shown.current) play(text);
  }, [text, on]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const host = ref.current?.closest('a, button');
    if (on !== 'hover' || !host || isTouch()) return;
    const onEnter = () => play(shown.current);
    host.addEventListener('pointerenter', onEnter);
    return () => { host.removeEventListener('pointerenter', onEnter); if (ref.current) gsap.killTweensOf(ref.current); };
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{initial}</span>;
}
