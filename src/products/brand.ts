// A product brings its own colour. The page stays neutral and lends that colour to the product's
// own surfaces only (its stage, its detail page), so any screenshot, light, dark or vivid, sits well.
import type { CSSProperties } from 'react';

/** Black or bone, whichever reads on the colour. The raw tokens, not --ground or --ink: a flooded surface redefines those. */
function readable(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? 'var(--black)' : 'var(--bone)';
}

/** Sets --brand and --on-brand. Add the class `pp-branded` where the brand should act as the accent. */
export const brandVars = (brand: string) => ({ '--brand': brand, '--on-brand': readable(brand) }) as CSSProperties;
