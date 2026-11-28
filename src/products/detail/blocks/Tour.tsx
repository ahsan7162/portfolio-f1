// A numbered list of steps beside one screen; the screen slides between steps and eases in on the part the step is about.
import { useEffect, useId, useRef } from 'react';
import { pad } from '../../format';
import { gsap, useGSAP } from '../../motion';
import { PauseButton, HOLD } from './Cases';
import { IconNext, IconPrev } from './icons';
import { MediaView } from './MediaView';
import { useRotate } from './rotate';
import { Label, usePreload, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';
import { bare } from '../../stop';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Tour({ block, product }: BlockProps<'tour'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const zoom = useRef<gsap.core.Timeline | null>(null);
  const prev = useRef(0);
  // The zoom follows the step's clock, so pausing the clock holds the zoom too.
  const r = useRotate(root, { count: block.steps.length, hold: HOLD, onTick: p => { zoom.current?.progress(p); } });
  usePreload(root);

  useGSAP(() => {
    zoom.current = null;
    const el = root.current;
    const was = prev.current;
    prev.current = r.index;
    if (!r.live || !el) return;
    const at = `[data-step="${r.index}"]`;
    const clip = el.querySelector<HTMLElement>(`${at} .bv-tour-clip`);
    const pan = el.querySelector<HTMLElement>(`${at} .bv-tour-pan`);
    if (clip && was !== r.index) gsap.from(clip, { xPercent: 6, opacity: 0, duration: 0.7, clearProps: 'transform,opacity' });
    const body = el.querySelector<HTMLElement>('.bv-tour-body');
    if (body && was !== r.index) gsap.from(body, { y: 10, opacity: 0, duration: 0.5, clearProps: 'transform,opacity' });
    const f = block.steps[r.index]?.focus;
    if (!f || !pan) return;
    // Scale about the point, then slide it toward the middle as far as the picture still covers its frame.
    const s = clamp(f.zoom, 1.2, 1.6);
    const xPercent = 100 * clamp(0.5 - f.x, -(1 - f.x) * (s - 1), f.x * (s - 1));
    const yPercent = 100 * clamp(0.5 - f.y, -(1 - f.y) * (s - 1), f.y * (s - 1));
    gsap.set(pan, { transformOrigin: `${f.x * 100}% ${f.y * 100}%` });
    const away = { scale: 1, xPercent: 0, yPercent: 0 };
    const near = { scale: s, xPercent, yPercent };
    // In from 15% to 33% of the hold, out from 77% to 95%; progress 0.5 is the held close-up.
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
      .fromTo(pan, away, { ...near, duration: 0.18 }, 0.15)
      .fromTo(pan, near, { ...away, duration: 0.18, immediateRender: false }, 0.77)
      .set({}, {}, 1);
    zoom.current = tl;
    // No clock to follow (the reader picked this step): ease in and stay.
    if (!r.rotating) gsap.to(tl, { progress: 0.5, duration: 1.1, ease: 'power2.inOut' });
  }, { scope: root, dependencies: [r.index, r.live], revertOnUpdate: true });

  // The reader took over mid-step: the close-up stops following a clock that is gone, and stays.
  useEffect(() => {
    const z = zoom.current;
    if (r.rotating || !z) return;
    const t = gsap.to(z, { progress: 0.5, duration: 1.1, ease: 'power2.inOut' });
    return () => { t.kill(); };
  }, [r.rotating]);

  return (
    <section className="dt-block dt-sec pp-wrap bv-tour" ref={root} aria-labelledby={id} data-rot-state={r.rotating ? 'run' : 'off'}>
      <Label id={id}>{block.label}</Label>
      {block.head && <h3 className="bv-tour-head pp-lede">{bare(block.head)}</h3>}
      <div className="bv-tour-grid">
        <div className="bv-tour-side">
          <div className="bv-tour-reserve">
            <ol className="bv-tour-list">
              {block.steps.map((s, i) => {
                const on = i === r.index;
                return (
                  <li key={s.title} className="bv-tour-li" data-rot={i} data-on={on || undefined}>
                    <button type="button" className="bv-tour-step" aria-current={on ? 'step' : undefined} onClick={() => r.go(i)}>
                      <span className="bv-tour-n pp-mono">{pad(i + 1)}</span>
                      <span className="bv-tour-t pp-lede">{s.title}</span>
                    </button>
                    {on && (
                      <div className="bv-tour-body">
                        <p>{s.body}</p>
                        <span className="bv-tour-line" aria-hidden="true"><span className="bv-rot-fill" /></span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {/* Invisible copy with every body stacked in one cell: the list is always as tall as its tallest step. */}
            <div className="bv-tour-ghost" aria-hidden="true" inert>
              {block.steps.map(s => (
                <div key={s.title} className="bv-tour-step"><span className="bv-tour-n pp-mono">00</span><span className="bv-tour-t pp-lede">{s.title}</span></div>
              ))}
              <div className="bv-tour-bodies">
                {block.steps.map(s => <div key={s.title} className="bv-tour-body"><p>{s.body}</p><span className="bv-tour-line" /></div>)}
              </div>
            </div>
          </div>
          <div className="bv-rot-bar bv-tour-bar">
            {/* a player's order: back, pause, on */}
            <button type="button" className="bv-rot-btn pp-ib" aria-label="Previous step" data-tip="Previous" onClick={() => r.go('prev')}><IconPrev /></button>
            <PauseButton r={r} />
            <button type="button" className="bv-rot-btn pp-ib" aria-label="Next step" data-tip="Next" onClick={() => r.go('next')}><IconNext /></button>
          </div>
        </div>
        <div className="bv-rot-stack bv-tour-shots">
          {block.steps.map((s, i) => (
            <div key={s.title} className="bv-rot-item bv-tour-shot" data-step={i} data-on={i === r.index || undefined} inert={i !== r.index}>
              <div className="bv-tour-clip">
                <div className="bv-tour-pan"><MediaView media={s.media} product={product} active={i === r.index && r.inView} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
