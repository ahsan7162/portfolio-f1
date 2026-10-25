import type { SimpleIcon } from 'simple-icons';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { isTouch } from '@/motion/prefs';
import { scrollState } from '@/motion/SmoothScroll';
import { EASE } from '@/motion/tokens';
import type { MotionCtx } from '@/motion/useSectionMotion';

/**
 * The second, dimmer row runs the other way. It is motion-only decoration, so it is built
 * here rather than prerendered: smaller, offset, reusing the first row's paths (<use>).
 */
function reverseRow(row: HTMLElement, logos: SimpleIcon[]) {
  const row2 = document.createElement('div');
  row2.setAttribute('aria-hidden', 'true');
  row2.className = 'mt-6 flex w-max will-change-transform';
  const order = [...logos.slice(7), ...logos.slice(0, 7)];
  row2.innerHTML = [0, 1].map(() => `<div class="flex shrink-0">${order.map(l =>
    `<span class="mx-7 inline-flex items-center text-fg/30 md:mx-10"><svg viewBox="0 0 24 24" class="size-6 fill-current md:size-7"><use href="#logo-${l.slug}"/></svg></span>`).join('')}</div>`).join('');
  row.after(row2);
  return row2;
}

/**
 * Centre emphasis (mouse and trackpad): logos near the middle of the screen grow and
 * brighten. Positions come from the loop's progress and each logo's offset, measured on
 * refresh, so no layout is read per frame; only changed values are written.
 */
function centreEmphasis(row: HTMLElement, logos: HTMLElement[]) {
  const touch = isTouch();
  let offs: number[] = [], half = 0, left = 0;
  const shiftOf = () => ((gsap.getProperty(row, 'xPercent') as number) / 100) * half * 2;
  // A logo scales about its centre, so its centre reads the same at any emphasis: no reset first.
  const measure = () => {
    const r = row.getBoundingClientRect();
    half = row.offsetWidth / 2;
    left = r.left - shiftOf();
    offs = logos.map(l => { const b = l.getBoundingClientRect(); return b.left - r.left + b.width / 2; });
  };
  // quickSetter takes real properties only (not the `scale` shorthand).
  const sx = logos.map(l => gsap.quickSetter(l, 'scaleX') as (v: number) => void);
  const sy = logos.map(l => gsap.quickSetter(l, 'scaleY') as (v: number) => void);
  const alpha = logos.map(l => gsap.quickSetter(l, 'opacity') as (v: number) => void);
  const last = logos.map(() => 0);
  const emphasise = () => {
    if (touch || !half) return;
    const shift = shiftOf(), mid = innerWidth / 2, reach = innerWidth * 0.28;
    offs.forEach((o, i) => {
      const x = left + o + shift;
      const k = Math.max(0, 1 - Math.abs(x - mid) / reach), e = Math.round(k * k * (3 - 2 * k) * 100) / 100;
      if (e === last[i]) return;
      last[i] = e;
      sx[i](1 + 0.15 * e); sy[i](1 + 0.15 * e);
      alpha[i](0.8 + 0.2 * e);
    });
  };
  return { measure, emphasise };
}

/**
 * The logo marquee only moves while you scroll, at the scroll's speed and direction, then
 * coasts to a stop: like a car, it only moves while racing. One ticker function eases
 * toward Lenis's (already smooth) velocity every frame and moves the paused loops
 * directly, so the speed glides instead of stepping, and it only runs while the bar is on
 * screen.
 */
export function logoMarquee({ q, qa, onRevert }: MotionCtx, logos: SimpleIcon[]) {
  const row = q('[data-marquee]')!;
  const row2 = reverseRow(row, logos);
  onRevert(() => row2.remove());
  const loop = gsap.to(row, { xPercent: -50, ease: EASE.none, duration: 40, repeat: -1, paused: true });
  const loop2 = gsap.to(row2, { xPercent: -50, ease: EASE.none, duration: 40, repeat: -1, paused: true });
  loop.totalTime(loop.duration() * 1000); // far from 0, so it can run backwards too
  loop2.totalTime(loop2.duration() * 1000 + 13);

  const { measure, emphasise } = centreEmphasis(row, qa('[data-logo]'));
  measure();
  let speed = 0;
  const tick = () => {
    const r = gsap.ticker.deltaRatio(60);
    const target = gsap.utils.clamp(-8, 8, scrollState.velocity * 0.25);
    speed += (target - speed) * (1 - Math.pow(0.92, r)); // ~1 s coast at any frame rate
    if (Math.abs(speed) < 0.002 && target === 0) speed = 0;
    if (!speed) return;
    const dt = (r / 60) * speed;
    loop.totalTime(loop.totalTime() + dt);
    loop2.totalTime(loop2.totalTime() - dt * 0.6);
    emphasise();
  };
  ScrollTrigger.create({
    trigger: q('[data-marqueebox]')!, start: 'top bottom', end: 'bottom top',
    onRefresh: () => { measure(); emphasise(); },
    onToggle: self => { if (self.isActive) gsap.ticker.add(tick); else { gsap.ticker.remove(tick); speed = 0; } },
  });
  onRevert(() => gsap.ticker.remove(tick));
}
