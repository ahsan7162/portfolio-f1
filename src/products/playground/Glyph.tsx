// A block's small schematic, drawn from its rectangles in catalog.ts. Styled by .pg-glyph (playground.css, system.css).
import type { Rect } from './catalog';

export function Glyph({ rects, className = 'pg-glyph' }: { rects: Rect[]; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 28" aria-hidden="true">
      {rects.map(([x, y, w, h, k]) => <rect key={`${x},${y},${w},${h}`} x={x} y={y} width={w} height={h} rx={k === 2 ? 2 : 1} data-k={k} />)}
    </svg>
  );
}
