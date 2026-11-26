// Usage Explorer's limits rules, copied from the plugin (github.com/ahsan7162/bb-plugin-claude-usage v0.1.2, usage.ts for
// projectWindow and the windows, app.tsx for readWindow, verdictOf, projectionOf and fmtDuration), so the demo reads a window
// and words its verdict exactly as the plugin does. MIT License, Copyright (c) 2026 Muhammad Ahsan. Unchanged.

export const FIVE_HOURS = 5 * 3_600_000;
export const ONE_WEEK = 7 * 86_400_000;

export interface Window {
  kind: 'five-hour' | 'weekly';
  label: string;
  usedPercent: number;
  resetsAt: string | null;
  windowMs: number;
}

/**
 * Where a quota window lands at the current pace. `usedPercent` was spent
 * over `elapsedMs` of a `windowMs` window. Returns the percent at the reset,
 * and how long until 100% when that comes before the reset.
 */
export function projectWindow(usedPercent: number, elapsedMs: number, windowMs: number): { atReset: number; fullInMs: number | null } | null {
  if (elapsedMs <= 0 || windowMs <= 0 || elapsedMs > windowMs) return null;
  if (usedPercent >= 100) return { atReset: usedPercent, fullInMs: 0 };
  const rate = usedPercent / elapsedMs;
  const fullInMs = rate > 0 ? (100 - usedPercent) / rate : null;
  return { atReset: rate * windowMs, fullInMs: fullInMs !== null && fullInMs <= windowMs - elapsedMs ? fullInMs : null };
}

export function fmtDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export type WindowRead = {
  w: Window;
  leftPct: number;
  leftMs: number | null;
  proj: { atReset: number; fullInMs: number | null } | null;
  state: 'room' | 'tight' | 'out';
};

export function readWindow(w: Window, now: number): WindowRead {
  const resetAt = w.resetsAt ? Date.parse(w.resetsAt) : NaN;
  const leftMs = Number.isFinite(resetAt) ? resetAt - now : null;
  const elapsed = leftMs !== null ? w.windowMs - leftMs : null;
  const proj = elapsed !== null ? projectWindow(w.usedPercent, elapsed, w.windowMs) : null;
  const state = w.usedPercent >= 100 || proj?.fullInMs != null ? 'out' : w.usedPercent >= 75 || (proj !== null && proj.atReset >= 90) ? 'tight' : 'room';
  return { w, leftPct: Math.max(0, 100 - w.usedPercent), leftMs, proj, state };
}

/** The decision a window answers, in plain words. */
export function verdictOf(r: WindowRead): string {
  if (r.w.kind === 'five-hour') {
    if (r.state === 'out') return r.w.usedPercent >= 100 ? 'Wait for the reset.' : 'Wrap up: this session is running out.';
    if (r.state === 'tight') return 'Finish small things first.';
    return 'Room for a big task.';
  }
  if (r.w.usedPercent === 0) return 'Untouched this week.';
  if (r.state === 'out') return 'You will run out before the week resets.';
  if (r.state === 'tight') return 'Ease off to last the week.';
  return 'On pace for the week.';
}

/** The projection line kept from the classic meters. */
export function projectionOf(r: WindowRead): string | null {
  if (r.w.usedPercent >= 100) return r.leftMs !== null ? `Limit reached. Back in ${fmtDuration(r.leftMs)}.` : 'Limit reached.';
  if (r.proj?.fullInMs != null) return `At this pace the limit is hit in ${fmtDuration(r.proj.fullInMs)}.`;
  if (r.proj) return `On pace to use ${Math.round(Math.min(100, r.proj.atReset))}% before it resets.`;
  return null;
}

/** The headline: the first window that is out, else the first that is tight, else the first (app.tsx, AllClearTop). */
export const leadOf = (reads: WindowRead[]) => reads.find(r => r.state === 'out') ?? reads.find(r => r.state === 'tight') ?? reads[0];
