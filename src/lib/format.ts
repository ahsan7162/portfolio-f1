/** Seconds as a lap time, m:ss.mmm. Rounded to the millisecond first, so 59.9996 s reads 1:00.000, not 0:60.000. */
export const lapTime = (s: number) => {
  const ms = Math.round(s * 1000);
  return `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
};

/** A whole number with thousands separators: 2520 → "2,520". */
export const thousands = (n: number) => Math.round(n).toLocaleString('en-US');

/** An index as two digits, like a timing board: 1 → "01". */
export const twoDigits = (n: number) => String(n).padStart(2, '0');
