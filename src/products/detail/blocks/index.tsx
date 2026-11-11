// The detail page's blocks: every block type and the component that draws it. Adding one is in DESIGN.md.
import { memo, type ComponentType } from 'react';
import { pad } from '../../format';
import type { Block, BlockOf, Product } from '../../types';
import { Features } from './Features';
import { Split } from './Split';
import { Showcase } from './Showcase';
import { Compare } from './Compare';
import { Bento } from './Bento';
import { Chips } from './Chips';
import { Code } from './Code';
import { Notes } from './Notes';
import { Specs } from './Specs';
import { Marquee } from './Marquee';
import { Scores } from './Scores';
import { Timeline } from './Timeline';
import { Faq } from './Faq';
import { Quote } from './Quote';
import { Palette } from './Palette';
import { Film } from './Film';
import { Get } from './Get';
import { Keys } from './Keys';
import { Screens } from './Screens';
import type { BlockProps } from './shared';
import { StageBlock } from './StageBlock';
import { Statement } from './Statement';
import { Stats } from './Stats';
import { Steps } from './Steps';
import { Text } from './Text';

const registry: { [K in Block['type']]: ComponentType<BlockProps<K>> } = {
  stage: StageBlock,
  statement: Statement,
  text: Text,
  features: Features,
  steps: Steps,
  stats: Stats,
  keys: Keys,
  screens: Screens,
  film: Film,
  get: Get,
  split: Split,
  showcase: Showcase,
  compare: Compare,
  bento: Bento,
  marquee: Marquee,
  scores: Scores,
  timeline: Timeline,
  faq: Faq,
  quote: Quote,
  palette: Palette,
  code: Code,
  specs: Specs,
  notes: Notes,
  chips: Chips,
};

function One<K extends Block['type']>({ block, product, n }: { block: BlockOf<K>; product: Product; n?: string }) {
  const C: ComponentType<BlockProps<K>> = registry[block.type];
  return <C block={block} product={product} n={n} />;
}

/** A page's blocks in order, each with a key, its label if it has one, and that label's number down the page (01, 02, …). */
export function numbered(blocks: Block[]) {
  let count = 0;
  return blocks.map((block, i) => {
    const label = 'label' in block && block.label ? block.label : undefined;
    return { block, key: `${i}-${block.type}`, label, n: label ? pad(++count) : undefined };
  });
}

export const Blocks = memo(function Blocks({ product }: { product: Product }) {
  return (
    <div className="dt-blocks">
      {numbered(product.blocks).map(it => <One key={it.key} block={it.block} product={product} n={it.n} />)}
    </div>
  );
});
