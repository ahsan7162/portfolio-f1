// What the playground's editor and its canvas say to each other, and the checks each side runs on what it hears.
// The canvas is a sandboxed frame that runs code the visitor writes, so the editor treats every message from it as
// untrusted: readFromFrame() keeps only the few shapes listed here, with their numbers in range and their text capped.
import type { Product } from '../types';

/** A block being written in the playground: its name, its TSX and its CSS. */
export interface Source { name: string; code: string; css: string }

export type ToFrame =
  /** Draw this page. `keys` keep each block's identity across edits; `selected` is outlined (-1 for none). */
  | { t: 'render'; product: Product; keys: string[]; selected: number }
  /** Compile these written blocks and use them (sent when the visitor presses Run). */
  | { t: 'code'; sources: Source[] }
  /** Bring block `i` into view. */
  | { t: 'scroll'; i: number }
  /** Scroll the canvas by `by` pixels (while dragging near its edge). */
  | { t: 'nudge'; by: number };

export type FromFrame =
  | { t: 'ready' }
  /** Sent every second, so the editor can tell a canvas stuck in a loop. */
  | { t: 'tick' }
  /** Where each block is, in the canvas's viewport: its top and height, the scroll, the viewport's height. */
  | { t: 'layout'; tops: number[]; heights: number[]; view: number }
  /** The visitor clicked block `i` in the canvas. */
  | { t: 'pick'; i: number }
  /** Block `i` failed to draw. */
  | { t: 'fault'; i: number; message: string }
  /** A written block compiled, or did not. */
  | { t: 'built'; name: string; error: string | null };

/** A written block's name: a component name, so it can be saved as <Name>.tsx and imported by that name. */
export const NAME = /^[A-Z][A-Za-z0-9]{0,39}$/;
export const LIMITS = { blocks: 200, code: 200_000, css: 100_000, sources: 24, message: 2_000 };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e7;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null);

/**
 * What the editor accepts from the canvas: a fresh object of a known shape, or null. `count` is how many blocks
 * the page has, so an index from the canvas always names a real block.
 */
export function readFromFrame(data: unknown, count: number): FromFrame | null {
  if (!isObject(data) || typeof data.t !== 'string') return null;
  switch (data.t) {
    case 'ready':
    case 'tick':
      return { t: data.t };
    case 'layout': {
      const { tops, heights, view } = data;
      if (!Array.isArray(tops) || !Array.isArray(heights) || tops.length !== heights.length || tops.length > LIMITS.blocks) return null;
      if (!tops.every(isNum) || !heights.every(h => isNum(h) && h >= 0) || !isNum(view) || view < 0) return null;
      return { t: 'layout', tops: [...tops], heights: [...heights], view };
    }
    case 'pick':
      return isInt(data.i, 0, count - 1) ? { t: 'pick', i: data.i } : null;
    case 'fault': {
      const message = text(data.message, LIMITS.message);
      return isInt(data.i, 0, count - 1) && message !== null ? { t: 'fault', i: data.i, message } : null;
    }
    case 'built': {
      const error = data.error === null ? null : text(data.error, LIMITS.message);
      if (typeof data.name !== 'string' || !NAME.test(data.name) || (data.error !== null && error === null)) return null;
      return { t: 'built', name: data.name, error };
    }
    default:
      return null;
  }
}

/** What the canvas accepts from the editor. The canvas is the sandbox, so this only keeps it from tripping on bad input. */
export function readToFrame(data: unknown): ToFrame | null {
  if (!isObject(data) || typeof data.t !== 'string') return null;
  switch (data.t) {
    case 'render': {
      const { product, keys, selected } = data;
      if (!isObject(product) || !Array.isArray(product.blocks) || product.blocks.length > LIMITS.blocks) return null;
      if (!Array.isArray(keys) || keys.length !== product.blocks.length || !keys.every(k => typeof k === 'string')) return null;
      if (!isInt(selected, -1, LIMITS.blocks)) return null;
      return { t: 'render', product: product as unknown as Product, keys: keys, selected };
    }
    case 'code': {
      const { sources } = data;
      if (!Array.isArray(sources) || sources.length > LIMITS.sources) return null;
      const ok = sources.every(s => isObject(s) && typeof s.name === 'string' && NAME.test(s.name)
        && typeof s.code === 'string' && s.code.length <= LIMITS.code && typeof s.css === 'string' && s.css.length <= LIMITS.css);
      return ok ? { t: 'code', sources: (sources as Source[]).map(s => ({ name: s.name, code: s.code, css: s.css })) } : null;
    }
    case 'scroll':
      return isInt(data.i, 0, LIMITS.blocks) ? { t: 'scroll', i: data.i } : null;
    case 'nudge':
      return isNum(data.by) ? { t: 'nudge', by: data.by } : null;
    default:
      return null;
  }
}
