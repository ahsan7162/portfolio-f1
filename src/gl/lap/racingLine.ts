import * as THREE from 'three';
import { PALETTE } from '@/art/palette';
import type { disposables } from '../dispose';
import { srgb } from '../glsl';
import { ribbon } from './circuit';

type Keep = ReturnType<typeof disposables>['keep'];

const SEGS = 700;
/** Light pulses on the racing line: how many fit in one lap, and how fast they run next to the car. */
const PULSES = 6, PULSE_RATE = 1.5;

/**
 * The racing line: a red ribbon revealed up to the car, and pulses of light running along
 * it towards the car, driven by the scroll, not a clock: their phase is the lap progress,
 * so they run backwards on the way up and stand still when you stop, and they fade out as
 * the scrolling slows. At rest the line is exactly the plain red one. A wide additive strip
 * with a soft edge stands in for bloom (no extra passes).
 */
export function buildRacingLine(scene: THREE.Scene, curve: THREE.CatmullRomCurve3, keep: Keep) {
  const lineGeo = keep(ribbon(curve, 0.05, 0.006, SEGS));
  const lineMat = keep(new THREE.MeshBasicMaterial({ fog: false }));
  scene.add(new THREE.Mesh(lineGeo, lineMat));

  const glowGeo = keep(ribbon(curve, 0.24, 0.007, SEGS, undefined, true));
  const glowMat = keep(new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uPhase: { value: 0 }, uGlow: { value: 0 }, uHead: { value: 0 }, uAc: { value: new THREE.Color() }, uFg: { value: new THREE.Color() } },
    vertexShader: /* glsl */ `
      out vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in vec2 vUv;
      out vec4 outColor;
      uniform float uPhase, uGlow, uHead;
      uniform vec3 uAc, uFg;
      void main() {
        float across = vUv.y * 2.0 - 1.0;
        float core = exp(-across * across * 24.0), halo = exp(-across * across * 3.0);
        // Bright head, long fading tail behind it, moving in race direction (uv.x grows with the lap).
        float pulse = pow(fract(vUv.x * ${PULSES.toFixed(1)} - uPhase), 3.0);
        float head = smoothstep(0.0, 0.02, uHead - vUv.x); // fades into the car
        float a = uGlow * pulse * head * (core + halo * 0.55);
        outColor = vec4(mix(uAc, uFg, core * pulse * 0.7), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.renderOrder = 2;
  scene.add(glow); // left visible until the first lap frame, so the warm-up compiles it

  let strength = 0, lastProgress = -1, lastAt = 0;
  return {
    glow,
    /**
     * Reveal both up to `t` (the car's place on the curve, 0..1), and ease the pulses'
     * strength toward how fast `progress` moves, over about 0.2 s. True while they glow.
     */
    update(progress: number, t: number, lap: number, now: number) {
      lineGeo.setDrawRange(0, Math.floor(t * SEGS) * 6);
      const dt = Math.min(0.05, (now - lastAt) / 1000);
      lastAt = now;
      const speed = lastProgress < 0 || dt <= 0 ? 0 : Math.abs(progress - lastProgress) / dt;
      lastProgress = progress;
      strength += (Math.min(1, speed / 0.5) - strength) * (1 - Math.exp(-dt / 0.2));
      if (strength < 0.004) strength = 0;
      glowMat.uniforms.uPhase.value = progress * lap * PULSES * PULSE_RATE;
      glowMat.uniforms.uGlow.value = strength;
      glowMat.uniforms.uHead.value = t;
      glowGeo.setDrawRange(0, Math.floor(t * SEGS) * 6);
      glow.visible = strength > 0;
      return strength > 0;
    },
    /** Forget the last frame, so the next one starts afresh. */
    forget() { lastProgress = -1; },
    paint() {
      lineMat.color.set(PALETTE.ac);
      srgb(PALETTE.ac, glowMat.uniforms.uAc.value); srgb(PALETTE.fg, glowMat.uniforms.uFg.value);
    },
  };
}
