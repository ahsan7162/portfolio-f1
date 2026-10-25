import type { ReactNode, RefObject } from 'react';
import { trapTab } from '@/lib/focus';
import { cn } from '@/lib/utils';
import type { Origin } from './context';
import { useDialogIn } from './useDialogIn';

// The archive sits on graphite; details open over it, one layer up, on carbon.
const TONE = {
  graphite: { box: 'z-[70] bg-graphite', head: 'bg-graphite/95' },
  carbon: { box: 'z-[75] bg-carbon', head: 'bg-carbon/95' },
};

export type DialogProps = {
  origin?: Origin; onClose: () => void; dref: RefObject<HTMLDivElement | null>;
  /** false: no circle wipe, because something else (a loader) already covers the screen. */
  wipe?: boolean;
};

/** The full-screen dialog shell: sticky header with its label and Close, Tab kept inside, the wipe in. */
export function DialogFrame({ origin, onClose, dref, wipe, label, titleId, tone, width, children }: DialogProps & {
  label: string; titleId: string; tone: keyof typeof TONE; width: string; children: ReactNode;
}) {
  useDialogIn(dref, origin, wipe);
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the dialog keeps Tab inside itself
    <div ref={dref} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={e => trapTab(e, e.currentTarget)} data-lenis-prevent
      className={cn('fixed inset-0 isolate overflow-y-auto overscroll-contain text-fg', TONE[tone].box)}>
      <div data-dhead className={cn('sticky top-0 z-10 flex items-center justify-between border-b border-line px-4 py-4 md:px-8', TONE[tone].head)}>
        <span className="label">{label}</span>
        <button type="button" data-dclose onClick={onClose} className="btn btn-ghost"><span data-letter-roll>Close</span></button>
      </div>
      <div className={cn('mx-auto px-4 py-12 md:px-8', width)}>{children}</div>
    </div>
  );
}
