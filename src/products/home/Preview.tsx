// A small look at a product: its screenshot, or a sample screen in the frame its kind calls for.
import { BrowserFrame, PhoneFrame, SampleScreen } from '../stage/Frames';
import type { Product } from '../types';

export function Preview({ product }: { product: Product }) {
  if (product.thumb) return <img className="pv-img" src={product.thumb} alt="" loading="lazy" />;
  const variant = product.variant ?? 0;
  return product.kind === 'app'
    ? <PhoneFrame className="pv-phone"><SampleScreen kind="app" variant={variant} /></PhoneFrame>
    : <BrowserFrame className="pv-browser" url={`${product.slug}.example`}><SampleScreen kind="site" variant={variant} /></BrowserFrame>;
}
