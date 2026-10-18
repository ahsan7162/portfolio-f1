/** Seconds as a lap time, m:ss.mmm. */
export const lapTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;

/** A whole number with thousands separators: 2520 → "2,520". */
export const thousands = (n: number) => Math.round(n).toLocaleString('en-US');

/** An index as two digits, like a timing board: 1 → "01". */
export const twoDigits = (n: number) => String(n).padStart(2, '0');
