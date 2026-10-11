import { cn } from '@/lib/utils';

/**
 * The site's right arrow. The → character isn't in either web font, so it used to
 * fall back to a thin system arrow that changed with the OS. This one is 1em
 * square and drawn in currentColor, so it takes the size and colour of its text.
 */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"
      className={cn('inline-block size-[1em] shrink-0 align-[-0.125em]', className)}>
      <path d="M2.5 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
