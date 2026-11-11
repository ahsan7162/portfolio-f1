// Jira Board, playable: J/K move the focus, S (or Enter, or the status control) moves the ticket on, drag drops it in a group.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Draggable, Flip, gsap, reducedMotion, useGSAP } from '../motion';
import type { DemoProps } from '../types';
import '../styles/jira-demo.css';

type Status = 'progress' | 'review' | 'todo';
type Cap = 'j' | 'k' | 's';
interface Ticket { key: string; title: string; high?: boolean; age: string; status: Status }

const GROUPS: { id: Status; label: string }[] = [
  { id: 'progress', label: 'In Progress' },
  { id: 'review', label: 'In Review' },
  { id: 'todo', label: 'To Do' },
];
const LABEL: Record<Status, string> = { progress: 'In Progress', review: 'In Review', todo: 'To Do' };
const NEXT: Record<Status, Status> = { progress: 'review', review: 'todo', todo: 'progress' };

const START: Ticket[] = [
  { key: 'ACME-124', title: 'Promo code field clears when the address changes', high: true, age: '35m', status: 'progress' },
  { key: 'ACME-142', title: 'Welcome screen with three setup steps', age: '1h', status: 'progress' },
  { key: 'ACME-207', title: 'Flaky end-to-end test for sign-in', age: '20h', status: 'progress' },
  { key: 'ACME-121', title: 'Show the order summary beside the payment form', high: true, age: '2h', status: 'review' },
  { key: 'ACME-149', title: 'Review the copy in onboarding emails', age: '24h', status: 'review' },
  { key: 'ACME-147', title: 'Skip button hidden on small Android screens', high: true, age: '4h', status: 'todo' },
  { key: 'ACME-128', title: 'Track checkout drop-off by step', age: '2d', status: 'todo' },
  { key: 'ACME-112', title: 'Let customers save a card at checkout', high: true, age: '5d', status: 'todo' },
];

/** Everything that moves when a ticket changes group. */
const FLIP = '.jrd-row, .jrd-head, .jrd-card, .jrd-empty';
const CAPS: { id: Cap; hint: string }[] = [
  { id: 'j', hint: 'Next ticket' },
  { id: 'k', hint: 'Previous ticket' },
  { id: 's', hint: 'Move to the next status' },
];

