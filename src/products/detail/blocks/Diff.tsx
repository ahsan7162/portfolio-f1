// One edit, saved more than one way: each way's file as a diff against the original, side by side, its changed
// lines marked and counted. The block works the diff out itself (lineDiff.ts), so a count can never drift from
// the text. As it enters, the marks run down every file in step, so a way that changes little stops early.
import { useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Toggle } from '@ui-sdk/react/toggle';
import { changed, diffRows, type Row } from '../../lineDiff';
import { gsap } from '../../motion';
import { countUp, Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

/** The rows to show: all of them, or the changes with one line either side and the rest folded. */
function shown(rows: Row[], folded: boolean): (Row | { fold: number })[] {
  if (!folded) return rows;
  const near = (i: number) => rows.slice(Math.max(0, i - 1), i + 2).some((r) => r.op !== 'eq');
  const out: (Row | { fold: number })[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (near(i)) { out.push(rows[i]); continue; }
    const last = out.at(-1);
    if (last && 'fold' in last) last.fold++;
    else out.push({ fold: 1 });
  }
  return out;
}

export function Diff({ block }: BlockProps<'diff'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [folded, setFolded] = useState(false);
  const [on, setOn] = useState(Math.max(0, block.ways.findIndex((w) => w.pick)));
  const ways = useMemo(() => block.ways.map((w) => {
    const rows = diffRows(block.before, w.after);
    return { ...w, rows, count: changed(rows) };
  }), [block]);

  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.bc-diff-ways');
    if (!grid) return;
    const tl = gsap.timeline({ scrollTrigger: enter(grid, 'top 78%') });
    const edit = q('.bc-diff-edit-t');
    if (edit) {
      const len = edit.textContent.length;
      tl.from(edit, { clipPath: 'inset(0% 100% 0% 0%)', duration: len * 0.022, ease: `steps(${len})`, clearProps: 'clipPath' });
    }
    // every file marks its changes top to bottom on one clock: row k of any file lights at the same moment
    const per = 0.07;
    for (const way of qa('.bc-diff-way')) {
      const rows = [...way.querySelectorAll<HTMLElement>('.bc-diff-row')];
      rows.forEach((r, k) => { if (r.dataset.op !== 'eq') tl.from(r, { '--mark': 0, duration: 0.35, ease: 'power2.out' }, 0.4 + k * per); });
      const num = way.querySelector<HTMLElement>('[data-count]');
      let last = 0;
      rows.forEach((r, k) => { if (r.dataset.op !== 'eq') last = k; });
      if (num) countUp(num, { scrollTrigger: enter(grid, 'top 78%'), delay: 0.4, duration: Math.max(0.4, last * per), ease: 'none' });
    }
  });

  return (
    <section className="dt-block dt-sec pp-wrap bc-diff" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      {block.head && <p className="bc-diff-head pp-lede">{block.head}</p>}
      <p className="bc-diff-edit pp-cap"><code className="bc-diff-file">{block.file}</code><span className="bc-diff-edit-t">{block.edit}</span></p>
      <div className="bc-diff-bar">
        <div className="bc-diff-tabs" role="group" aria-label="Way of saving">
          {ways.map((w, i) => (
            <Toggle key={w.name} className="pp-mono" pressed={i === on} onPressedChange={() => setOn(i)}>{w.name} · {w.count}</Toggle>
          ))}
        </div>
        <Toggle className="bc-diff-fold pp-mono" pressed={folded} onPressedChange={() => setFolded((f) => !f)}>{folded ? 'Whole file' : 'Changes only'}</Toggle>
      </div>
      <div className="bc-diff-ways" style={{ '--ways': ways.length } as CSSProperties}>
        {ways.map((w, i) => (
          <figure key={w.name} className="bc-diff-way" data-pick={w.pick ? '' : undefined} data-on={i === on ? '' : undefined}>
            <figcaption className="bc-diff-cap">
              <span className="pp-mono">{w.name}</span>
              <b className="bc-diff-n pp-display"><span data-count>{w.count}</span></b>
              <span className="pp-meta pp-dim">{w.count === 1 ? 'line' : 'lines'} changed</span>
            </figcaption>
            <div className="bc-diff-file-view" aria-label={`${w.name}: ${w.count} ${w.count === 1 ? 'line' : 'lines'} changed`}>
              {shown(w.rows, folded).map((r, k) => ('fold' in r
                // oxlint-disable-next-line react/no-array-index-key -- rows of a diff, by position
                ? <p key={k} className="bc-diff-fold-row pp-mono">{r.fold} unchanged {r.fold === 1 ? 'line' : 'lines'}</p>
                // oxlint-disable-next-line react/no-array-index-key -- rows of a diff, by position
                : <p key={k} className="bc-diff-row" data-op={r.op}><span className="bc-diff-sign" aria-hidden="true">{r.op === 'add' ? '+' : r.op === 'del' ? '−' : ''}</span><span className="bc-diff-t">{r.text || ' '}</span></p>))}
            </div>
          </figure>
        ))}
      </div>
      {block.note && <p className="bc-note">{block.note}</p>}
    </section>
  );
}
