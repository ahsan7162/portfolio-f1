import type { AnchorHTMLAttributes } from 'react';
import { CV_FILE } from '@/content/data';

/**
 * The "Download CV" link. The PDF sits next to index.html (public/), so the href is
 * relative, like the build's base: the prerender and the client write the same
 * value, and it still works when the site is served from a subfolder.
 */
export function CvLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={CV_FILE} download={CV_FILE} {...props}><span data-letter-roll>Download CV</span></a>;
}
