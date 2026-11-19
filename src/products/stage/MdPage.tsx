// A Markwright document drawn as a page, for live screens: one of the plugin's templates, filled in as it is when
// inserted, in the editor's look. It fills its box (1em is a fixed share of the box's width, so it scales as one
// picture), and builds in block by block each time it turns active.
import { useRef } from 'react';
import { gsap, reducedMotion, useGSAP } from '../motion';
import type { LiveProps } from '../types';
import { parse } from './md';
import { BlockView } from './mdRender';
import { DOCUMENT_TEMPLATES, fillTemplate } from './mdTemplates';
import '../styles/md-demo.css';

export function MdPage({ template, active, alt }: LiveProps & { template: string }) {
  const root = useRef<HTMLDivElement>(null);
  const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === template);
  const doc = parse(fillTemplate(tpl?.markdown ?? ''));

  useGSAP(() => {
    const el = root.current;
    if (!el || !active || reducedMotion()) return;
    gsap.fromTo(el.querySelectorAll('.mwd-blk'), { autoAlpha: 0, y: '0.8em' }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', delay: 0.1, clearProps: 'all' });
  }, { dependencies: [active], scope: root, revertOnUpdate: true });

  return (
    <div className="mwd mwd-live" ref={root} role="img" aria-label={alt}>
      <div className="mwd-sheet" aria-hidden="true">
        {doc.parts.map((p) => <div key={p.id} className="mwd-blk" data-kind={p.b.t}><BlockView part={p} /></div>)}
      </div>
    </div>
  );
}
