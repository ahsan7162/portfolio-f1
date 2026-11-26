// A wall of named checks that run in turn. A light passes over each tile, its steps tick, and it stamps: a pass in
// the product's colour with its proof, or a refusal, which is by design and says why. A total lands at the end.
// It runs once as it enters; Run again replays it. With reduced motion the wall is simply finished.
import { useId, useRef } from 'react';
import { gsap, reducedMotion, useGSAP } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

/** A tile's faint lines of "text": widths from its name, so each file looks like itself and never changes. */
function sketch(name: string) {
  let h = 7;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return Array.from({ length: 5 }, (_, i) => 34 + ((h >> i) % 7) * 9 + (i === 0 ? 14 : 0));
}

/** The run: tiles in order, about a quarter of a second each, then the total counts up. */
function run(root: HTMLElement, vars?: gsap.TimelineVars) {
  const tl = gsap.timeline(vars);
  const tiles = [...root.querySelectorAll<HTMLElement>('.bc-check')];
  const per = Math.min(0.28, 3.6 / Math.max(1, tiles.length));
  tiles.forEach((t, i) => {
    const at = i * per;
    const steps = t.querySelectorAll('.bc-check-step');
    tl.fromTo(t, { '--scan': 0 }, { '--scan': 1, duration: per * 1.6, ease: 'none' }, at)
      .fromTo(steps, { autoAlpha: 0.25 }, { autoAlpha: 1, duration: 0.12, stagger: per * 0.4 }, at)
      .fromTo(t.querySelector('.bc-check-stamp'), { autoAlpha: 0, scale: 1.5, rotate: -8 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(2.4)' }, at + per * 1.2);
  });
  const total = root.querySelector<HTMLElement>('.bc-checks-total');
  const num = total?.querySelector<HTMLElement>('[data-count]');
  const end = tiles.length * per + 0.2;
  if (total) tl.fromTo(total, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5 }, end);
  const target = Number(num?.dataset.count);
  if (num && Number.isFinite(target)) {
    const v = { n: 0 };
    tl.fromTo(v, { n: 0 }, { n: target, duration: 0.9, ease: 'power3.out', onUpdate: () => { num.textContent = String(Math.round(v.n)); } }, end);
  }
  return tl;
}

export function Checks({ block }: BlockProps<'checks'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const passed = block.items.filter((i) => i.pass).length;

  useBlockMotion(root, ({ q, enter }) => {
    const wall = q('.bc-checks');
    if (wall && root.current) run(root.current, { scrollTrigger: enter(wall, 'top 75%') });
  });

  const { contextSafe } = useGSAP({ scope: root });
  const again = () => { const el = root.current; if (el && !reducedMotion()) contextSafe(() => run(el))(); };

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      {block.head && <p className="bc-checks-head pp-lede">{block.head}</p>}
      {block.note && <p className="bc-note">{block.note}</p>}
      <ol className="bc-checks" aria-label={`${passed} of ${block.items.length} pass`}>
        {block.items.map((it) => (
          <li key={it.name} className="bc-check" data-pass={it.pass ? '' : undefined}>
            <p className="bc-check-name pp-mono">{it.name}</p>
            {/* oxlint-disable-next-line react/no-array-index-key -- drawn lines, by position */}
            <span className="bc-check-sketch" aria-hidden="true">{sketch(it.name).map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}</span>
            <p className="bc-check-steps pp-mono" aria-hidden="true">{block.steps.map((s) => <span key={s} className="bc-check-step">{s}</span>)}</p>
            <p className="bc-check-stamp">
              <b className="pp-mono">{it.pass ? 'Pass' : 'Refused'}</b>
              <span>{it.detail}</span>
              {it.proof && <code className="pp-mono">{it.proof}</code>}
            </p>
          </li>
        ))}
      </ol>
      <div className="bc-checks-foot">
        {block.total && <p className="bc-checks-total"><b className="pp-display" data-count={block.total.value}>{block.total.value}</b><span className="pp-meta pp-dim">{block.total.label}</span></p>}
        <button type="button" className="bc-checks-again pp-mono" onClick={again}>Run again</button>
      </div>
    </section>
  );
}
