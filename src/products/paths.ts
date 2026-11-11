// The products URLs. No browser code here, so the build scripts can import it.
export const HOME = '/products';
export const productPath = (slug: string) => `${HOME}/${slug}`;

/**
 * A half-width copy sits beside every screenshot (`list.jpg` has `list-960.jpg`), so a phone does not
 * download the desktop file. A test fails if a screenshot in data.ts has no copy.
 */
export const srcSet = (src: string) => (src.endsWith('.jpg') ? `${src.slice(0, -4)}-960.jpg 960w, ${src} 1920w` : undefined);
