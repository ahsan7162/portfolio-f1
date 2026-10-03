import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

/**
 * The helmet's exit: points sampled from the shell, each with the livery colour at
 * its spot. As the shell dissolves (the intro's reveal running backwards, top
 * first), every point is released at the moment the edge passes it and streams
 * up and outwards like sparks, fading as it goes. Positions are computed in the
 * vertex shader from the one scrubbed reveal value, so there is no per-frame CPU
 * work, and scrolling back up pulls them home.
 */
export function createParticles(shell: THREE.Mesh, livery: HTMLCanvasElement | undefined, count: number, reveal: { value: number }) {
  const sampler = new MeshSurfaceSampler(shell).build();
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), col = new Float32Array(count * 3), seed = new Float32Array(count * 2);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color(), uv = new THREE.Vector2();
  const px = livery?.getContext('2d')?.getImageData(0, 0, livery.width, livery.height);
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n, undefined, uv);
    p.toArray(pos, i * 3); n.toArray(nrm, i * 3);
    if (px) {
      const x = Math.min(px.width - 1, Math.floor(uv.x * px.width)), y = Math.min(px.height - 1, Math.floor((1 - uv.y) * px.height));
      const k = (y * px.width + x) * 4;
      c.setRGB(px.data[k] / 255, px.data[k + 1] / 255, px.data[k + 2] / 255, THREE.SRGBColorSpace);
    } else c.set('#ff2438');
    // Dark carbon would vanish against the page: lift it to a warm grey ember.
    if (c.r + c.g + c.b < 0.25) c.setRGB(0.32, 0.3, 0.3);
    c.toArray(col, i * 3);
    seed[i * 2] = Math.random(); seed[i * 2 + 1] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6); // they travel far from the shell

  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uReveal: reveal, uSize: { value: 1 } },
    vertexShader: /* glsl */ `
      in vec2 aSeed;
      in vec3 color;
      uniform float uReveal, uSize;
      out vec3 vCol;
      out float vAlpha;
      float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
      void main() {
        // Same edge as the shell's dissolve, so each point leaves exactly where the shell disappears.
        float d = (position.y + 1.15) / 2.3 * 0.82 + vnoise(position * 5.0) * 0.18;
        float life = clamp((d - uReveal) / 0.55, 0.0, 1.0);
        float e = 1.0 - (1.0 - life) * (1.0 - life); // fast release, slowing down
        vec3 drift = normal * (0.5 + aSeed.x) + vec3(sin(aSeed.y * 6.283) * 0.6, 2.2 + aSeed.y * 1.6, cos(aSeed.y * 6.283) * 0.6);
        vec3 p = position + drift * e * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 + aSeed.x) * (1.0 - 0.5 * life) / -mv.z;
        vCol = color + vec3(1.0, 0.14, 0.22) * (1.0 - life) * 0.6; // hot as they leave
        // Fade in over the first stretch: freshly released sparks pile up on the edge, and at
        // full strength their additive glow would paint it pink.
        vAlpha = smoothstep(0.0, 0.18, life) * (1.0 - life);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in vec3 vCol;
      in float vAlpha;
      out vec4 outColor;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (vAlpha <= 0.0 || r > 0.5) discard;
        outColor = vec4(vCol * vAlpha * smoothstep(0.5, 0.1, r), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  return {
    points,
    /** Point size scales with the drawing buffer's pixel ratio. */
    setPixelRatio(pr: number) { mat.uniforms.uSize.value = 26 * pr; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
