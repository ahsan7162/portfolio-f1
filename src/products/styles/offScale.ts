/** Raw values that sit off the scales in the page CSS today, by family. Merge one into a step (shown as before and after
    renders), then delete it here: tokens.test.ts holds the page CSS to this list, and /products/system shows it. */
export const OFF_SCALE: Record<string, string[]> = {
  radius: ['1px', '5px', '9px'],
  'font-size': ['120px', '68px', '25px', '14px', '15px', '0.9688rem', '0.72rem', '0.7rem', '0.76rem', '0.78rem', '0.86rem', '0.9rem', '0.95rem', '0.98rem', '1.05rem', '1.15rem', '1.2rem'],
  weight: [],
  'line-height': ['0.62', '0.74', '0.9', '0.92', '0.95', '1.04', '1.05', '1.1', '1.12', '1.2', '1.25', '1.3', '1.45'],
  tracking: ['0.01em', '-0.045em', '0.05em', '-0.022em', '-0.035em'],
  layer: [],
  duration: ['1s', '1.5s', '3.6s', '0.28s'],
  space: ['1px', '3px', '5px', '7px', '9px', '11px', '15px', '34px', '44px', '46px', '60px', '72px', '80px', '90px', '92px', '100px', '104px', '120px'],
};
