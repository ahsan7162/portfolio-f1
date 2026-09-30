import * as THREE from 'three';

// Topographic contour background (Lando's contour lines), one full-screen
// triangle. Domain-warped fbm height field drawn as anti-aliased isolines, a
// brighter index line every 5th contour, and one accent "racing line".
const vert = /* glsl */ `
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime, uScroll, uVel;
uniform vec3 uColA, uColB, uLine, uAccent;
uniform float uLineAlpha;

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

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.35;
  p.y += uScroll * 2.4;
  // Fast scroll stretches the field vertically, like speed.
  p.y *= 1.0 / (1.0 + clamp(abs(uVel) * 0.012, 0.0, 0.6));
  vec2 q = vec2(fbm(p + vec2(0.0, uTime*0.015)), fbm(p + vec2(5.2, 1.3) - uTime*0.01));
  float h = fbm(p + 1.4*q);

  float f = h * 14.0;
  // Distance to the nearest isoline in pixels, for a crisp 1px anti-aliased line.
  float line = clamp(1.0 - abs(fract(f + 0.5) - 0.5) / max(fwidth(f), 1e-4) * 0.9, 0.0, 1.0);
  float index = 1.0 - step(0.5, mod(floor(f + 0.5), 5.0));
  float racing = clamp(1.0 - abs(f - 3.5) / max(fwidth(f), 1e-4) * 0.55, 0.0, 1.0);

  vec3 bg = mix(uColB, uColA, smoothstep(0.0, 1.0, vUv.y));
  float vign = smoothstep(1.25, 0.25, length((vUv - 0.5) * vec2(aspect, 1.0)));
  vec3 col = bg;
  col = mix(col, uLine, line * uLineAlpha * (0.55 + index * 0.9) * (0.5 + 0.5 * vign));
  col = mix(col, uAccent, racing * 0.22 * vign);
  outColor = vec4(col, 1.0);
}`;

export function createField() {
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 }, uScroll: { value: 0 }, uVel: { value: 0 },
    uColA: { value: new THREE.Color('#0b0b0c') }, uColB: { value: new THREE.Color('#141417') },
    uLine: { value: new THREE.Color('#f4f4ed') }, uAccent: { value: new THREE.Color('#ff2438') },
    uLineAlpha: { value: 0.09 },
  };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, uniforms, dispose: () => { geo.dispose(); mat.dispose(); } };
}
