import { cn } from '@/lib/utils';

/**
 * The site's right arrow (the → character isn't in the web fonts): 1em square, in
 * currentColor, so it takes the size and colour of its text.
 */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"
      className={cn('inline-block size-[1em] shrink-0 align-[-0.125em]', className)}>
      <path d="M2.5 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
