/** Join class names, skipping falsy ones. Callers never pass conflicting utilities. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
