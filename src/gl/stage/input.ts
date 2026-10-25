/** The pointer in -1..1 screen units (`tx`, `ty`), and the helmet's eased copy of it (`x`, `y`). */
export type Pointer = { x: number; y: number; tx: number; ty: number };
/** The contour lens under the cursor: a quicker copy of the pointer, and its strength. */
export type Lens = { x: number; y: number; on: number; target: number };
/** An element's box in page px. */
export type Box = { l: number; t: number; r: number; b: number };

/** Desktop pointer moves, for the helmet's tilt and the contour lens. Returns a cleanup. */
export function trackPointer(pointer: Pointer, lens: Lens, onMove: () => void, onLeave: () => void) {
  const move = (e: PointerEvent) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    onMove();
    if (lens.target === 0) { lens.x = e.clientX / innerWidth; lens.y = 1 - e.clientY / innerHeight; }
    lens.target = 1;
  };
  const leave = (e: PointerEvent) => { if (!e.relatedTarget) { lens.target = 0; onLeave(); } };
  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerout', leave, { passive: true });
  return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerout', leave); };
}

/** The keyboard-focused element's box (null when nothing has a focus ring). Returns a cleanup. */
export function trackFocus(onChange: (box: Box | null) => void) {
  const focus = (e: FocusEvent) => {
    const el = e.target instanceof HTMLElement && e.target.matches(':focus-visible') ? e.target : null;
    const r = el?.getBoundingClientRect();
    onChange(r ? { l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY } : null);
  };
  const blur = () => onChange(null);
  document.addEventListener('focusin', focus);
  document.addEventListener('focusout', blur);
  return () => { document.removeEventListener('focusin', focus); document.removeEventListener('focusout', blur); };
}
