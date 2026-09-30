import { useEffect, useRef } from 'react';
import { useDialogs } from '@/components/dialog-context';
import type { Breakdown } from '@/content/data';

/**
 * The full text of every details dialog, prerendered into the page so search
 * engines can read it (the dialogs themselves only mount on click).
 *
 * Each block is `hidden="until-found"`: invisible, like a collapsed accordion,
 * but indexed and findable with the browser's find-in-page. If find-in-page
 * reveals one, the matching dialog opens instead and the block hides again.
 */
export function CrawlableDetails({ items }: { items: Breakdown[] }) {
  const { openDetails } = useDialogs();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blocks = [...ref.current!.querySelectorAll<HTMLElement>('[data-crawl]')];
    const offs = blocks.map((el, i) => {
      const onMatch = () => {
        openDetails(items[i]);
        setTimeout(() => el.setAttribute('hidden', 'until-found'), 0);
      };
      el.addEventListener('beforematch', onMatch);
      return () => el.removeEventListener('beforematch', onMatch);
    });
    return () => offs.forEach(off => off());
  }, [items, openDetails]);

  // Written as static HTML: React turns hidden="until-found" into a plain boolean `hidden`.
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: items.map(block).join('') }} />;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const block = (b: Breakdown) =>
  `<article data-crawl hidden="until-found"><h3>${esc(b.company)}</h3>` +
  `<p>${esc(b.role)}. ${esc(b.dates)}, ${esc(b.loc)}.</p><ul>` +
  b.highlights.map(h => `<li><strong>${esc(h.stat)}: ${esc(h.title)}.</strong> ${esc(h.text)}</li>`).join('') +
  `</ul></article>`;
