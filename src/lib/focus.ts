import type { KeyboardEvent } from 'react';

/** What Tab can land on inside the menu and the dialogs. */
export const FOCUSABLE = ':is(a[href], button:not([disabled]), [tabindex="0"]):not([tabindex="-1"])';

/** Keep Tab inside `root` (an open menu or dialog): it wraps from the last control to the first, and back. */
export function trapTab(e: KeyboardEvent, root: HTMLElement) {
  if (e.key !== 'Tab') return;
  // Hidden or inert controls can't take focus, so they can't be the ends (the archive's header while a project is open).
  const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null && !el.closest('[inert]'));
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
