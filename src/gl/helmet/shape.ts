import * as THREE from 'three';

// Procedural F1 helmet. Everything starts as a unit sphere with the bottom cut
// open, then each vertex is pushed into a helmet shape by shapeShell().
//
// Sphere parameters (three.js): theta 0 = top (+y), phi measured so that
// phi = PI/2 faces +z (the front of the helmet). The seam sits at the back.
export const PHI_START = Math.PI * 1.5;
export const THETA_LEN = Math.PI * 0.86;
export const FRONT_PHI = Math.PI * 2.5; // PI/2, expressed inside [PHI_START, PHI_START + 2PI]

/** Visor opening, in sphere angles. */
export const VISOR = { halfWidth: Math.PI * 0.29, top: Math.PI * 0.38, bottom: Math.PI * 0.57 };

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Push a point on the unit sphere into the helmet silhouette. */
export function shapeShell(v: THREE.Vector3): THREE.Vector3 {
  const { x, y, z } = v;
  let px = x * 0.92, py = y * 1.06, pz = z * 1.03;
  // Longer, rounder back of the head, pushed out most at the lower back.
  const back = ss(0.0, -0.9, z);
  pz -= 0.1 * back * ss(0.6, -0.4, y);
  // Chin bar: the front lower part juts forward and down.
  const chin = ss(0.1, 0.9, z) * ss(-0.05, -0.75, y);
  pz += 0.2 * chin;
  py -= 0.1 * chin;
  // Slightly flatter sides toward the jaw, slightly flatter crown.
  px *= 1 - 0.07 * ss(0.2, -0.6, y);
  if (py > 0) py *= 0.96;
  // Neck line: lower at the chin than at the back.
  const rim = ss(-0.4, -0.98, y);
  py += rim * (-0.2 * z + 0.1);
  return v.set(px, py, pz);
}

/** Point on the shaped shell for sphere angles, plus its outward normal. */
export function shellPoint(phi: number, theta: number, out = new THREE.Vector3()) {
  out.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
  return shapeShell(out);
}

export function shellNormal(phi: number, theta: number) {
  const e = 1e-3;
  const p = shellPoint(phi, theta);
  const a = shellPoint(phi + e, theta).sub(p);
  const b = shellPoint(phi, theta + e).sub(p);
  const n = b.cross(a).normalize();
  return n.dot(p) < 0 ? n.negate() : n;
}

/** Sphere patch (full shell, or a visor-shaped slice) run through shapeShell. */
export function shellGeometry(opts: {
  radius?: number; w: number; h: number;
  phiStart?: number; phiLength?: number; thetaStart?: number; thetaLength?: number; offset?: number;
}) {
  const g = new THREE.SphereGeometry(opts.radius ?? 1, opts.w, opts.h,
    opts.phiStart ?? PHI_START, opts.phiLength ?? Math.PI * 2, opts.thetaStart ?? 0, opts.thetaLength ?? THETA_LEN);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    shapeShell(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  if (opts.offset) {
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) + n.getX(i) * opts.offset, pos.getY(i) + n.getY(i) * opts.offset, pos.getZ(i) + n.getZ(i) * opts.offset);
    }
    g.computeVertexNormals();
  }
  return g;
}
