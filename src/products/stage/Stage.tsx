// The stage shows a product the way its kind calls for: a live demo, phones, or a browser.
import { lazy, Suspense } from 'react';
import type { DemoProps, Media, Product, StageKind } from '../types';
import { DashDemo } from './DashDemo';
import { BrowserFrame, PhoneFrame, Shot, WindowFrame } from './Frames';
import { MdDemo } from './MdDemo';
import { OpenUiDemo } from './OpenUiDemo';
import { PrDemo } from './PrDemo';
import '../styles/stage.css';
import '../styles/jira-demo.css';

// The Jira Board demo and its invented site load on their own, on idle, so the other pages don't carry them.
const loadJira = () => import('./JiraDemo');
const JiraDemo = lazy(() => loadJira().then((m) => ({ default: m.JiraDemo })));
if (typeof window !== 'undefined') (window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500)))(() => void loadJira());
/** The panel's own box while its code loads, sized by the same stylesheet, so nothing moves when it arrives. */
const JiraHold = () => <div className="jbd" aria-hidden="true"><div className="jbd-cam"><div className="jbd-win" /></div></div>;

/** What a live demo's number counts, as two short lines. A demo without an entry shows no number. */
export const TALLY: Partial<Record<StageKind, [string, string]>> = { 'pr-demo': ['blockers', 'left'], 'dash-demo': ['model calls', 'so far'], 'md-demo': ['lines changed', 'in the file'], 'jira-demo': ['tickets', 'open'] };

/** A demo's tally words for a number: "1 line changed", "4 lines changed" (the first plural loses its s at 1). */
export function tallyWords(stage: StageKind, n: number | null | undefined): [string, string] | undefined {
  const w = TALLY[stage];
  return w && n === 1 ? [w[0].replace(/s\b/, ''), w[1]] : w;
}

export function Stage({ product, active, onTally, scene }: { product: Product } & DemoProps) {
  const v = product.variant ?? 0;
  /** The product's own picture for a slot on the stage, or the sample screen that stands in for it. */
  const shot = (i: number, standIn: Media) => <Shot media={product.shots?.[i] ?? standIn} kind={product.kind} />;
  switch (product.stage) {
    case 'pr-demo': return <PrDemo active={active} onTally={onTally} />;
    case 'jira-demo': return <Suspense fallback={<JiraHold />}><JiraDemo active={active} onTally={onTally} scene={scene} /></Suspense>;
    case 'openui-demo': return <OpenUiDemo active={active} />;
    case 'dash-demo': return <DashDemo active={active} onTally={onTally} scene={scene} />;
    case 'md-demo': return <MdDemo active={active} onTally={onTally} scene={scene} />;
    case 'window':
      return <WindowFrame className="stg-window" title={product.name}>{shot(0, { sample: v })}</WindowFrame>;
    case 'phone':
      return (
        <div className="stg-phones">
          <PhoneFrame className="stg-phone stg-phone--a">{shot(0, { sample: v })}</PhoneFrame>
          <PhoneFrame className="stg-phone stg-phone--b">{shot(1, { sample: v + 1, dark: true })}</PhoneFrame>
        </div>
      );
    case 'browser':
      return (
        <div className="stg-site">
          <BrowserFrame className="stg-browser" url={`${product.slug}.example`}>{shot(0, { sample: v })}</BrowserFrame>
          <PhoneFrame className="stg-phone stg-phone--site">{shot(1, { sample: v, dark: true })}</PhoneFrame>
        </div>
      );
  }
}
