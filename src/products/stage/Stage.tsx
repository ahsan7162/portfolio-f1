// The stage shows a product the way its kind calls for: a live demo, phones, or a browser.
import type { DemoProps, Media, Product, StageKind } from '../types';
import { BrowserFrame, PhoneFrame, Shot, WindowFrame } from './Frames';
import { JiraDemo } from './JiraDemo';
import { OpenUiDemo } from './OpenUiDemo';
import { PrDemo } from './PrDemo';
import '../styles/stage.css';

/** What a live demo's number counts, as two short lines. A demo without an entry shows no number. */
export const TALLY: Partial<Record<StageKind, [string, string]>> = { 'pr-demo': ['blockers', 'left'] };

export function Stage({ product, active, onTally }: { product: Product } & DemoProps) {
  const v = product.variant ?? 0;
  /** The product's own picture for a slot on the stage, or the sample screen that stands in for it. */
  const shot = (i: number, standIn: Media) => <Shot media={product.shots?.[i] ?? standIn} kind={product.kind} />;
  switch (product.stage) {
    case 'pr-demo': return <PrDemo active={active} onTally={onTally} />;
    case 'jira-demo': return <JiraDemo active={active} onTally={onTally} />;
    case 'openui-demo': return <OpenUiDemo active={active} />;
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
