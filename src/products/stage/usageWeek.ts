// Usage Explorer's sample week for the demo: invented work hours, Monday to Sunday, run minute by minute the way Claude's
// windows fill. A five-hour session starts at the first work after the last one ended; work stops while it is full; all
// of it also counts toward the weekly windows. What it gives at any minute is read by the plugin's own rules (usageRules.ts).
import { pad } from '../format';
import { FIVE_HOURS, ONE_WEEK, type Window } from './usageRules';

const MIN = 60_000;
const WEEK_MIN = ONE_WEEK / MIN;
/** Monday 00:00 of the sample week (UTC, so the page reads the same everywhere). */
export const WEEK_START = Date.UTC(2026, 10, 2);

/** Each day's work (0 = Monday): [from hour, to hour, session % per hour]. Wednesday afternoon runs hot. */
const WORK: [number, number, number][][] = [
  [[10, 13, 12], [14, 18, 10]],
  [[9, 13, 12], [14, 19, 11]],
  [[9, 13, 16], [14, 20, 22]],
  [[9, 13, 16], [14, 22, 14]],
  [[10, 13, 12], [14, 17, 10]],
  [[11, 14, 6]],
  [],
];
/** How a session percent counts toward the weekly windows and what it costs (invented, at API list prices' scale). */
const WEEKLY_PER = 0.1, FABLE_PER = 0.011, USD_PER = 0.5;

const rateAt = (minute: number) => {
  const day = Math.floor(minute / 1440), hour = (minute % 1440) / 60;
  return WORK[day]?.find(([from, to]) => hour >= from && hour < to)?.[2] ?? 0;
};

export type Moment = {
  /** Minutes since Monday 00:00. */
  minute: number;
  windows: Window[];
  /** Dollars an hour right now, or null when idle. */
  burn: number | null;
  blockCost: number | null;
  today: number;
  week: number;
};

type Tick = { session: number; block: number | null; weekly: number; fable: number; blockCost: number; today: number; week: number; rate: number };

/** The week, worked out once: one entry per minute. */
const TICKS: Tick[] = (() => {
  const out: Tick[] = [];
  let session = 0, block: number | null = null, weekly = 0, fable = 0, blockCost = 0, today = 0, week = 0;
  for (let m = 0; m < WEEK_MIN; m++) {
    if (m % 1440 === 0) today = 0;
    if (block !== null && m >= block + FIVE_HOURS / MIN) { block = null; session = 0; blockCost = 0; }
    const rate = rateAt(m);
    if (rate > 0 && block === null) block = m;
    const used = rate > 0 ? Math.min(rate / 60, 100 - session) : 0;
    session += used; weekly += used * WEEKLY_PER; fable += used * FABLE_PER;
    blockCost += used * USD_PER; today += used * USD_PER; week += used * USD_PER;
    out.push({ session, block, weekly, fable, blockCost, today, week, rate: used > 0 ? rate : 0 });
  }
  return out;
})();

/** The windows and the spend at a minute of the week, in the shapes the plugin reads. */
export function momentAt(minute: number): Moment {
  const m = Math.max(0, Math.min(WEEK_MIN - 1, Math.round(minute)));
  const t = TICKS[m];
  const iso = (min: number) => new Date(WEEK_START + min * MIN).toISOString();
  const weekly = (label: string, used: number): Window => ({ kind: 'weekly', label, usedPercent: used, resetsAt: iso(WEEK_MIN), windowMs: ONE_WEEK });
  return {
    minute: m,
    windows: [
      { kind: 'five-hour', label: 'Session', usedPercent: t.session, resetsAt: t.block === null ? null : iso(t.block + FIVE_HOURS / MIN), windowMs: FIVE_HOURS },
      weekly('Weekly', t.weekly),
      weekly('Weekly · Fable', t.fable),
    ],
    burn: t.rate > 0 ? t.rate * USD_PER : null,
    blockCost: t.block === null ? null : t.blockCost,
    today: t.today,
    week: t.week,
  };
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The clock at a minute of the week: "Thursday, 22:00". */
export function clockAt(minute: number) {
  const m = Math.max(0, Math.min(WEEK_MIN - 1, Math.round(minute)));
  return `${DAYS[Math.floor(m / 1440)]}, ${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`;
}

export const nowAt = (minute: number) => WEEK_START + Math.round(minute) * MIN;
export const WEEK_MINUTES = WEEK_MIN;
/** Where the week rests: Thursday night, the plugin's own screenshot. */
export const REST = 3 * 1440 + 22 * 60;
/** The moments the demo plays to and holds, in order: a calm Monday, Wednesday's session running out, then waiting for it, then Thursday night. */
export const BEATS = [11 * 60, 2 * 1440 + 15 * 60 + 30, 2 * 1440 + 18 * 60 + 50, REST];
