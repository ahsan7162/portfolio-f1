// A block written in the playground: its component is looked up by name, first among the ones still being written
// (the playground's canvas provides them), then among the ones saved into saved/.
import { createContext, useContext, type ComponentType } from 'react';
import { saved } from './saved';
import type { BlockProps } from './shared';

/** The components the playground's canvas has compiled, by name. Empty everywhere else. */
export const Written = createContext<Record<string, ComponentType<BlockProps<'custom'>>>>({});

export function Custom(props: BlockProps<'custom'>) {
  const written = useContext(Written);
  const C = Object.hasOwn(written, props.block.name) ? written[props.block.name] : Object.hasOwn(saved, props.block.name) ? saved[props.block.name] : undefined;
  // A page that names a block nobody has written shows nothing, rather than breaking the page around it.
  return C ? <C {...props} /> : null;
}
