import { useEffect, useState, type RefObject } from 'react';

/** True while the element is on (or near) the screen. Used to pause looping animations. */
export function useOnScreen(ref: RefObject<Element | null>, rootMargin = '100px') {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return on;
}
