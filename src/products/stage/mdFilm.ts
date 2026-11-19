// What a playing Markwright scene adds over the product: the Mermaid source typing in while its diagram grows
// a piece per line, and rest(), which puts every film layer back to its CSS state when the visitor takes over.
// Elements in, tweens out: the demo keeps every tween, so a take-over lands it on its end.
import { gsap } from '../motion';

/**
 * The open Mermaid source types in line by line, and with each line the diagram gains what that line brings in
 * (its `data-step`): boxes pop, edges draw from their start. `per` is the time a line takes.
 */
export function grow(root: Element, per = 0.45) {
  const tl = gsap.timeline();
  const lines = [...root.querySelectorAll<HTMLElement>('.mwd-mm-src[data-open] .mwd-mm-line')];
  const svg = root.querySelector('.mwd-mermaid[data-open] .mwd-dg');
  if (!svg) return tl;
  const steps = [...svg.querySelectorAll<SVGElement>('[data-step]')];
  gsap.set(steps.filter((e) => Number(e.dataset.step) > 0), { autoAlpha: 0 });
  gsap.set(lines.slice(1), { clipPath: 'inset(0% 100% 0% 0%)' });
  lines.forEach((line, i) => {
    const at = i * per;
    const n = line.textContent?.length ?? 1;
    if (i) tl.to(line, { clipPath: 'inset(0% 0% 0% 0%)', duration: Math.min(per * 0.8, n * 0.02), ease: `steps(${Math.max(1, n)})`, clearProps: 'clipPath' }, at);
    const now = steps.filter((e) => Number(e.dataset.step) === i);
    if (!i || !now.length) return;
    tl.fromTo(now, { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', stagger: 0.05, clearProps: 'transform' }, at + per * 0.6);
    for (const g of now) {
      for (const path of g.querySelectorAll<SVGPathElement>('.mwd-dg-edge, .mwd-dg-branch')) {
        const len = path.getTotalLength();
        tl.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }, at + per * 0.6);
      }
    }
  });
  return tl;
}

/** Every film layer at its CSS rest, the camera flat: the demo is whole the moment the visitor takes over. */
export function rest(root: Element) {
  const film = root.querySelectorAll('.mwd-cam, .mwd-hand, [data-glow], [data-click], .mwd-dg [data-step], .mwd-mm-line, .mwd-dg path');
  gsap.set(film, { clearProps: 'all' });
}
