import { useSyncExternalStore } from 'react';
import { glPossible, glWanted, isPhone, setGlPref } from '@/motion/prefs';

/**
 * Whether the page's 3D is on, shared by the nav's 2D / 3D toggle, GLCanvas and the Lap.
 * `able`: the 3D can run here at all. `toggle`: the nav shows the toggle (phones only).
 */
type State = { able: boolean; on: boolean; toggle: boolean };

let state: State | null = null;
/** Bumped on every switch after load, so sections can rebuild (see the Lap's deps). */
let version = 0;
const subs = new Set<() => void>();

const read = (): State => {
  if (!state) {
    const able = glPossible();
    state = { able, on: able && glWanted(), toggle: able && isPhone() };
  }
  return state;
};

function set(on: boolean) {
  const s = read();
  if (!s.able || s.on === on) return;
  state = { ...s, on };
  version++;
  subs.forEach(f => f());
}

const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };

/** The current state, read straight (not through React), for setup code. */
export const gl3d = () => read();
export const onGl3d = subscribe;

/** The toggle: switch now, and keep the pick for later visits. */
export function choose3d(on: boolean) {
  setGlPref(on ? 'on' : 'off');
  set(on);
}

/**
 * The 3D went away on its own (a lost context, frames far too slow): show it off, and
 * let the next visit start the device's way again, not with a pick it couldn't keep.
 */
export function lost3d() {
  setGlPref(null);
  set(false);
}

// The prerendered HTML can't know the device: it has no toggle, and a phone adds it as it hydrates.
const SERVER: State = { able: false, on: false, toggle: false };

/** For components showing the state (the toggle). */
export const use3d = () => useSyncExternalStore<State>(subscribe, read, () => SERVER);

/** 0 through hydration, then bumped on each switch: a dependency that rebuilds a section's motion. */
export const use3dVersion = () => useSyncExternalStore(subscribe, () => version, () => 0);
