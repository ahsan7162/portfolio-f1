// A hand of cards to pick from: templates, themes, presets. On a wide screen the hand fans out as it enters and a
// card lifts under the pointer or focus; on a narrow one the cards sit in a row you swipe. Picking a card flies it
// into a dialog at full size, where a card with `source` can also show the text behind it.
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { Toggle } from '@ui-sdk/react/toggle';
import { Shot } from '../../stage/Frames';
import { gsap, reducedMotion, useGSAP } from '../../motion';
import { holdScroll } from '../../scroll';
import { IconClose } from './icons';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';
import { bare } from '../../stop';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Moves the dialog's panel from the card's box to its own, or back: the card seems to fly. */
function fly(panel: HTMLElement, card: HTMLElement, back: boolean) {
  const [p, c] = [panel.getBoundingClientRect(), card.getBoundingClientRect()];
  const from = { x: c.left - p.left, y: c.top - p.top, scaleX: c.width / p.width, scaleY: c.height / p.height, borderRadius: '14px' };
  const to = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  return back
    ? gsap.to(panel, { ...from, duration: 0.42, ease: 'power3.in', transformOrigin: '0 0' })
    : gsap.fromTo(panel, { ...from, transformOrigin: '0 0' }, { ...to, duration: 0.6, ease: 'expo.out', clearProps: 'transform,borderRadius' });
}

export function Deck({ block, product }: BlockProps<'deck'>) {
  const root = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState<number | null>(null);
  const [view, setView] = useState(0);
  const views = block.views ?? ['Preview', 'Source'];
  const count = block.cards.length;
  const { contextSafe } = useGSAP({ scope: root });

  useBlockMotion(root, ({ q, qa, enter }) => {
    const hand = q('.bv-deck-hand');
    if (!hand) return;
    // the hand is dealt: every card starts stacked in the middle, then fans to its place
    gsap.from(qa('.bv-deck-card'), {
      '--k': 0, y: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.035, from: 'center' },
      scrollTrigger: enter(hand, 'top 80%'), clearProps: '--k',
    });
  });

  const cardEl = (i: number) => root.current?.querySelector<HTMLElement>(`.bv-deck-card[data-i="${i}"]`) ?? null;

  const show = (i: number) => {
    // the panel must be drawn before the dialog opens, so it can be measured and flown in
    flushSync(() => { setOpen(i); setView(0); });
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    holdScroll(true);
    const [p, c] = [panel.current, cardEl(i)];
    if (p && c && !reducedMotion()) contextSafe(() => fly(p, c, false))();
  };

  const hide = () => {
    const [d, p, c] = [dialog.current, panel.current, open === null ? null : cardEl(open)];
    const done = () => { d?.close(); holdScroll(false); setOpen(null); c?.focus({ preventScroll: true }); };
    if (!d || !p || !c || reducedMotion()) { done(); return; }
    contextSafe(() => { void fly(p, c, true).then(done); })();
  };

  /** Arrow keys walk the hand; Home and End jump to its ends. */
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: count - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    cardEl(Math.max(0, Math.min(count - 1, next)))?.focus();
  };

  const card = open === null ? null : block.cards[open];

  return (
    <section className="dt-block dt-sec pp-wrap bv-deck" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      {block.head && <p className="bv-deck-head pp-lede">{bare(block.head)}</p>}
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <ul className="bv-deck-hand" style={{ '--n': count } as Vars}>
        {block.cards.map((c, i) => (
          <li key={c.title} className="bv-deck-slot" style={{ '--k': i - (count - 1) / 2 } as Vars}>
            <button type="button" className="bv-deck-card" data-i={i} aria-haspopup="dialog" onClick={() => show(i)} onKeyDown={(e) => onKey(e, i)} data-cursor="Open">
              <span className="bv-deck-face"><Shot media={c.media} kind={product.kind} active={false} /><span className="bv-deck-tag pp-mono" aria-hidden="true">{c.title}</span></span>
              <span className="bv-deck-title">{c.title}</span>
              <span className="bv-deck-body pp-dim">{c.body}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* A click on the backdrop closes it, for the mouse; Escape (cancel) and Close do the same by keyboard. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog className="bv-deck-dialog" ref={dialog} aria-labelledby={`${id}-t`} onCancel={(e) => { e.preventDefault(); hide(); }}
        onClick={(e) => { if (e.target === e.currentTarget) hide(); }}>
        {card && (
          <div className="bv-deck-open" ref={panel}>
            <div className="bv-deck-page" data-lenis-prevent="">
              {view === 1 && card.source
                ? <pre className="bv-deck-src">{card.source}</pre>
                : <span className="bv-deck-face bv-deck-face--big"><Shot media={card.media} kind={product.kind} active /></span>}
            </div>
            <div className="bv-deck-side">
              {/* the close sits where a dialog's always does, top right */}
              <p className="bv-deck-top">
                <span className="pp-mono pp-dim">{(open ?? 0) + 1} of {count}</span>
                <button type="button" className="bv-deck-close pp-ib" aria-label="Close" onClick={hide}><IconClose /></button>
              </p>
              <h3 className="bv-deck-open-t pp-lede" id={`${id}-t`}>{card.title}</h3>
              <p className="pp-dim">{card.body}</p>
              {card.source && (
                <div className="bv-deck-views" role="group" aria-label="View">
                  {views.map((v, i) => <Toggle key={v} className="pp-mono" pressed={view === i} onPressedChange={() => setView(i)}>{v}</Toggle>)}
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
