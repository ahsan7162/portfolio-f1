// PR Dashboard, playable: clear the three blockers on the stuck pull request and it merges.
import { useEffect, useRef, useState } from 'react';
import { gsap, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import '../styles/pr-demo.css';

const BLOCKERS = [
  { stuck: 'CI failing', done: '✓ CI passing' },
  { stuck: 'Changes requested', done: '✓ Approved' },
  { stuck: '2 unresolved comments', done: '✓ 0 unresolved' },
] as const;
const FRESH = [false, false, false];

export function PrDemo({ active, onTally }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const [cleared, setCleared] = useState<boolean[]>(FRESH);
  const [touched, setTouched] = useState(false);
  const [resets, setResets] = useState(0);
  const left = cleared.filter((c) => !c).length;
  const next = cleared.indexOf(false);
  const merged = left === 0;

  useEffect(() => { onTally?.(left); }, [left, onTally]);

  // Soft pulsing ring on the first blocker until the first click.
  useGSAP(() => {
    if (touched || !active || next < 0 || reducedMotion()) return;
    const hint = root.current?.querySelector(`[data-blocker="${next}"] .prd-chip-hint`) ?? null;
    gsap.fromTo(hint, { scaleX: 1, scaleY: 1, opacity: 0.75 },
      { scaleX: 1.1, scaleY: 1.55, opacity: 0, duration: 1.5, ease: 'sine.out', repeat: -1, repeatDelay: 0.6 });
  }, { scope: root, dependencies: [touched, active, next], revertOnUpdate: true });

  // After a reset has rendered: bring the failing jobs and the blockers back in.
  useGSAP(() => {
    if (!resets || reducedMotion()) return;
    gsap.from('.prd-jobs', { height: 0, opacity: 0, marginTop: 0, duration: 0.55, ease: 'expo.out', clearProps: 'all' });
    gsap.from('.prd-chip', { scale: 0.85, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(2)', clearProps: 'all' });
  }, { scope: root, dependencies: [resets] });

  const { contextSafe } = useGSAP({ scope: root });

  // Handlers find the root through the clicked element: the refs lint can't see that contextSafe runs on click.
  const clear = contextSafe((i: number, from: Element) => {
    if (i < 0 || cleared[i]) return;
    const last = left === 1;
    setTouched(true);
    setCleared((c) => c.map((v, j) => v || j === i));
    const el = from.closest('.prd');
    if (!el || reducedMotion()) return;

    const chip = el.querySelector(`[data-blocker="${i}"]`);
    if (!chip) return;
    // The new class lands on the next render; these tweens bridge to it and then hand back to CSS.
    gsap.timeline()
      .fromTo(chip, { scaleX: 1.09, scaleY: 0.84 }, { scaleX: 1, scaleY: 1, duration: 0.75, ease: 'elastic.out(1, 0.42)', clearProps: 'transform' })
      .fromTo(chip.querySelector('.prd-chip-ring'), { scale: 1, opacity: 0.9 }, { scaleX: 1.22, scaleY: 1.9, opacity: 0, duration: 0.65, ease: 'expo.out', clearProps: 'all' }, 0)
      .fromTo(chip.querySelector('.prd-was'), { yPercent: 0, opacity: 1 }, { yPercent: -80, opacity: 0, duration: 0.3, ease: 'power2.in', clearProps: 'all' }, 0)
      .fromTo(chip.querySelector('.prd-now'), { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, clearProps: 'all' }, 0.12);

    if (i === 0) {
      const jobs = el.querySelector<HTMLElement>('.prd-jobs');
      if (jobs) gsap.fromTo(jobs, { height: jobs.offsetHeight, opacity: 1 }, { height: 0, opacity: 0, marginTop: 0, duration: 0.55, ease: 'expo.inOut', clearProps: 'all' });
    }
    if (last) {
      gsap.fromTo(el.querySelector('.prd-pr--stuck .prd-stripe'), { scaleY: 0.3 }, { scaleY: 1, duration: 0.8, delay: 0.1, clearProps: 'transform' });
      gsap.fromTo(el.querySelector('.prd-fix .prd-now'), { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, delay: 0.15, clearProps: 'all' });
      gsap.fromTo(el.querySelector('.prd-fix .prd-was'), { opacity: 1 }, { opacity: 0, duration: 0.2, clearProps: 'all' });
    }
  });

  const reset = contextSafe((from: Element) => {
    const stuck = from.closest('.prd')?.querySelectorAll('.prd-pr--stuck *, .prd-reset');
    if (stuck) { gsap.killTweensOf(stuck); gsap.set(stuck, { clearProps: 'all' }); }
    setCleared(FRESH);
    setResets((n) => n + 1);
  });

  return (
    <div className="prd" ref={root}>
      <div className={`prd-win${merged ? ' is-merged' : ''}`}>
        <div className="prd-bar">
          <svg className="prd-bar-icon" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="4" cy="3.5" r="1.75" /><circle cx="4" cy="12.5" r="1.75" /><circle cx="12" cy="12.5" r="1.75" />
            <path d="M4 5.25v5.5M12 10.75V7a2.5 2.5 0 0 0-2.5-2.5H7.5" />
          </svg>
          <span>My PRs</span>
          <span className="prd-bar-end">
            {merged && <button type="button" className="prd-reset" onClick={(e) => reset(e.currentTarget)}>Reset</button>}
            <i /><i /><i />
          </span>
        </div>

        <div className="prd-tabs" aria-hidden="true">
          <span className="prd-tab is-on">Open <small>6</small></span>
          <span className="prd-tab">Review requested <small>3</small></span>
          <span className="prd-tab">Reviewed <small>2</small></span>
          <span className="prd-tab">Merged <small>128</small></span>
        </div>

        <div className="prd-repo">acme/<b>payments-api</b></div>

        <div className="prd-list">
          <div className="prd-pr prd-pr--stuck">
            <span className="prd-stripe" />
            <h3 className="prd-title">[PAY-214] Retry failed webhook deliveries with backoff</h3>
            <div className="prd-chips">
              {BLOCKERS.map((b, i) => (
                <button
                  key={b.stuck}
                  type="button"
                  data-blocker={i}
                  className={`prd-chip${cleared[i] ? ' is-done' : ''}`}
                  aria-disabled={cleared[i]}
                  onClick={(e) => clear(i, e.currentTarget)}
                >
                  <span className="prd-chip-hint" aria-hidden="true" />
                  <span className="prd-chip-ring" aria-hidden="true" />
                  <span className="prd-stack">
                    <span className="prd-was" aria-hidden={cleared[i]}>{b.stuck}</span>
                    <span className="prd-now" aria-hidden={!cleared[i]}>{b.done}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className={`prd-jobs${cleared[0] ? ' is-gone' : ''}`} aria-hidden={cleared[0]}>
              <div>✕ test › unit</div>
              <div>✕ ci › lint</div>
            </div>
            <div className="prd-sub">
              <span>#482</span><span className="prd-add">+186</span><span className="prd-del">−42</span><span>updated 26m ago</span>
              <button type="button" className="prd-fix" disabled={merged} onClick={(e) => clear(next, e.currentTarget)}>
                <span className="prd-stack">
                  <span className="prd-was" aria-hidden={merged}>Fix with agent</span>
                  <span className="prd-now" aria-hidden={!merged}>Merged ✓</span>
                </span>
              </button>
            </div>
          </div>

          <div className="prd-pr prd-pr--ok">
            <span className="prd-stripe" />
            <h3 className="prd-title">Add idempotency keys to the refund endpoint</h3>
            <div className="prd-chips"><span className="prd-tag">✓ Approved, ready to merge</span></div>
          </div>

          <div className="prd-pr prd-pr--wait">
            <span className="prd-stripe" />
            <h3 className="prd-title">Show saved cards first in the payment step</h3>
            <div className="prd-chips"><span className="prd-tag">CI running</span><span className="prd-tag">Awaiting review</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
