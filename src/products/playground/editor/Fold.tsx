// A section's fold: a button with a chevron that hides what is under the heading and shows it again. It says
// whether it is open (aria-expanded) and what it opens (aria-controls), so it reads as a disclosure.
import type { ReactNode } from 'react';
import { Icon } from './icons';

export function Fold({ open, onToggle, controls, label, children }: {
  open: boolean; onToggle: () => void;
  /** The id of the part it hides. */
  controls: string;
  /** Its name when it has no text of its own (a chevron beside a field's name). */
  label?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button" className="pg-fold" aria-expanded={open} aria-controls={controls} onClick={onToggle}
      aria-label={label} title={label ?? (open ? 'Fold this away' : 'Show this')}
    >
      <Icon name="chevron" />
      {children}
    </button>
  );
}
