// Where a product's requests go, and where they don't: its stops set large along one line, and runs (tabs) that send
// a light along their hops while each hop's payload types in under the line. The runs rotate like the other tabbed
// blocks. The last stop can be `never`, struck through: the place nothing is sent. With reduced motion every hop of
// the run shows at once, and nothing moves.
import { useId, useRef, type CSSProperties } from 'react';
import { gsap, reducedMotion, useGSAP } from '../../motion';
import { PauseButton, RotRoot, RotTabs } from './Cases';
import { useRotate } from './rotate';
import { Label, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

/** How long a run stays before the next: its hops take about a second each, then it holds to be read. */
const HOLD_RUN = 7;
const HOP = 0.9;

export function Route({ block, n }: BlockProps<'route'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const r = useRotate(root, { count: block.runs.length, hold: HOLD_RUN });
  const run = block.runs[r.index];
  const lit = new Set(run.hops.flatMap((h) => [h.from, h.to]));

  useGSAP(() => {
    const el = root.current;
    const line = el?.querySelector<HTMLElement>('.bv-route-stops');
    const light = el?.querySelector<HTMLElement>('.bv-route-light');
    if (!el || !line || !light || !r.live || reducedMotion()) return;
    const dot = (i: number) => {
      const d = line.querySelector(`[data-stop="${i}"] .bv-route-dot`)?.getBoundingClientRect();
      const b = line.getBoundingClientRect();
      return d ? { x: d.left + d.width / 2 - b.left, y: d.top + d.height / 2 - b.top } : { x: 0, y: 0 };
    };
    const tl = gsap.timeline();
    const says = el.querySelectorAll<HTMLElement>('.bv-route-hop');
    gsap.set(says, { autoAlpha: 0 });
    gsap.set(light, { autoAlpha: 0 });
    run.hops.forEach((h, i) => {
      const at = 0.25 + i * (HOP + 0.25);
      const [a, b] = [dot(h.from), dot(h.to)];
      const flat = Math.abs(a.y - b.y) < 4;
      const back = flat ? b.x < a.x : b.y < a.y;
      // the light is the segment between the two stops, growing from the one it leaves
      const box = flat ? { left: Math.min(a.x, b.x), top: a.y - 1.5, width: Math.abs(b.x - a.x), height: 3 } : { left: a.x - 1.5, top: Math.min(a.y, b.y), width: 3, height: Math.abs(b.y - a.y) };
      const origin = flat ? (back ? '100% 50%' : '0% 50%') : (back ? '50% 100%' : '50% 0%');
      tl.set(light, { ...box, transformOrigin: origin, scaleX: flat ? 0 : 1, scaleY: flat ? 1 : 0, '--deg': `${flat ? (back ? 270 : 90) : back ? 0 : 180}deg`, autoAlpha: 1 }, at)
        .to(light, { ...(flat ? { scaleX: 1 } : { scaleY: 1 }), duration: HOP * 0.6, ease: 'power3.inOut' }, at)
        .to(light, { autoAlpha: 0, duration: HOP * 0.35 }, at + HOP * 0.65)
        .fromTo(line.querySelector(`[data-stop="${h.to}"] .bv-route-dot`), { scale: 1.9 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, at + HOP * 0.55);
      const hop = says[i];
      if (!hop) return;
      const text = hop.querySelector<HTMLElement>('.bv-route-says');
      const len = text?.textContent?.length ?? 1;
      tl.to(hop, { autoAlpha: 1, duration: 0.2 }, at + HOP * 0.4);
      if (text) tl.fromTo(text, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: Math.min(1.1, len * 0.012), ease: `steps(${Math.max(1, Math.min(60, len))})`, clearProps: 'clipPath' }, at + HOP * 0.45);
    });
  }, { scope: root, dependencies: [r.index, r.live], revertOnUpdate: true });

  return (
    <RotRoot r={r} keep root={root} className="dt-block dt-sec pp-wrap bv-route" aria-labelledby={id} data-rot-state={r.rotating ? 'run' : 'off'}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <h3 className="bv-route-head pp-lede">{block.head}</h3>}
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <div className="bv-rot-bar bv-route-bar">
        <RotTabs tabs={block.runs.map((x) => x.name)} r={r} id={id} keep controls={`${id}-run`} />
        <div className="bv-rot-slot"><PauseButton r={r} /></div>
      </div>
      <div className="bv-route-stops" style={{ '--stops': block.stops.length + (block.never ? 1 : 0) } as CSSProperties}>
        {block.stops.map((s, i) => (
          <div key={s.name} className="bv-route-stop" data-stop={i} data-lit={lit.has(i) || undefined}>
            <span className="bv-route-dot" aria-hidden="true" />
            <h4>{s.name}</h4>
            <p className="bv-route-where pp-mono">{s.where}</p>
            {s.holds && <ul className="bv-route-holds">{s.holds.map((h) => <li key={h}>{h}</li>)}</ul>}
          </div>
        ))}
        {block.never && (
          <div className="bv-route-stop" data-never="">
            <span className="bv-route-dot" aria-hidden="true" />
            <h4><s>{block.never}</s></h4>
            <p className="bv-route-where pp-mono">Never</p>
          </div>
        )}
        <span className="bv-route-light" aria-hidden="true" />
      </div>
      <ol className="bv-route-hops" id={`${id}-run`} role="tabpanel" aria-labelledby={`${id}-t${r.index}`} key={r.index}>
        {run.hops.map((h) => (
          <li key={`${h.from}-${h.to}-${h.says}`} className="bv-route-hop">
            <span className="bv-route-way pp-mono">{block.stops[h.from].name} <i aria-hidden="true">→</i><span className="pp-sr">to</span> {block.stops[h.to].name}</span>
            <span className="bv-route-says">{h.says}</span>
          </li>
        ))}
      </ol>
    </RotRoot>
  );
}
