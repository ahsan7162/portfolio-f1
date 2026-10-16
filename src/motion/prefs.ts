const q = () => (typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search));

const isBrowser = () => typeof window !== 'undefined';

/** Motion is on unless the OS asks for reduced motion or `?nomotion` is set. */
export function motionEnabled() {
  if (!isBrowser()) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !q().has('nomotion');
}

export const debug = () => isBrowser() && q().has('debug');

let webgl2: boolean | undefined;

/** Renderers that draw WebGL on the CPU: a blocked GPU, a VM or remote desktop, headless test machines. */
const SOFTWARE_GL = /swiftshader|llvmpipe|software|basic render/i;

/**
 * three.js (r163+) needs WebGL2, on a real GPU: drawn on the CPU, the scenes freeze the
 * page for seconds. Probed once: each probe opens a real context, and browsers drop the
 * oldest live one past their limit (which could be the Stage's), so it is released.
 */
function hasWebGL2() {
  if (webgl2 === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      // Chrome and Safari mask RENDERER ("WebKit WebGL") and name the GPU in the debug
      // extension; Firefox names it in RENDERER and deprecates the extension.
      const masked = !!gl && /webkit webgl/i.test(String(gl.getParameter(gl.RENDERER)));
      const info = masked ? gl.getExtension('WEBGL_debug_renderer_info') : null;
      const renderer = gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : '';
      webgl2 = !!gl && !SOFTWARE_GL.test(renderer);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}

/** WebGL scenes: off for reduced motion, Save-Data, weak devices, no WebGL2 or no GPU, or `?nogl`. */
export function glEnabled() {
  if (!motionEnabled() || q().has('nogl')) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 4) return false;
  return hasWebGL2();
}

/**
 * Screens too short for pinned sections (landscape phones). A plain media query, so
 * the About pin and the helmet path timed against it always agree, whatever the fonts.
 */
export const SHORT_SCREEN = '(max-height: 499px)';

export const isTouch = () => isBrowser() && window.matchMedia('(hover: none)').matches;
/** A mouse or trackpad (hover and a precise pointer): pointer-following effects run only on these. */
export const finePointer = () => isBrowser() && !isTouch() && window.matchMedia('(pointer: fine)').matches;
export const isMobile = () => isBrowser() && window.matchMedia('(max-width: 767px)').matches;
