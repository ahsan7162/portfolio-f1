import * as THREE from 'three';
import { PALETTE } from '@/art/palette';
import { CONTOURS_GLSL, NOISE_GLSL } from './glsl';

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
uniform vec2 uPointer;
uniform float uLens;

${NOISE_GLSL}
${CONTOURS_GLSL}
void main(){
  float aspect = uRes.x / uRes.y;
  // Pointer lens (desktop): the map magnifies slightly around the cursor and its lines brighten.
  vec2 dp = (vUv - uPointer) * vec2(aspect, 1.0);
  float lens = exp(-dot(dp, dp) / 0.016) * uLens;
  vec2 uv = uPointer + (vUv - uPointer) * (1.0 - 0.32 * lens);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.35;
  p.y += uScroll * 2.4;
  // Fast scroll stretches the field vertically, like speed.
  p.y *= 1.0 / (1.0 + clamp(abs(uVel) * 0.012, 0.0, 0.6));
  vec2 q = vec2(fbm(p + vec2(0.0, uTime*0.015)), fbm(p + vec2(5.2, 1.3) - uTime*0.01));
  float h = fbm(p + 1.4*q);

  Contours c = contours(h * 14.0);

  vec3 bg = mix(uColB, uColA, smoothstep(0.0, 1.0, vUv.y));
  float vign = smoothstep(1.25, 0.25, length((vUv - 0.5) * vec2(aspect, 1.0)));
  vec3 col = bg;
  col = mix(col, uLine, c.line * uLineAlpha * (0.55 + c.index * 0.9) * (0.5 + 0.5 * vign) * (1.0 + 1.4 * lens));
  col = mix(col, uAccent, c.racing * 0.22 * vign);
  outColor = vec4(col, 1.0);
}`;

export function createField() {
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 }, uScroll: { value: 0 }, uVel: { value: 0 },
    uColA: { value: new THREE.Color(PALETTE.carbon) }, uColB: { value: new THREE.Color(PALETTE.panel) },
    uLine: { value: new THREE.Color(PALETTE.fg) }, uAccent: { value: new THREE.Color(PALETTE.ac) },
    uLineAlpha: { value: 0.09 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) }, uLens: { value: 0 },
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
