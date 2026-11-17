// Live screens: screens drawn in code, looked up by the name a block's `media` gives.
import type { ComponentType } from 'react';
import type { LiveProps } from '../types';
import { DASHES } from './dash';
import { DashView } from './DashView';
import type { LiveName } from './names';

const dash = (name: LiveName) => (p: LiveProps) => <DashView dash={DASHES[name]} {...p} />;

/** Name to component. Typed by LiveName, so a name with no component does not compile. */
const LIVE: Record<LiveName, ComponentType<LiveProps>> = {
  'dash:sales': dash('dash:sales'),
  'dash:branch': dash('dash:branch'),
  'dash:bench': dash('dash:bench'),
  'dash:orders': dash('dash:orders'),
  'dash:pricing': dash('dash:pricing'),
};

export function LiveScreen({ name, ...props }: LiveProps & { name: LiveName }) {
  const C = LIVE[name];
  return <C {...props} />;
}
