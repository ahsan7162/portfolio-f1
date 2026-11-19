// OpenUI Live Replies' live screens: a reply's block, drawn by the kit, filling the box it is given. The prompts
// block's replies stream in behind the render line each time they turn active; the CI reply and the component
// specimens are drawn whole. What a click in one sends shows under it, as the thread would get it.
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { LiveProps } from '../../types';
import type { OuiName } from '../names';
import { OUI_EXAMPLES } from './examples.gen';
import { ASKS, CI } from './programs';
import { OuiBlock, useStream } from './render';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** The program a screen draws, and whether it streams in. */
export function programOf(name: OuiName): { program: string; stream: boolean } | null {
  if (name === 'oui:ci') return { program: CI, stream: false };
  if (name.startsWith('oui:spec-')) {
    const code = OUI_EXAMPLES[name.slice('oui:spec-'.length)];
    return code ? { program: code, stream: false } : null;
  }
  const ask = ASKS.find((a) => `oui:${a.id}` === name);
  return ask ? { program: ask.program, stream: true } : null;
}

/** Scales the content down (never up) so the whole reply fits its box; measured on the finished reply. */
function useFit(box: React.RefObject<HTMLElement | null>, measure: React.RefObject<HTMLElement | null>) {
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const [b, m] = [box.current, measure.current];
    if (!b || !m) return;
    const fit = () => setK(Math.min(1, b.clientHeight / Math.max(1, m.scrollHeight)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    ro.observe(m);
    return () => ro.disconnect();
  }, [box, measure]);
  return k;
}

export default function OuiLive({ name, active, alt }: LiveProps & { name: OuiName }) {
  const found = programOf(name);
  const program = found?.program ?? '';
  const { text, streaming } = useStream(program, active && !!found?.stream);
  const [sent, setSent] = useState<string | null>(null);
  const [code, setCode] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const k = useFit(box, measure);
  // A frame or a canvas would run twice if it were measured too; those replies fit as drawn.
  const heavy = /\b(App|Shader)\(/.test(program);
  const ask = useMemo(() => (t: string) => setSent(t), []);
  const at = streaming ? text.length / Math.max(1, program.length) : 1;
  return (
    <div className="oul" ref={box} role="group" aria-label={alt} data-streaming={streaming || undefined} style={{ '--x': at, '--k': k } as Vars}>
      {!heavy && <div className="oul-fit oul-measure" ref={measure} aria-hidden="true" inert><OuiBlock src={program} /></div>}
      <div className="oul-fit" ref={heavy ? measure : undefined}>
        <div className="oul-ui"><OuiBlock src={text} streaming={streaming} ask={ask} /></div>
        {sent && <p className="oul-sent"><span>Sent as your next message</span>{sent}</p>}
      </div>
      {streaming && <pre className="oul-src" aria-hidden="true">{text}</pre>}
      {code && <textarea className="oul-src oul-prog" readOnly value={program} aria-label="The program behind this reply" spellCheck={false} />}
      {name.startsWith('oui:spec-') && found && (
        <button type="button" className="oul-toggle" aria-pressed={code} onClick={() => setCode(!code)}>{code ? 'Reply' : 'Program'}</button>
      )}
      {streaming && <i className="oul-seam" aria-hidden="true" />}
    </div>
  );
}
