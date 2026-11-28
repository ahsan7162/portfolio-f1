// A handle between two panes that sizes one of them: dragged (a shield over the page keeps the pointer from the
// canvas's frame, which would otherwise swallow it), or with the arrow keys once focused; a double click resets it.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

type Props = {
  /** 'x' sizes a width (the handle stands upright), 'y' a height. */
  axis: 'x' | 'y';
  /** In pixels, or in percent of the handle's parent when `percent` is set. */
  value: number; min: number; max: number;
  percent?: boolean;
  /** 1 when moving the handle right or down grows the value; -1 for a pane on the far side of it. */
  sign: 1 | -1;
  onChange: (v: number) => void;
  onReset: () => void;
  label: string;
  /** The id of the pane it sizes. */
  controls: string;
};

export function Splitter({ axis, value, min, max, percent, sign, onChange, onReset, label, controls }: Props) {
  const [dragging, setDragging] = useState(false);
  const from = useRef({ at: 0, value: 0, per: 1 });
  const frame = useRef(0);
  const top = Math.max(min, max);
  const set = (v: number) => onChange(Math.round(Math.min(top, Math.max(min, v)) * 10) / 10);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const parent = e.currentTarget.parentElement?.getBoundingClientRect();
    const size = parent ? (axis === 'x' ? parent.width : parent.height) : 0;
    from.current = { at: axis === 'x' ? e.clientX : e.clientY, value, per: percent && size ? size / 100 : 1 };
    setDragging(true);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const { at, value: v0, per } = from.current;
    const to = v0 + (sign * ((axis === 'x' ? e.clientX : e.clientY) - at)) / per;
    // one change a frame, however fast the pointer reports
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => set(to));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (percent ? 2 : 16) * (e.shiftKey ? 4 : 1);
    const [less, more] = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    // an arrow moves the handle its way, whichever pane that grows
    if (e.key === less || e.key === more) set(value + sign * (e.key === more ? step : -step));
    else if (e.key === 'Home') set(min);
    else if (e.key === 'End') set(top);
    else return;
    e.preventDefault();
  };

  return (
    <>
      <div
        role="separator" tabIndex={0} className={`pg-split pg-split--${axis}`} data-dragging={dragging ? '' : undefined}
        aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'} aria-label={label} aria-controls={controls}
        aria-valuenow={Math.round(value)} aria-valuemin={min} aria-valuemax={Math.round(top)}
        title="Drag, or focus and use the arrow keys. Double-click resets it."
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={() => setDragging(false)}
        onKeyDown={keys} onDoubleClick={onReset}
      />
      {dragging && <div className="pg-shield" data-axis={axis} aria-hidden="true" />}
    </>
  );
}
