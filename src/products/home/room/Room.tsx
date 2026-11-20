// The footer room: my day on a loop. Loaded on its own, when the footer comes near (Home.tsx).
import { useEffect, useRef, useState } from 'react';
import { onReveal } from '../../arrive';
import { gsap, reducedMotion } from '../../motion';
import { ACTS, buildLoop, initialState, makeRender, nextMark, type Act } from './day';
import { Scene } from './Scene';
import '../../styles/room.css';

/** The things in the room you can click to skip to their part of the day, in the drawing's units: x, y, width, height. */
const SPOTS: { act: Act; box: [number, number, number, number] }[] = [
  { act: 'sleep', box: [50, 400, 395, 165] },
  { act: 'eat', box: [575, 380, 270, 185] },
  { act: 'code', box: [850, 280, 268, 285] },
  { act: 'play', box: [1118, 436, 66, 129] },
  { act: 'watch', box: [1244, 386, 212, 179] },
  { act: 'watch', box: [1462, 286, 128, 96] },
  { act: 'play', box: [1460, 474, 132, 91] },
];
const NAMES = Object.fromEntries(ACTS.map(a => [a.id, a.name])) as Record<Act, string>;
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

export default function Room() {
  const root = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLTimeElement>(null);
  const doing = useRef<HTMLSpanElement>(null);
  const jumpTo = useRef<(act: Act) => void>(() => {});
  const toggle = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // The drawing mounts hidden; the timeline is built and the room posed in the next idle moment,
    // so the mount and the setup never share one frame.
    let stop = () => {};
    const idle = requestIdleCallback(() => { stop = setUp(root.current!, { time: time.current!, doing: doing.current!, jumpTo, toggle, setPaused }); }, { timeout: 600 });
    return () => { cancelIdleCallback(idle); stop(); };
  }, []);

  return (
    <div className="rm" ref={root}>
      <figure className="rm-stage">
        {SPOTS.map(({ act, box: [x, y, w, h] }) => (
          // Pointer only: the buttons in the bar below are the same skips for keyboards and screen readers.
          <button
            key={`${act}-${x}`} type="button" className="rm-spot" tabIndex={-1} aria-hidden="true" data-cursor={NAMES[act]}
            style={{ left: pct(x / 1600), top: pct((y - 120) / 460), width: pct(w / 1600), height: pct(h / 460) }}
            onClick={() => jumpTo.current(act)}
          />
        ))}
        <Scene />
        <figcaption className="pp-sr">
          A drawing of my room, on a loop: I sleep, eat biryani, code, watch Netflix and play a game, a different one each night, while my cat keeps its own day around me.
        </figcaption>
      </figure>
      <div className="rm-bar pp-mono">
        <p className="rm-now"><time ref={time}>01:30</time><span ref={doing}>Asleep</span></p>
        <ul className="rm-ctrl" aria-label="Skip to a part of the day">
          {ACTS.map(a => (
            <li key={a.id}><button type="button" data-act={a.id} aria-current="false" onClick={() => jumpTo.current(a.id)}>{a.name}</button></li>
          ))}
          <li><button type="button" className="rm-pause" onClick={() => toggle.current()}>{paused ? 'Play' : 'Pause'}</button></li>
        </ul>
      </div>
    </div>
  );
}

type Handles = { time: HTMLTimeElement; doing: HTMLSpanElement; jumpTo: { current: (act: Act) => void }; toggle: { current: () => void }; setPaused: (on: boolean) => void };

/** Builds the day, poses the room and starts watching for when it should play. Returns the clean-up. */
function setUp(el: HTMLDivElement, { time, doing, jumpTo, toggle, setPaused }: Handles) {
  const svg = el.querySelector('svg')!;
  const S = initialState();
  const loop = buildLoop(S);
  const narrow = { on: false };
  const render = makeRender(svg, S, loop, {
    root: el, time, doing, narrow,
    acts: Array.from(el.querySelectorAll<HTMLElement>('[data-act]')),
  });
  const { tl } = loop;
  tl.eventCallback('onUpdate', render);
  const still = reducedMotion();
  let seen = false, revealed = false, stopped = false, skipping: gsap.core.Tween | null = null;
  const run = () => { if (skipping) return; if (seen && revealed && !stopped && !still) tl.play(); else tl.pause(); };

  // Reduced motion: the room holds one moment (mid-morning at the desk) and a skip jumps straight to its part.
  tl.totalTime(still ? nextMark(loop, 'code', 0) + 2.5 : 0);
  render();
  el.dataset.ready = '';

  jumpTo.current = act => {
    const at = nextMark(loop, act, tl.totalTime());
    skipping?.kill();
    if (still) { tl.totalTime(at + 2.5); render(); return; }
    tl.pause();
    // the day fast-forwards to it, everything in the room moving at speed
    skipping = gsap.to(tl, {
      totalTime: at, duration: Math.min(2.4, Math.max(0.9, (at - tl.totalTime()) / 25)), ease: 'power2.inOut',
      onComplete: () => { skipping = null; run(); },
    });
  };
  toggle.current = () => { stopped = !stopped; setPaused(stopped); run(); };

  const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); });
  io.observe(el);
  const cancel = onReveal(() => { revealed = true; run(); });
  const ro = new ResizeObserver(([e]) => { narrow.on = e.contentRect.width < 700; render(); });
  ro.observe(el);

  // the cat watches the pointer, and answers a click
  const watch = (e: PointerEvent) => {
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    S.px = p.x; S.py = p.y;
  };
  const cat = svg.querySelector('[data-r="cat"]')!;
  const meow = () => {
    gsap.timeline({ onUpdate: render })
      .fromTo(S, { hop: 0 }, { hop: 1, duration: 0.45, ease: 'power1.inOut' })
      .to(S, { meow: 1, duration: 0.2 }, 0)
      .to(S, { meow: 0, duration: 0.4 }, 1.3);
  };
  el.addEventListener('pointermove', watch, { passive: true });
  cat.addEventListener('click', meow);

  return () => {
    io.disconnect(); ro.disconnect(); cancel();
    el.removeEventListener('pointermove', watch);
    cat.removeEventListener('click', meow);
    skipping?.kill(); tl.kill(); gsap.killTweensOf(S);
  };
}
