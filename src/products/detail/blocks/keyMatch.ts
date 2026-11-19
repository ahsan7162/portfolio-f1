// Which shortcut row a key press is. Modifier caps (⌘ ⇧ ⌥ ⌃) are held together with the rest; the other caps
// are alternatives, so ['j', 'k'] is j or k and ['⌘', 'B'] is ⌘ with B. ⌘ is Ctrl too, off a Mac.

export interface Press { key: string; /** The physical key (KeyB, Digit3), when known. */ code?: string; meta: boolean; ctrl: boolean; shift: boolean; alt: boolean }

const MODS: Record<string, (p: Press) => boolean> = {
  '⌘': (p) => p.meta || p.ctrl,
  '⌃': (p) => p.ctrl,
  '⇧': (p) => p.shift,
  '⌥': (p) => p.alt,
};

/** A cap against the key pressed: letters ignore case; "1–6" is any digit in the range. */
function capIs(cap: string, key: string) {
  const range = /^(\d)[–-](\d)$/.exec(cap);
  if (range) return /^\d$/.test(key) && key >= range[1] && key <= range[2];
  return cap.toLowerCase() === key.toLowerCase();
}

export function keysMatch(caps: string[], p: Press) {
  const mods = caps.filter((c) => c in MODS);
  const rest = caps.filter((c) => !(c in MODS));
  if (!mods.every((m) => MODS[m](p))) return false;
  // a row with no modifier must not light while one is held: ⌘K is not K
  if (!mods.length && (p.meta || p.ctrl || p.alt)) return false;
  // ⌥ and ⇧ change the character typed (⌥1 is ¡ on a Mac), so the physical key counts too
  const physical = p.code === 'Backslash' ? '\\' : p.code?.replace(/^(Key|Digit)/, '');
  return rest.some((c) => capIs(c, p.key) || (physical !== undefined && capIs(c, physical)));
}
