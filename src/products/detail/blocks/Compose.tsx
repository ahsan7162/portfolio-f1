// Pick parts and the text they make writes itself: the product's own text for every pick, each `### ` section
// marked when its part is hovered or focused. Tabs show other texts the product writes (`modes`).
import { useEffect, useId, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { gsap, reducedMotion } from '../../motion';
import { PARTS } from '../../stage/pieces';
import { Accented } from './Rules';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-visual.css';

/** The text cut at its `### ` headings: an opening, one section per picked part, and (with headings) its last paragraph as the closing. */
export function cut(text: string) {
  const out: { text: string; part: number | null }[] = [];
  const [body, close] = text.includes('\n### ') ? [text.slice(0, text.lastIndexOf('\n\n')), text.slice(text.lastIndexOf('\n\n'))] : [text, ''];
  body.split(/\n(?=### )/).forEach((s, i) => out.push({ text: i ? `\n${s}` : s, part: i ? i - 1 : null }));
  if (close) out.push({ text: close, part: null });
  return out;
}

export function Compose({ block, n }: BlockProps<'compose'>) {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const [picked, setPicked] = useState<string[]>(block.start ?? block.items.map(i => i.id));
  const [mode, setMode] = useState(-1);
  const [hot, setHot] = useState<string | null>(null);
  const order = block.items.map(i => i.id).filter(x => picked.includes(x));
  const text = mode >= 0 ? block.modes![mode].text : (block.outputs[order.join('+')] ?? '');
  const parts = cut(text);
  const draw = PARTS[block.parts];

  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.bv-comp');
    if (!grid) return;
    gsap.timeline({ scrollTrigger: enter(grid, 'top 80%') })
      .from(qa('.bv-comp-parts > *'), { x: -24, autoAlpha: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out' })
      .from(q('.bv-comp-out'), { y: 30, autoAlpha: 0, duration: 0.7, ease: 'expo.out' }, 0.15)
      .from(qa('.bv-comp-sec'), { autoAlpha: 0, duration: 0.35, stagger: 0.12 }, 0.5);
  });

  // The hovered part's section scrolls into the middle of the text. It reads the drawn text, so it runs when that changes.
  useEffect(() => {
    const el = box.current;
    const sec = el?.querySelector<HTMLElement>('[data-hot]');
    if (!el || !sec) return;
    const top = sec.offsetTop - el.clientHeight / 2 + sec.offsetHeight / 2;
    if (reducedMotion()) el.scrollTop = top;
    else gsap.to(el, { scrollTop: top, duration: 0.5, ease: 'power3.out', overwrite: true });
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- it reads the drawn text, so it runs when that changes
  }, [hot, text]);

  const toggle = (pid: string) => { setMode(-1); setPicked(p => (p.includes(pid) ? p.filter(x => x !== pid) : [...p, pid])); };

  return (
    <Tabs value={String(mode)} onValueChange={(v) => setMode(Number(v))} render={<section ref={root} />} className="dt-block dt-sec pp-wrap bv-compose" aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      {block.head && <p className="bv-rules-head pp-lede"><Accented text={block.head} /></p>}
      <div className="bv-comp">
        <div className="bv-comp-parts prd">
          {block.items.map(it => (
            <div key={it.id} className="bv-comp-part" data-hot={hot === it.id || undefined} onPointerEnter={() => setHot(it.id)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(it.id)} onBlur={() => setHot(null)}>
              {draw({ id: it.id, title: it.title, picked: picked.includes(it.id), n: order.indexOf(it.id) + 1, toggle: () => toggle(it.id) })}
            </div>
          ))}
        </div>
        <div className="bv-comp-out">
          <TabsList className="bv-comp-modes">
            <TabsTab value="-1">{`${order.length} ${block.unit}`}</TabsTab>
            {block.modes?.map((m, i) => <TabsTab key={m.name} value={String(i)}>{m.name}</TabsTab>)}
          </TabsList>
          <div className="bv-comp-text" ref={box} data-lenis-prevent="" aria-label="The text it writes" aria-live="polite">
            {text ? (
              <pre>{parts.map((s, i) => {
                const pid = s.part === null ? null : order[s.part];
                return (
                  <span key={`${mode}:${pid ?? i}`} className="bv-comp-sec" data-hot={(pid && pid === hot) || undefined}>
                    {/* oxlint-disable-next-line react/no-array-index-key -- runs of one section, by position */}
                    {s.text.split(/(^### .*$)/m).map((x, j) => (j % 2 ? <mark key={j}>{x}</mark> : x))}
                  </span>
                );
              })}</pre>
            ) : <p className="bv-comp-none">Pick something to fix.</p>}
          </div>
          <p className="bv-comp-foot pp-mono"><span>{block.footer}</span><span>{text.length.toLocaleString('en')} characters</span></p>
        </div>
      </div>
      {block.note && <p className="bc-note bv-rules-note">{block.note}</p>}
    </Tabs>
  );
}
