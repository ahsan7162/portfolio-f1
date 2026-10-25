import * as THREE from 'three';
import type { disposables } from '../dispose';
import { withReveal } from './dissolve';
import { roundedMask } from './livery';
import { FRONT_PHI, PHI_START, shellGeometry, shellNormal, shellPoint, THETA_LEN, VISOR } from './shape';

// The helmet's fittings, each added to `group` and built with `keep`, so the helmet frees
// them all at once. Every solid part dissolves in with the shell (`reveal`).

type Keep = ReturnType<typeof disposables>['keep'];
type Reveal = { value: number };

/** Visor seal (rubber) and the smoked visor on top of it. */
export function addVisor(group: THREE.Group, keep: Keep, reveal: Reveal) {
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
}

/** The visor's pivots, one each side. */
export function addPivots(group: THREE.Group, keep: Keep, reveal: Reveal) {
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
}

/** Rear spoiler (a Gurney-style lip) across the back of the crown. */
export function addSpoiler(group: THREE.Group, keep: Keep, carbon: THREE.Material) {
  const prof = new THREE.Shape();
  prof.moveTo(0, 0); prof.bezierCurveTo(0.06, 0.02, 0.16, 0.05, 0.22, 0.1); prof.lineTo(0.23, 0.13);
  prof.bezierCurveTo(0.15, 0.09, 0.06, 0.05, 0, 0.035); prof.closePath();
  const geo = keep(new THREE.ExtrudeGeometry(prof, { depth: 0.7, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 6 }));
  geo.translate(0, 0, -0.35);
  const theta = Math.PI * 0.3, phi = PHI_START; // back of the head
  const p = shellPoint(phi, theta), n = shellNormal(phi, theta);
  const wing = new THREE.Mesh(geo, carbon);
  wing.position.copy(p).addScaledVector(n, -0.01);
  // Local axes of the extrusion: x = profile length (point it backwards along
  // the surface), y = profile height (the surface normal), z = width (across the head).
  const across = new THREE.Vector3(1, 0, 0);
  const back = new THREE.Vector3().crossVectors(n, across).normalize();
  wing.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(back, n, across));
  group.add(wing);
}

/** Top air intake scoop above the visor, with an accent slot. */
export function addScoop(group: THREE.Group, keep: Keep, carbon: THREE.Material, accent: THREE.Material) {
  const s = new THREE.Shape();
  const w = 0.14, d = 0.09, r = 0.035;
  s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r);
  s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r);
  s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
  const geo = keep(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 4 }));
  const phi = FRONT_PHI, theta = Math.PI * 0.2;
  const p = shellPoint(phi, theta), n = shellNormal(phi, theta);
  const scoop = new THREE.Mesh(geo, carbon);
  scoop.position.copy(p).addScaledVector(n, -0.015);
  scoop.lookAt(scoop.position.clone().add(n));
  group.add(scoop);
  const slot = new THREE.Mesh(keep(new THREE.BoxGeometry(0.2, 0.03, 0.02)), accent);
  slot.position.copy(p).addScaledVector(n, 0.04);
  slot.lookAt(slot.position.clone().add(n));
  group.add(slot);
}

/** Chin vent below the visor. */
export function addChinVent(group: THREE.Group, keep: Keep, reveal: Reveal) {
  const vent = new THREE.Mesh(keep(shellGeometry({
    w: 12, h: 4, offset: 0.012,
    phiStart: FRONT_PHI - 0.22, phiLength: 0.44, thetaStart: Math.PI * 0.63, thetaLength: Math.PI * 0.05,
  })), keep(withReveal(new THREE.MeshStandardMaterial({ color: '#060607', roughness: 0.9, metalness: 0.2 }), reveal)));
  group.add(vent);
}

/** Neck roll: a soft tube around the bottom opening. */
export function addNeckRoll(group: THREE.Group, keep: Keep, reveal: Reveal) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i++) pts.push(shellPoint(PHI_START + (i / 96) * Math.PI * 2, THETA_LEN).multiplyScalar(0.985));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const neck = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 40, 0.045, 5, true)),
    keep(withReveal(new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.85 }), reveal)));
  group.add(neck);
}
