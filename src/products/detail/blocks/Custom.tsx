// A block written in the playground: its component is looked up by name, first among the ones still being written
// (the playground's canvas provides them), then among the ones saved into saved/.
import { Component, createContext, useContext, type ComponentType, type ReactNode } from 'react';
import { saved } from './saved';
import type { BlockProps } from './shared';

/** The components the playground's canvas has compiled, by name. Empty everywhere else. */
export const Written = createContext<Record<string, ComponentType<BlockProps<'custom'>>>>({});

/**
 * A saved block that throws draws nothing, rather than taking the page down with it. It keeps its place as an empty
 * .dt-block, so the blocks after it keep their places on the rail. (In the canvas every block has a boundary of its own.)
 */
class Contain extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(e: unknown) { console.error(`The saved block ${this.props.name} could not draw.`, e); }
  override render() { return this.state.failed ? <div className="dt-block" hidden /> : this.props.children; }
}

export function Custom(props: BlockProps<'custom'>) {
  const written = useContext(Written);
  const { name } = props.block;
  if (Object.hasOwn(written, name)) { const W = written[name]; return <W {...props} />; }
  if (Object.hasOwn(saved, name)) { const S = saved[name]; return <Contain name={name}><S {...props} /></Contain>; }
  // a page that names a block nobody has written shows nothing, rather than breaking the page around it
  return null;
}
