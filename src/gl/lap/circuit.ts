import * as THREE from 'three';
import { CIRCUIT_PATH } from '@/art/circuit';

/** World units per unit of the SVG circuit. */
const SCALE = 0.06;
/** The track's half width. */
export const WIDTH = 0.34;

/** The same circuit as the page's SVG lines, as a closed 3D curve with gentle elevation. */
export function circuitCurve() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CIRCUIT_PATH);
  const len = path.getTotalLength();
  const pts: THREE.Vector3[] = [];
  const N = 220;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p = path.getPointAtLength(t * len);
    const elev = Math.sin(t * Math.PI * 4) * 0.25 + Math.sin(t * Math.PI * 2 + 1) * 0.35;
    pts.push(new THREE.Vector3((p.x - 200) * SCALE, elev, (p.y - 130) * SCALE));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

/** A flat strip along the curve. With `withUv`: uv.x runs 0..1 along it (not wrapped), uv.y 0..1 across. */
export function ribbon(curve: THREE.CatmullRomCurve3, halfW: number, lift: number, segs: number, colorAt?: (i: number) => THREE.Color, withUv = false) {
  const pos: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = (i % segs) / segs;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    side.crossVectors(tan, up).normalize();
    for (const s of [-1, 1]) {
      pos.push(p.x + side.x * halfW * s, p.y + lift, p.z + side.z * halfW * s);
      if (colorAt) { const c = colorAt(i); col.push(c.r, c.g, c.b); }
      if (withUv) uv.push(i / segs, s < 0 ? 0 : 1);
    }
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The curve moved sideways by `off`. */
export function offsetCurve(curve: THREE.CatmullRomCurve3, off: number) {
  const up = new THREE.Vector3(0, 1, 0);
  const pts = curve.getSpacedPoints(400).slice(0, -1).map((p, i, arr) => {
    const tan = curve.getTangentAt(i / arr.length);
    return p.clone().add(new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(off));
  });
  return new THREE.CatmullRomCurve3(pts, true);
}
