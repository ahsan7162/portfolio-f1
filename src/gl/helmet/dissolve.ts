import * as THREE from 'three';
import { PALETTE } from '@/art/palette';
import { DISSOLVE_GLSL, srgb } from '../glsl';

/** The glowing seam's colour, shared by every part (repainted with the livery). */
export const seamColour = { value: srgb(PALETTE.ac) };

/**
 * The dissolve-in, patched into a standard material: the part appears bottom to top
 * through a noisy edge with a glowing accent seam, wireframe to solid. `reveal` is 0 for
 * nothing, 1 for fully built.
 */
export function withReveal<T extends THREE.Material>(mat: T, reveal: { value: number }): T {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uReveal = reveal;
    shader.uniforms.uSeamColour = seamColour;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uReveal;
uniform vec3 uSeamColour;
varying vec3 vObjPos;
${DISSOLVE_GLSL}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (dissolveEdge(vObjPos) > uReveal) discard;')
      // The inside of the shell (seen while it dissolves) is a dark liner, not the painted livery.
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = vec3(0.025);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += uSeamColour * smoothstep(uReveal - 0.035, uReveal, dissolveEdge(vObjPos)) * step(uReveal, 1.0) * 4.0;`);
  };
  return mat;
}
