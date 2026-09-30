import { createContext, useContext } from 'react';
import type { Breakdown } from '@/content/data';

export type Origin = { x: number; y: number };
export type DialogApi = {
  openDetails: (b: Breakdown, origin?: Origin) => void;
  openArchive: (origin?: Origin) => void;
};

export const DialogCtx = createContext<DialogApi | null>(null);
export const useDialogs = () => {
  const v = useContext(DialogCtx);
  if (!v) throw new Error('useDialogs outside provider');
  return v;
};

/** Click point for the circular wipe; keyboard opens from the element centre. */
export const originOf = (e: { clientX: number; clientY: number; currentTarget: Element }): Origin => {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
