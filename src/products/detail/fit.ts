// Fits a line of display type to its box: the font-size is set so the text fills the width exactly.
import { useLayoutEffect, type RefObject } from 'react';
import { ScrollTrigger } from '../motion';

/**
 * `ref` is the box (block, full width); its first child is the text, an inline-block that never wraps.
 * Width scales linearly with font-size, so one measurement at 100px gives the size that fills the box.
 * `maxVh` caps the size at that share of the viewport's height.
 */
export function useFit(ref: RefObject<HTMLElement | null>, maxVh = Infinity) {
  useLayoutEffect(() => {
    const box = ref.current;
    const text = box?.firstElementChild;
    if (!box || !text) return;
    let last = 0;
    const fit = (force = false) => {
      const w = box.clientWidth;
      // Only width matters: the new size changes the box's height, which must not re-trigger a fit.
      if (!w || (w === last && !force)) return;
      last = w;
      box.style.fontSize = '100px';
      // A short name would fill the width at a size taller than the screen: cap it by the viewport's height.
      const size = Math.min((100 * w) / text.getBoundingClientRect().width, (window.innerHeight * maxVh) / 100);
      box.style.fontSize = `${Math.floor(size * 10) / 10}px`;
    };
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);
    let live = true;
    // The display font changes the width, and the new height moves every trigger below.
    void document.fonts.ready.then(() => {
      if (!live) return;
      fit(true);
      ScrollTrigger.refresh();
    });
    return () => { live = false; ro.disconnect(); };
  }, [ref, maxVh]);
}