export function JiraDemo({ active, onTally }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const [tickets, setTickets] = useState(START);
  const [focusKey, setFocusKey] = useState('ACME-142');
  // Flip state is read before the React update and played after it, in the layout effect.
  const flipState = useRef<Flip.FlipState | null>(null);
  const moved = useRef<string | null>(null);
  const refocus = useRef(false);
  const { contextSafe } = useGSAP({ scope: root });

  const inGroup = (s: Status) => tickets.filter((t) => t.status === s);
  const order = GROUPS.flatMap((g) => inGroup(g.id)).map((t) => t.key);
  const inProgress = inGroup('progress').length;

  useEffect(() => { onTally?.(inProgress); }, [inProgress, onTally]);

  const hitOf = (key: string) => root.current?.querySelector<HTMLButtonElement>(`[data-flip-id="${key}"] .jrd-hit`);
  const rowHasDomFocus = () => !!root.current && !!document.activeElement?.closest('.jrd-row') && root.current.contains(document.activeElement);

  const capture = (key: string) => {
    moved.current = key;
    refocus.current = rowHasDomFocus();
    if (root.current && !reducedMotion()) flipState.current = Flip.getState(gsap.utils.toArray(FLIP, root.current));
  };
  const commit = (key: string, to: Status) => setTickets((ts) => {
    const t = ts.find((x) => x.key === key);
    if (!t || t.status === to) return ts;
    return [...ts.filter((x) => x.key !== key), { ...t, status: to }];
  });
  const advance = (key: string) => {
    const t = tickets.find((x) => x.key === key);
    if (!t) return;
    capture(key);
    setFocusKey(key);
    commit(key, NEXT[t.status]);
  };
  const step = (d: number) => {
    const i = order.indexOf(focusKey);
    const next = order[(i + d + order.length) % order.length];
    setFocusKey(next);
    if (rowHasDomFocus()) hitOf(next)?.focus({ preventScroll: true });
  };

  const flash = (cap: Cap) => {
    const el = root.current?.querySelector<HTMLElement>(`[data-cap="${cap}"]`);
    if (!el) return;
    el.setAttribute('data-hit', '');
    contextSafe(() => gsap.delayedCall(0.18, () => el.removeAttribute('data-hit')))();
  };
  const press = (cap: Cap) => {
    flash(cap);
    if (cap === 'j') step(1);
    else if (cap === 'k') step(-1);
    else advance(focusKey);
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && (t.isContentEditable || t.closest('input, textarea, select, [contenteditable]'))) return;
      const k = e.key.toLowerCase();
      if (k === 'enter') {
        // Enter only belongs to the demo when focus is in it (or nowhere); a keycap keeps its own Enter.
        const ours = !t || t === document.body || (!!root.current?.contains(t) && !t.closest('[data-cap]'));
        if (!ours) return;
        e.preventDefault();
        press('s');
      } else if (k === 'j' || k === 'k' || k === 's') {
        e.preventDefault();
        press(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Runs after every render; the refs say whether a move is waiting to be played.
  useLayoutEffect(() => {
    const key = moved.current;
    moved.current = null;
    if (key && refocus.current) hitOf(key)?.focus({ preventScroll: true });
    refocus.current = false;
    const state = flipState.current;
    flipState.current = null;
    const el = root.current;
    if (!state || !el) return;
    contextSafe(() => {
      const row = key ? el.querySelector<HTMLElement>(`[data-flip-id="${key}"]`) : null;
      // the travelling row and its new card ride above the others
      const lift = row ? [row, row.closest('.jrd-card')].filter((n) => n !== null) : [];
      gsap.set(lift, { zIndex: 3 });
      Flip.from(state, {
        targets: gsap.utils.toArray(FLIP, el),
        nested: true,
        duration: 0.6,
        ease: 'power3.inOut',
        onComplete: () => { gsap.set(lift, { clearProps: 'zIndex' }); },
      });
    })();
  });

  // Rows remount when they change group, so the Draggables are rebuilt with the list.
  useGSAP(() => {
    const el = root.current;
    // shortcut: no drag on touch screens (it would block page scroll); tap, the status control and the keycaps cover them.
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const groups = gsap.utils.toArray<HTMLElement>('.jrd-grp', el);
    for (const row of gsap.utils.toArray<HTMLElement>('.jrd-row', el)) {
      const key = row.dataset.flipId ?? '';
      const own = row.dataset.status;
      const card = row.closest<HTMLElement>('.jrd-card');
      let over: HTMLElement | null = null;
      const slot = (g: HTMLElement | null) => g?.querySelector('.jrd-slot');
      const setOver = (g: HTMLElement | null) => {
        if (g === over) return;
        slot(over)?.removeAttribute('data-on');
        over = g;
        slot(over)?.setAttribute('data-on', '');
        drag.update(false, true); // the slot shifts the layout; keep the row under the pointer
      };
      const unlift = () => {
        row.removeAttribute('data-lifted');
        if (card) gsap.set(card, { clearProps: 'zIndex' });
      };
      const [drag] = Draggable.create(row, {
        type: 'x,y',
        minimumMovement: 6,
        dragClickables: true,
        zIndexBoost: false,
        onDragStart() {
          setFocusKey(key);
          row.setAttribute('data-lifted', '');
          if (card) gsap.set(card, { zIndex: 4 });
          if (!reducedMotion()) gsap.to(row, { rotation: 1.6, scale: 1.02, duration: 0.25, ease: 'power2.out' });
        },
        onDrag() {
          setOver(groups.find((g) => g.dataset.status !== own && drag.hitTest(g, '50%')) ?? null);
        },
        onDragEnd() {
          const to = over?.dataset.status as Status | undefined;
          if (to) {
            capture(key);
            slot(over)?.removeAttribute('data-on');
            over = null;
            unlift();
            commit(key, to);
            return;
          }
          gsap.to(row, { x: 0, y: 0, rotation: 0, scale: 1, duration: reducedMotion() ? 0 : 0.7, ease: 'elastic.out(1, 0.75)', onComplete: unlift });
        },
      });
    }
  }, { scope: root, dependencies: [tickets], revertOnUpdate: true });

  return (
    <div className="jrd" ref={root}>
      <div className="jrd-win">
        <div className="jrd-bar">
          <span className="jrd-org">acme-software <span aria-hidden="true">▾</span></span>
          <span className="jrd-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
        <div className="jrd-tabs" aria-hidden="true">
          <span className="jrd-tab is-on">Open <small>{tickets.length}</small></span>
          <span className="jrd-tab">Done</span>
          {GROUPS.map((g) => <span key={g.id} className="jrd-tab">{g.label} <small>{inGroup(g.id).length}</small></span>)}
        </div>
        {GROUPS.map((g) => {
          const rows = inGroup(g.id);
          return (
            <section key={g.id} className="jrd-grp" data-status={g.id} aria-label={`${g.label}, ${rows.length}`}>
              <h3 className="jrd-head" data-flip-id={`head-${g.id}`}>
                <i className="jrd-dot" data-status={g.id} />{g.label} <small>{rows.length}</small>
              </h3>
              <ul className="jrd-card" data-flip-id={`card-${g.id}`}>
                {rows.length === 0 && <li className="jrd-empty" data-flip-id={`empty-${g.id}`}>Nothing here</li>}
                {rows.map((t) => (
                  <li key={t.key} className={`jrd-row${t.key === focusKey ? ' is-focus' : ''}`} data-flip-id={t.key} data-status={t.status}>
                    <button type="button" className="jrd-hit" aria-current={t.key === focusKey} onFocus={() => setFocusKey(t.key)} onClick={() => setFocusKey(t.key)}>
                      <code className="jrd-key">{t.key}</code>
                      <span className="jrd-title">{t.title}</span>
                      {t.high ? <span className="jrd-tag">High</span> : <span />}
                      <span className="jrd-age">{t.age}</span>
                    </button>
                    <button type="button" className="jrd-move" aria-label={`Move ${t.key} to ${LABEL[NEXT[t.status]]}`} onClick={() => advance(t.key)}>
                      <i className="jrd-dot" data-status={t.status} /><span aria-hidden="true">▾</span>
                    </button>
                  </li>
                ))}
                <li className="jrd-slot" aria-hidden="true" />
              </ul>
            </section>
          );
        })}
        <div className="jrd-keys">
          {CAPS.map((c) => (
            <button key={c.id} type="button" className="jrd-cap" data-cap={c.id} aria-label={c.hint} onClick={() => press(c.id)}>{c.id.toUpperCase()}</button>
          ))}
          <span className="jrd-keys-note">next · previous · move</span>
        </div>
      </div>
    </div>
  );
}
