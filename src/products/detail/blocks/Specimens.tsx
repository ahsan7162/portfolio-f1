// Every named part of a product as a wall of words in groups, beside an inspector. Pointing at a name shows it
// there (its drawing, its signature, what it does); picking one keeps it. On a narrow screen a pick opens a sheet.
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { gsap } from '../../motion';
import { Shot } from '../../stage/Frames';
import { CopyStatus, Label, SwapLabel, useBlockMotion, useCopy, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

type Item = BlockProps<'specimens'>['block']['groups'][number]['items'][number];

export function Specimens({ block, product, n }: BlockProps<'specimens'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const all = block.groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.name })));
  const [pinned, setPinned] = useState((all.find((i) => i.media) ?? all[0]).name);
  const [hover, setHover] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  // Closing the sheet hands focus back to the name that opened it.
  const closeSheet = useCallback(() => {
    setSheet(false);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('.bv-spec-name[aria-pressed="true"]')?.focus({ preventScroll: true }));
  }, [setSheet]);
  const cur = all.find((i) => i.name === (hover ?? pinned)) ?? all[0];
  const count = all.length;

  useBlockMotion(root, ({ qa, enter }) => {
    for (const g of qa('.bv-spec-group')) {
      gsap.from(g.querySelectorAll('.bv-spec-name'), { yPercent: 60, autoAlpha: 0, duration: 0.7, stagger: 0.018, ease: 'expo.out', scrollTrigger: enter(g, 'top 85%') });
    }
  });

  return (
    <section className="dt-block dt-sec pp-wrap bv-spec" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <p className="bv-spec-head pp-lede">{block.head}</p>}
      {block.note && <p className="bv-rot-note">{block.note}</p>}
      <div className="bv-spec-grid">
        <div className="bv-spec-wall" onPointerLeave={() => setHover(null)}>
          {block.groups.map((g) => (
            <div key={g.name} className="bv-spec-group" role="group" aria-label={g.name}>
              <p className="bv-spec-gname pp-mono"><span>{g.name}</span><span className="pp-dim">{g.items.length}</span></p>
              <p className="bv-spec-names">
                {g.items.map((it) => (
                  <button key={it.name} type="button" className="bv-spec-name" data-drawn={it.media ? '' : undefined} aria-pressed={pinned === it.name}
                    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(it.name); }}
                    onFocus={() => setHover(it.name)} onBlur={() => setHover(null)}
                    onClick={() => { setPinned(it.name); setHover(null); setSheet(true); }}>{it.name}</button>
                ))}
              </p>
            </div>
          ))}
          {block.also && (
            <div className="bv-spec-also">
              <p className="pp-mono pp-dim">{block.also.note}</p>
              <p>{block.also.names.join(' · ')}</p>
            </div>
          )}
        </div>
        <Inspector item={cur} group={cur.group} product={product} count={count} sheet={sheet} onClose={closeSheet} />
      </div>
    </section>
  );
}

/** True below 900px, where the inspector is a sheet that opens on a pick (it must match the CSS). */
const NARROW = '(max-width: 899px)';
const narrowNow = () => window.matchMedia(NARROW).matches;
const onNarrow = (f: () => void) => { const m = window.matchMedia(NARROW); m.addEventListener('change', f); return () => m.removeEventListener('change', f); };

function Inspector({ item, group, product, sheet, onClose }: { item: Item; group: string; product: BlockProps<'specimens'>['product']; count: number; sheet: boolean; onClose: () => void }) {
  const [copied, copy] = useCopy();
  const head = useId();
  const narrow = useSyncExternalStore(onNarrow, narrowNow, () => false);
  const close = useRef<HTMLButtonElement>(null);
  const open = narrow && sheet;
  // An open sheet takes focus, and Escape closes it.
  useEffect(() => {
    if (!open) return;
    close.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);
  return (
    <aside className="bv-spec-insp" data-sheet={sheet || undefined} aria-labelledby={head} inert={narrow && !sheet}>
      <div className="bv-spec-insp-in">
        <p className="bv-spec-insp-top">
          <span className="pp-mono pp-dim">{group}</span>
          <button type="button" className="bv-spec-close pp-mono" ref={close} onClick={onClose}>Close</button>
        </p>
        <h3 className="bv-spec-insp-name pp-lede" id={head}>{item.name}</h3>
        <p className="bv-spec-line">{item.line}</p>
        <div className="bv-spec-shot" data-empty={!item.media || undefined}>
          {item.media ? <Shot key={item.name} media={item.media} kind={product.kind} active />
            : <span className="pp-mono pp-dim">Not drawn on this page. Its signature is the plugin’s own.</span>}
        </div>
        {item.sig && <code className="bv-spec-sig">{item.sig}</code>}
        {item.code && (
          <details className="bv-spec-code">
            <summary className="pp-mono">The plugin’s own example</summary>
            <pre><code>{item.code}</code></pre>
            <button type="button" className="bv-rot-btn pp-mono" onClick={() => copy(item.code!)}><SwapLabel on={copied} off="Copy" onText="Copied" /></button>
            <CopyStatus copied={copied} text="Example copied" />
          </details>
        )}
      </div>
    </aside>
  );
}
