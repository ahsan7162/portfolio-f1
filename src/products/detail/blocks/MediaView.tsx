// A screen in the frame its product's kind calls for: a real image, or a dummy product's sample screen.
import { KindFrame, Shot } from '../../stage/Frames';
import type { Media, Product } from '../../types';
import '../../styles/blocks-visual.css';

/** Frames take their width from `className`. */
export function MediaView({ media, product, className }: { media: Media; product: Product; className?: string }) {
  const image = 'src' in media;
  const body = <Shot media={media} kind={product.kind} />;
  return (
    <KindFrame kind={product.kind} slug={product.slug} title={product.name} className={`bv-media bv-media--${product.kind}${className ? ` ${className}` : ''}`}>
      {/* A plugin's window takes its height from its content: a sample screen needs a box to fill. */}
      {image || product.kind !== 'plugin' ? body : <div className="bv-media-win">{body}</div>}
    </KindFrame>
  );
}
