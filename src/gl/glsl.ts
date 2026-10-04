// GLSL shared between shaders, so effects that must line up are written once.

/** A hex colour as a GLSL vec3 literal (its sRGB components, 0 to 1). */
export const vec3 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `vec3(${[n >> 16, (n >> 8) & 255, n & 255].map(c => (c / 255).toFixed(3)).join(', ')})`;
};

/** Simplex noise + 3-octave fbm: the page's contour background and the lap's contour ground. */
export const NOISE_GLSL = /* glsl */ `
vec2 hash(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
float noise(vec2 p){
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x+p.y)*K1); vec2 a = p - i + (i.x+i.y)*K2;
  float m = step(a.y, a.x); vec2 o = vec2(m, 1.0-m);
  vec2 b = a - o + K2; vec2 c = a - 1.0 + 2.0*K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h*vec3(dot(a, hash(i)), dot(b, hash(i+o)), dot(c, hash(i+1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

/**
 * Isolines of a height field scaled to `f` (fragment shaders only), each about a
 * pixel wide and anti-aliased: `line` on every contour, `index` 1 on every 5th
 * (drawn brighter), `racing` the one accent line at f = 3.5.
 */
export const CONTOURS_GLSL = /* glsl */ `
struct Contours { float line, index, racing; };
Contours contours(float f){
  float w = max(fwidth(f), 1e-4);
  return Contours(
    clamp(1.0 - abs(fract(f + 0.5) - 0.5) / w * 0.9, 0.0, 1.0),
    1.0 - step(0.5, mod(floor(f + 0.5), 5.0)),
    clamp(1.0 - abs(f - 3.5) / w * 0.55, 0.0, 1.0));
}
`;

/**
 * The helmet's dissolve edge at an object-space point: 0 at the neck to 1 at the
 * crown, broken up by value noise. The shell discards everything above the reveal
 * value (buildHelmet) and each exit spark leaves as the edge passes it (particles),
 * so both read this one function.
 */
export const DISSOLVE_GLSL = /* glsl */ `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
float dissolveEdge(vec3 p){ return (p.y + 1.15) / 2.3 * 0.82 + vnoise(p * 5.0) * 0.18; }
`;
