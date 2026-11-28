// Arrow keys (and Home and End) move through a tab list or a radio group and choose as they go, as the ARIA
// patterns expect. Each button in the group takes these keys, and only the chosen one is in the Tab order.
import type { KeyboardEvent } from 'react';

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function roving(e: KeyboardEvent<HTMLElement>) {
  const group = e.currentTarget.closest('[role=tablist], [role=radiogroup]');
  if (!group) return;
  const items = [...group.querySelectorAll<HTMLButtonElement>('[role=tab]:not(:disabled), [role=radio]:not(:disabled)')];
  const i = items.indexOf(e.currentTarget as HTMLButtonElement);
  if (i < 0) return;
  const n = items.length;
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key in STEP ? (i + STEP[e.key] + n) % n : -1;
  if (to < 0) return;
  e.preventDefault();
  items[to].focus();
  items[to].click();
}

/** The tabIndex for a button in such a group. */
export const stop = (chosen: boolean) => (chosen ? 0 : -1);
