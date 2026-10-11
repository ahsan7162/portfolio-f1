import * as THREE from 'three';
import { PALETTE } from '@/art/palette';
import { disposables } from '../dispose';
import { DISSOLVE_GLSL, vec3 } from '../glsl';
import { liveryTextures, roundedMask } from './livery';
import { FRONT_PHI, PHI_START, shellGeometry, shellNormal, shellPoint, THETA_LEN, VISOR } from './shape';

export type Helmet = {
  group: THREE.Group;
  /** 0 = nothing, 1 = fully built. Drives the dissolve on every solid part. */
  reveal: { value: number };
  /** Strength of the glowing seam at the dissolve edge (1, the intro's). */
  seam: { value: number };
  /** 0..1 how much of the wireframe is drawn; wireOpacity fades it out. */
  wire: { draw: number; opacity: number };
  update: () => void;
  dispose: () => void;
};

// Dissolve-in shader chunk: parts appear bottom to top through a noisy edge
// with a glowing accent seam, like Lando's wireframe-to-solid hero helmet.
const seam = { value: 1 };
function withReveal<T extends THREE.Material>(mat: T, reveal: { value: number }): T {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uReveal = reveal;
    shader.uniforms.uSeam = seam;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uReveal, uSeam;
varying vec3 vObjPos;
${DISSOLVE_GLSL}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (dissolveEdge(vObjPos) > uReveal) discard;')
      // The inside of the shell (seen while it dissolves) is a dark liner, not the painted livery.
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = vec3(0.025);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += ${vec3(PALETTE.ac)} * smoothstep(uReveal - 0.035, uReveal, dissolveEdge(vObjPos)) * step(uReveal, 1.0) * 4.0 * uSeam;`);
  };
  return mat;
}

export async function buildHelmet(opts: { anisotropy: number }): Promise<Helmet> {
  // Shell resolution: smooth shading and the livery texture carry the detail, so this is plenty.
  // Same on phones: the helmet fills more of a small screen, so a coarser shell shows its facets.
  const seg = { w: 44, h: 28 };
  const reveal = { value: 0 };
  const group = new THREE.Group();
  const { keep, dispose } = disposables();

  const { map } = await liveryTextures(opts.anisotropy);
  keep(map);

  // Matte satin shell over carbon (no clear coat); the glossy visor contrasts with it.
  const shellMat = keep(withReveal(new THREE.MeshStandardMaterial({
    map, roughness: 0.75, metalness: 0.1,
    side: THREE.DoubleSide, envMapIntensity: 1.5,
  }), reveal));
  const shell = new THREE.Mesh(keep(shellGeometry(seg)), shellMat);
  group.add(shell);

  // Visor seal (rubber) and smoked visor on top of it.
  const mask = keep(roundedMask());
  const patch = (margin: number, offset: number) => keep(shellGeometry({
    w: 16, h: 7, offset,
    phiStart: FRONT_PHI - VISOR.halfWidth - margin, phiLength: (VISOR.halfWidth + margin) * 2,
    thetaStart: VISOR.top - margin, thetaLength: VISOR.bottom - VISOR.top + margin * 2,
  }));
  const seal = new THREE.Mesh(patch(0.03, 0.006), keep(withReveal(new THREE.MeshStandardMaterial({
    color: '#050506', roughness: 0.7, alphaMap: mask, alphaTest: 0.5,
  }), reveal)));
  // Glossy black visor: plain standard material (no clear coat or rainbow sheen), still reflective.
  const visor = new THREE.Mesh(patch(0, 0.02), keep(withReveal(new THREE.MeshStandardMaterial({
    color: '#050506', roughness: 0.05, metalness: 0.7,
    alphaMap: mask, alphaTest: 0.5, envMapIntensity: 1.8,
  }), reveal)));
  group.add(seal, visor);

  // Visor pivots on each side.
  const metal = keep(withReveal(new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.9, roughness: 0.3 }), reveal));
  const pivotGeo = keep(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 16));
  for (const side of [-1, 1]) {
    const phi = FRONT_PHI + side * (VISOR.halfWidth + 0.06);
    const theta = (VISOR.top + VISOR.bottom) / 2;
    const p = shellPoint(phi, theta), n = shellNormal(phi, theta);
    const m = new THREE.Mesh(pivotGeo, metal);
    m.position.copy(p).addScaledVector(n, 0.02);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    group.add(m);
  }

  // Rear spoiler (Gurney-style lip) across the back of the crown.
  const accentPaint = keep(withReveal(new THREE.MeshStandardMaterial({ color: PALETTE.ac, roughness: 0.22 }), reveal));
  const carbonMat = keep(withReveal(new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.3 }), reveal));
  {
    const prof = new THREE.Shape();
    prof.moveTo(0, 0); prof.bezierCurveTo(0.06, 0.02, 0.16, 0.05, 0.22, 0.1); prof.lineTo(0.23, 0.13);
    prof.bezierCurveTo(0.15, 0.09, 0.06, 0.05, 0, 0.035); prof.closePath();
    const geo = keep(new THREE.ExtrudeGeometry(prof, { depth: 0.7, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 6 }));
    geo.translate(0, 0, -0.35);
    const theta = Math.PI * 0.3, phi = PHI_START; // back of the head
    const p = shellPoint(phi, theta), n = shellNormal(phi, theta);
    const wing = new THREE.Mesh(geo, carbonMat);
    wing.position.copy(p).addScaledVector(n, -0.01);
    // Local axes of the extrusion: x = profile length (point it backwards along
    // the surface), y = profile height (the surface normal), z = width (across the head).
    const across = new THREE.Vector3(1, 0, 0);
    const back = new THREE.Vector3().crossVectors(n, across).normalize();
    wing.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(back, n, across));
    group.add(wing);
  }

  // Top air intake scoop above the visor.
  {
    const s = new THREE.Shape();
    const w = 0.14, d = 0.09, r = 0.035;
    s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r);
    s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r);
    s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
    const geo = keep(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 4 }));
    const phi = FRONT_PHI, theta = Math.PI * 0.2;
    const p = shellPoint(phi, theta), n = shellNormal(phi, theta);
    const scoop = new THREE.Mesh(geo, carbonMat);
    scoop.position.copy(p).addScaledVector(n, -0.015);
    scoop.lookAt(scoop.position.clone().add(n));
    group.add(scoop);
    const slot = new THREE.Mesh(keep(new THREE.BoxGeometry(0.2, 0.03, 0.02)), accentPaint);
    slot.position.copy(p).addScaledVector(n, 0.04);
    slot.lookAt(slot.position.clone().add(n));
    group.add(slot);
  }

  // Chin vent below the visor.
  {
    const vent = new THREE.Mesh(keep(shellGeometry({
      w: 12, h: 4, offset: 0.012,
      phiStart: FRONT_PHI - 0.22, phiLength: 0.44, thetaStart: Math.PI * 0.63, thetaLength: Math.PI * 0.05,
    })), keep(withReveal(new THREE.MeshStandardMaterial({ color: '#060607', roughness: 0.9, metalness: 0.2 }), reveal)));
    group.add(vent);
  }

  // Neck roll: a soft tube around the bottom opening.
  {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 96; i++) pts.push(shellPoint(PHI_START + (i / 96) * Math.PI * 2, THETA_LEN).multiplyScalar(0.985));
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const neck = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 40, 0.045, 5, true)),
      keep(withReveal(new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.85 }), reveal)));
    group.add(neck);
  }

  // Wireframe that draws itself before the solid dissolves in.
  const wireGeo = keep(new THREE.WireframeGeometry(shellGeometry({ w: 40, h: 22 })));
  const wireMat = keep(new THREE.LineBasicMaterial({ color: PALETTE.ac, transparent: true, opacity: 0.9, depthWrite: false }));
  const wireLines = new THREE.LineSegments(wireGeo, wireMat);
  wireLines.scale.setScalar(1.004);
  group.add(wireLines);
  const wire = { draw: 0, opacity: 0.9 };
  const wireCount = wireGeo.attributes.position.count;

  // Centre the helmet on its own middle and sit it slightly nose-down.
  group.position.set(0, 0.05, -0.05);
  const pivot = new THREE.Group();
  pivot.add(group);

  return {
    group: pivot,
    reveal,
    seam,
    wire,
    update() {
      wireGeo.setDrawRange(0, Math.floor(wireCount * wire.draw / 2) * 2);
      wireMat.opacity = wire.opacity;
      wireLines.visible = wire.opacity > 0.01 && wire.draw > 0;
    },
    dispose,
  };
}
