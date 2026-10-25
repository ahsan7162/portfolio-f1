import * as THREE from 'three';
import { PALETTE } from '@/art/palette';
import type { disposables } from '../dispose';
import { CONTOURS_GLSL, NOISE_GLSL, srgb } from '../glsl';

type Keep = ReturnType<typeof disposables>['keep'];

/**
 * Contour ground far below the track: the same isolines as the page background, laid flat
 * in world space around `centre`, fading out towards the edges. Returns its repaint.
 */
export function buildGround(scene: THREE.Scene, keep: Keep, centre: THREE.Vector3) {
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(70, 70)), keep(new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uCentre: { value: new THREE.Vector2() }, uPit: { value: new THREE.Color() }, uFg: { value: new THREE.Color() }, uAc: { value: new THREE.Color() } },
    vertexShader: /* glsl */ `
      out vec2 vP;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in vec2 vP;
      out vec4 outColor;
      uniform vec2 uCentre;
      uniform vec3 uPit, uFg, uAc;
      ${NOISE_GLSL}
      ${CONTOURS_GLSL}
      void main() {
        vec2 p = vP * 0.045;
        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
        Contours c = contours(fbm(p + 1.4 * q) * 14.0);
        float fade = smoothstep(26.0, 6.0, length(vP - uCentre));
        vec3 col = uPit;
        col = mix(col, uFg, c.line * 0.13 * (0.55 + c.index * 0.9) * fade);
        col = mix(col, uAc, c.racing * 0.2 * fade);
        outColor = vec4(col, 1.0);
      }`,
  })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(centre.x, -1.1, centre.z);
  ground.material.uniforms.uCentre.value.set(centre.x, centre.z);
  scene.add(ground);
  return () => {
    const u = ground.material.uniforms;
    srgb(PALETTE.pit, u.uPit.value); srgb(PALETTE.fg, u.uFg.value); srgb(PALETTE.ac, u.uAc.value);
  };
}
