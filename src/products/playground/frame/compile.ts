// Turns a written block's TSX into a component. This runs only inside the playground's canvas: a sandboxed frame
// with an opaque origin and no network (main.tsx checks both before it compiles anything), so the code it runs
// can reach nothing of the site, the visitor, or any server.
import type { ComponentType } from 'react';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { transform } from 'sucrase';
import * as format from '../../format';
import * as motion from '../../motion';
import * as types from '../../types';
import * as media from '../../detail/blocks/MediaView';
import * as shared from '../../detail/blocks/shared';
import type { BlockProps } from '../../detail/blocks/shared';

/**
 * What a written block may import, each by the path it would use from detail/blocks/saved/, so a block saved
 * from the playground builds unchanged. Nothing else can be imported.
 */
export const IMPORTS: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '../shared': shared,
  '../MediaView': media,
  '../../../motion': motion,
  '../../../format': format,
  '../../../types': types,
};

export type Written = ComponentType<BlockProps<'custom'>>;

export function compile(name: string, code: string): Written {
  const js = transform(code, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'automatic', production: true, filePath: `${name}.tsx` }).code;
  const module = { exports: {} as Record<string, unknown> };
  const require = (spec: string) => {
    // the block's CSS is applied by the canvas from its CSS pane; the import line stays so the saved file finds it
    if (spec === `./${name}.css`) return {};
    if (!Object.hasOwn(IMPORTS, spec)) throw new Error(`"${spec}" cannot be imported here. A block can import ${Object.keys(IMPORTS).join(', ')} and ./${name}.css.`);
    return IMPORTS[spec];
  };
  // oxlint-disable-next-line typescript/no-implied-eval -- the point of the playground: it runs the visitor's own block, in the sandbox only
  new Function('require', 'module', 'exports', js)(require, module, module.exports);
  const C = module.exports[name] ?? module.exports.default;
  if (typeof C !== 'function') throw new Error(`${name}.tsx must export a component named ${name}.`);
  return C as Written;
}
