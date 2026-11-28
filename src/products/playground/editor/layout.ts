// The editor's layout: whether each side pane is open, how wide each is, and where the left pane splits between the
// page's blocks and every block. It is kept in this browser apart from the page, and fitted to the window so the
// canvas always keeps its room.
import { useCallback, useEffect, useState } from 'react';

export interface Layout {
  /** A width the visitor chose, or null for the width that suits the window. */
  left: number | null;
  right: number | null;
  /** The share of the left pane the page's own blocks take. */
  split: number;
  leftOpen: boolean;
  rightOpen: boolean;
}

const KEY = 'pg-layout';
export const FRESH: Layout = { left: null, right: null, split: 0.38, leftOpen: true, rightOpen: true };
export const LEFT = [220, 480] as const;
export const RIGHT = [320, 760] as const;
export const SPLIT = [0.15, 0.8] as const;
/** The narrowest the canvas column gets beside the open panes (the page drawn in it, less its padding). */
export const CANVAS_MIN = 400;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
const width = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Each open pane's width in this window: what was chosen, shrunk (the right pane first) until the canvas has its room. */
export function fit(l: Layout, vw: number) {
  const narrow = vw < 1280;
  let left = l.leftOpen ? clamp(l.left ?? (narrow ? 260 : 300), LEFT) : 0;
  let right = l.rightOpen ? clamp(l.right ?? (narrow ? 360 : 420), RIGHT) : 0;
  let over = left + right + CANVAS_MIN - vw;
  if (over > 0 && right) { const cut = Math.min(over, right - RIGHT[0]); right -= cut; over -= cut; }
  if (over > 0 && left) left -= Math.min(over, left - LEFT[0]);
  return { left, right };
}

/** A stored layout, field by field: whatever is not the right kind of value falls back to the fresh one. */
export function readLayout(raw: unknown): Layout {
  if (typeof raw !== 'object' || raw === null) return FRESH;
  const r = raw as Record<string, unknown>;
  const split = width(r.split);
  return {
    left: width(r.left), right: width(r.right),
    split: split === null ? FRESH.split : clamp(split, SPLIT),
    leftOpen: typeof r.leftOpen === 'boolean' ? r.leftOpen : true,
    rightOpen: typeof r.rightOpen === 'boolean' ? r.rightOpen : true,
  };
}

export function useLayout() {
  const [layout, setLayout] = useState<Layout>(() => {
    try { return readLayout(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return FRESH; }
  });
  const [vw, setVw] = useState(() => innerWidth);
  useEffect(() => {
    const on = () => setVw(innerWidth);
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* not kept: the layout still works */ } }, [layout]);
  const set = useCallback((patch: Partial<Layout> | ((l: Layout) => Partial<Layout>)) => setLayout(l => ({ ...l, ...(typeof patch === 'function' ? patch(l) : patch) })), []);
  return { layout, set, vw, ...fit(layout, vw) };
}
