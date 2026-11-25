// The same content two ways: plain text, then the product's own interface. Each line that names a part flies to
// it, so the reader sees where every fact went; a switch flips it back and forth.
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Toggle } from '@ui-sdk/react/toggle';
import { gsap, reducedMotion, ScrollTrigger } from '../../motion';
import { Shot } from '../../stage/Frames';
import { Label, useBlockMotion, useShowcaseFit, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

const FLY = 0.85;

export function Morph({ block, product, n }: BlockProps<'morph'>) {
  const root = useRef<HTMLElement>(null);
  useShowcaseFit(root, { stage: '.bv-morph-stage', top: '.bv-morph-bar', end: '.bv-morph-stage' });
  const id = useId();
  const [use, setUse] = useState(false);
  const busy = useRef(false);
  const lines = block.from.lines.map((l) => {
    const m = /^\{([\w-]+)\}/.exec(l);
    return { key: m?.[1], text: m ? l.slice(m[0].length) : l };
  });

  /** Each keyed line and the part of the screen it names (never the hidden copy a screen measures itself with). */
  const pairs = () => {
    const el = root.current;
    if (!el) return [];
    return [...el.querySelectorAll<HTMLElement>('.bv-morph-line[data-key]')].map((line) => {
      const part = [...el.querySelectorAll<HTMLElement>(`.bv-morph-screen [data-part="${line.dataset.key}"]`)].find((p) => !p.closest('[inert]'));
      return part ? ([line, part] as const) : null;
    }).filter((p) => p !== null);
  };

  const flip = (to: boolean) => {
    const el = root.current;
    if (!el || busy.current || to === use) return;
    if (reducedMotion()) { setUse(to); return; }
    busy.current = true;
    const [text, screen] = [el.querySelector('.bv-morph-text'), el.querySelector('.bv-morph-screen')];
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(el.querySelectorAll('.bv-morph-line, .bv-morph-screen [data-part], .bv-morph-text, .bv-morph-screen'), { clearProps: 'transform,opacity,visibility' });
        busy.current = false;
        setUse(to);
      },
    });
    const ps = pairs();
    ps.forEach(([line, part], i) => {
      const [a, b] = [line.getBoundingClientRect(), part.getBoundingClientRect()];
      const k = b.width / (part.offsetWidth || 1); // the screen may be scaled to fit its box
      const [dx, dy] = [b.left - a.left, b.top - a.top];
      if (to) {
        tl.fromTo(part, { x: -dx / k, y: -dy / k, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: FLY, ease: 'power3.inOut' }, i * 0.04);
        tl.to(line, { x: dx, y: dy, opacity: 0, duration: FLY, ease: 'power3.inOut' }, i * 0.04);
      } else {
        tl.fromTo(line, { x: dx, y: dy, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: FLY, ease: 'power3.inOut' }, i * 0.04);
        tl.to(part, { x: -dx / k, y: -dy / k, opacity: 0, duration: FLY, ease: 'power3.inOut' }, i * 0.04);
      }
    });
    // what has no partner cross-fades under the flight
    tl.fromTo(to ? screen : text, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, 0.15);
    tl.to(to ? text : screen, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, FLY * 0.55);
  };

  // It changes over once by itself, a beat after it is in view.
  const [due, setDue] = useState(false);
  useBlockMotion(root, ({ q }) => {
    const stage = q('.bv-morph-stage');
    if (!stage) return;
    const st = ScrollTrigger.create({ trigger: stage, start: 'top 62%', once: true, onEnter: () => setDue(true) });
    return () => st.kill();
  });
  const auto = useEffectEvent(() => flip(true));
  useEffect(() => {
    if (!due) return;
    const t = window.setTimeout(auto, 1300);
    return () => clearTimeout(t);
  }, [due]);

  return (
    <section className="dt-block dt-sec pp-wrap bv-morph" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <p className="bv-morph-head pp-lede">{block.head}</p>}
      <div className="bv-morph-bar" role="group" aria-label="Show the reply as">
        <Toggle className="pp-mono" pressed={!use} onPressedChange={() => flip(false)}>{block.from.name}</Toggle>
        <Toggle className="pp-mono" pressed={use} onPressedChange={() => flip(true)}>{block.to.name}</Toggle>
      </div>
      <div className="bv-morph-stage" data-use={use || undefined}>
        <div className="bv-morph-screen" inert={!use} aria-hidden={!use}>
          <Shot media={block.to.media} kind={product.kind} active />
        </div>
        <div className="bv-morph-text" inert={use} aria-hidden={use}>
          {lines.map((l, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- lines of one text, by position
            <p key={i} className="bv-morph-line" data-key={l.key} data-sub={/^\s/.test(l.text) || undefined}>{l.text.trim()}</p>
          ))}
        </div>
      </div>
      {block.note && <p className="bc-note">{block.note}</p>}
    </section>
  );
}
