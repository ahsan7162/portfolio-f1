// One screen or object drawn large and taken apart: its parts numbered in reading order above it. Hovering a part
// previews it, a click pins it (the two are separate, like the hero car's parts); the pinned part's states then
// play one after another in the drawing, and each can be picked. Labels sit over the parts a live screen marks with
// data-part (or an image's `at` boxes), measured from layout, so they never move while you point at them.
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { pad } from '../../format';
import { gsap, reducedMotion } from '../../motion';
import { LiveScreen } from '../../stage/live';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

interface Box { x: number; y: number; w: number; h: number }
/** How long each state shows before the next, while a part is pinned and nobody has picked a state. */
const STATE_MS = 1700;

export function Anatomy({ block, n }: BlockProps<'anatomy'>) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const id = useId();
  const start = Math.max(0, block.parts.findIndex((p) => p.id === block.start));
  const [pinned, setPinned] = useState(start);
  const [hover, setHover] = useState<number | null>(null);
  const [state, setState] = useState(0);
  const [held, setHeld] = useState(false); // a state was picked by hand: stop playing them
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [seen, setSeen] = useState(false);
  const shown = hover ?? pinned;
  const part = block.parts[shown];
  const states = block.parts[pinned].states ?? [];

  useBlockMotion(root, ({ q, qa, enter }) => {
    const el = q('.bv-anat-art');
    if (!el) return;
    gsap.from(el, { autoAlpha: 0, y: 40, duration: 1, scrollTrigger: enter(el) });
    gsap.from(qa('.bv-anat-part'), { autoAlpha: 0, y: -10, stagger: 0.06, duration: 0.6, delay: 0.35, scrollTrigger: enter(el) });
  });
  // The states play only while the block is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setSeen(e[e.length - 1].isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Where each part sits, in the drawing's own pixels: measured once laid out, and again when it resizes.
  useLayoutEffect(() => {
    const el = art.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBoxes(block.parts.map((p) => {
        if (p.at) return { x: p.at.x * r.width, y: p.at.y * r.height, w: p.at.w * r.width, h: p.at.h * r.height };
        const b = el.querySelector(`[data-part="${p.id}"]`)?.getBoundingClientRect();
        return b ? { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height } : { x: 0, y: 0, w: 0, h: 0 };
      }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    void document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [block.parts]);

  // The pinned part's states play in turn while the block is on screen.
  useEffect(() => {
    if (!seen || held || states.length < 2 || reducedMotion()) return;
    const t = setInterval(() => setState((s) => (s + 1) % states.length), STATE_MS);
    return () => clearInterval(t);
  }, [seen, held, states.length]);

  const pin = (i: number) => { setPinned(i); setState(0); setHeld(false); };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? block.parts.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const k = (to + block.parts.length) % block.parts.length;
    pin(k);
    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[k]?.focus();
  };
  const spot = boxes[shown];
  const media = block.media;

  return (
    <section className="dt-block dt-sec pp-wrap bv-anat" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <h3 className="bv-anat-head">{block.head}</h3>}
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <div className="bv-anat-art" ref={art} onPointerLeave={() => setHover(null)}>
        <div className="bv-anat-draw">
          {'live' in media
            ? <LiveScreen name={media.live} alt={media.alt} active part={block.parts[shown].id} state={hover === null ? state : 0} />
            : 'src' in media ? <img src={media.src} alt={media.alt} width={media.width} height={media.height} loading="lazy" decoding="async" /> : null}
        </div>
        {spot && spot.w > 0 && <span className="bv-anat-spot" aria-hidden="true" style={{ left: spot.x - 10, top: spot.y - 10, width: spot.w + 20, height: spot.h + 20 }} />}
        {/* fixed hit zones over the parts: they never move, so pointing never flickers */}
        {boxes.map((b, i) => b.w > 0 && (
          <span key={block.parts[i].id} className="bv-anat-hit" aria-hidden="true" style={{ left: b.x - 6, top: b.y - 14, width: b.w + 12, height: b.h + 28 }}
            onPointerEnter={() => setHover(i)} onClick={() => pin(i)} />
        ))}
        <div className="bv-anat-parts" role="tablist" aria-label={`Parts of ${block.label.toLowerCase()}`}>
          {block.parts.map((p, i) => (
            <button key={p.id} type="button" role="tab" id={`${id}-t${i}`} aria-controls={`${id}-p`} aria-selected={i === pinned} tabIndex={i === pinned ? 0 : -1}
              className="bv-anat-part pp-mono" data-on={i === shown || undefined} style={boxes[i] ? { left: boxes[i].x + boxes[i].w / 2 } : undefined}
              onPointerEnter={() => setHover(i)} onFocus={() => setHover(null)} onClick={() => pin(i)} onKeyDown={(e) => onKey(e, i)}>
              <b>{pad(i + 1)}</b>{p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="bv-anat-info" role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-t${pinned}`} aria-live="polite">
        <div>
          <h3><span className="pp-mono">{pad(shown + 1)}</span>{part.name}</h3>
          <p>{part.body}</p>
        </div>
        {hover === null && states.length > 0 && (
          <div className="bv-anat-states" role="group" aria-label={`${block.parts[pinned].name}: its states`}>
            {states.map((s, j) => (
              <button key={s} type="button" className="pp-mono" aria-pressed={j === state} onClick={() => { setState(j); setHeld(true); }}>{s}</button>
            ))}
          </div>
        )}
      </div>
      <p className="bv-anat-help pp-mono">Point at a part, or pick one · ← → walk them</p>
    </section>
  );
}
