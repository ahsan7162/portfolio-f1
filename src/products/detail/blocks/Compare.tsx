// Before and after in one frame, wiped by a handle. Pointer and touch drag anywhere on the frame
// (touch-action: pan-y keeps vertical page scrolling); the handle is a real range input, so arrow
// keys, Page Up/Down and Home/End move it. The wipe is a clip-path driven by --pos.
import { useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { gsap } from '../../motion';
import { MediaView } from './MediaView';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

export function Compare({ block, product, n }: BlockProps<'compare'>) {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const sweep = useRef<gsap.core.Tween | null>(null);
  const dragging = useRef(false);
  const id = useId();
  const [pos, setPos] = useState(50);

  /** Any input from the visitor ends the entry sweep and takes over. */
  const move = (v: number) => {
    const p = Math.round(Math.min(100, Math.max(0, v)));
    // Its trigger too, or a later snap-to-end would undo the visitor's position.
    sweep.current?.scrollTrigger?.kill();
    sweep.current?.kill();
    sweep.current = null;
    frame.current?.style.setProperty('--pos', `${p}%`);
    setPos(p);
  };
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    move(((e.clientX - r.left) / r.width) * 100);
  };

  // Keep the drag when the pointer leaves the frame; a pointer the browser no longer tracks cannot be captured.
  const capture = (e: PointerEvent<HTMLDivElement>) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* drag still works inside the frame */ } };

  useBlockMotion(root, ({ enter }) => {
    const el = frame.current;
    if (!el) return;
    // One sweep on entry, so people see that it moves. It animates the wipe only (clip-path via --pos).
    sweep.current = gsap.fromTo(el, { '--pos': '15%' }, { '--pos': '50%', duration: 0.9, ease: 'power3.inOut', scrollTrigger: enter(el, 'top 80%') });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <div
        className={`bv-cmp bv-cmp--${product.kind}`}
        ref={frame}
        style={{ '--pos': `${pos}%` } as CSSProperties}
        onPointerDown={e => { dragging.current = true; capture(e); fromPointer(e); }}
        onPointerMove={e => { if (dragging.current) fromPointer(e); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <div className="bv-cmp-layer"><MediaView media={block.after} product={product} className="bv-cmp-media" /></div>
        <div className="bv-cmp-layer bv-cmp-layer--before"><MediaView media={block.before} product={product} className="bv-cmp-media" /></div>
        <span className="bv-cmp-tag bv-cmp-tag--before pp-mono" aria-hidden="true">{block.beforeLabel}</span>
        <span className="bv-cmp-tag bv-cmp-tag--after pp-mono" aria-hidden="true">{block.afterLabel}</span>
        <input
          className="bv-cmp-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={pos}
          onChange={e => move(Number(e.target.value))}
          aria-label={`${block.beforeLabel} and ${block.afterLabel}: how much of ${block.beforeLabel} shows`}
          aria-valuetext={`${pos}% ${block.beforeLabel}, ${100 - pos}% ${block.afterLabel}`}
        />
        <span className="bv-cmp-handle" aria-hidden="true"><span className="bv-cmp-knob" /></span>
      </div>
      {block.caption && <p className="bv-cmp-cap pp-mono pp-dim">{block.caption}</p>}
    </section>
  );
}
