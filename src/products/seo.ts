// What search engines and link previews are told about each products page. One source for the
// browser tab (App.tsx) and the static HTML the build writes (scripts/products-seo.ts).
import { HOME, productPath } from './paths';
import { KINDS, type Product } from './types';

const ME = 'Muhammad Ahsan';

export type PageMeta = {
  /** The URL path, without a trailing slash. */
  path: string;
  /** At most 60 characters, so Google shows it whole: the words people search for first, the name last. */
  title: string;
  /** About 150 characters: what it is, for whom, and why open it. */
  description: string;
  /** A picture for link previews (a path under the site root), if the page has one. */
  image?: string;
  /** Kept out of search: a sample product is fiction. */
  noindex: boolean;
};

export const homeMeta: PageMeta = {
  path: HOME,
  title: `bb Plugins, Apps & Websites Built by ${ME}`,
  description: `Products by ${ME}, full stack and AI developer: bb plugins for GitHub pull requests, Jira tickets and AI coding usage. Try each one live.`,
  noindex: false,
};

export function productMeta(product: Product): PageMeta {
  return {
    path: productPath(product.slug),
    title: product.seo?.title ?? `${product.name}: ${KINDS[product.kind].label} by ${ME}`,
    description: product.seo?.description ?? product.line,
    image: product.thumb,
    noindex: !!product.sample,
  };
}

/** Every products page, the main one first. */
export const allMeta = (products: Product[]): PageMeta[] => [homeMeta, ...products.map(productMeta)];
