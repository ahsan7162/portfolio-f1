import type { AnchorHTMLAttributes } from 'react';
import { CV_FILE } from '@/content/data';

/**
 * The "Download CV" link. The PDF is in public/, so the href is relative, like the build's
 * base: the prerender and the client agree, and it works from a subfolder too.
 */
export function CvLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={CV_FILE} download={CV_FILE} {...props}><span data-letter-roll>Download CV</span></a>;
}
