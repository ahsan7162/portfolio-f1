import * as THREE from 'three';
import { groundShade, PALETTE } from '@/art/palette';
import type { disposables } from '../dispose';
import { offsetCurve, ribbon, WIDTH } from './circuit';

type Keep = ReturnType<typeof disposables>['keep'];

/**
 * The track: an asphalt ribbon, red and white kerbs on both edges, a solid centre line,
 * and trackside light posts for a sense of speed. Returns its repaint for the livery.
 */
export function buildTrack(scene: THREE.Scene, curve: THREE.CatmullRomCurve3, keep: Keep) {
  const road = new THREE.Mesh(keep(ribbon(curve, WIDTH, 0, 700)),
    keep(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 })));
  scene.add(road);

  // Kerbs: alternating blocks on both edges.
  const red = new THREE.Color(), white = new THREE.Color();
  const kerbAt = (i: number) => (Math.floor(i / 3) % 2 ? red : white);
  const kerbMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  const kerbs = [-1, 1].map(s => {
    const geo = keep(ribbon(offsetCurve(curve, s * (WIDTH + 0.035)), 0.035, 0.004, 700, kerbAt));
    scene.add(new THREE.Mesh(geo, kerbMat));
    return geo;
  });

  const centreMat = keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, fog: true }));
  const centreGeo = keep(ribbon(curve, 0.008, 0.003, 700));
  scene.add(new THREE.Mesh(centreGeo, centreMat));

  // Instanced: two draw calls for all 90 posts and caps, not 180.
  const postGeo = keep(new THREE.BoxGeometry(0.02, 0.5, 0.02));
  const capGeo = keep(new THREE.BoxGeometry(0.07, 0.03, 0.07));
  const postMat = keep(new THREE.MeshStandardMaterial({ roughness: 0.6 }));
  const capA = keep(new THREE.MeshBasicMaterial({ fog: true }));
  const capB = keep(new THREE.MeshBasicMaterial({ fog: true }));
  const POSTS = 90;
  const posts = new THREE.InstancedMesh(postGeo, postMat, POSTS);
  const capsA = new THREE.InstancedMesh(capGeo, capA, POSTS), capsB = new THREE.InstancedMesh(capGeo, capB, POSTS);
  const up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), v = new THREE.Vector3();
  let na = 0, nb = 0;
  for (let i = 0; i < POSTS; i++) {
    const t = i / POSTS, s = i % 2 ? 1 : -1;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(s * (WIDTH + 0.28));
    v.copy(p).add(side).setY(p.y + 0.25);
    posts.setMatrixAt(i, m.makeTranslation(v));
    v.setY(p.y + 0.52);
    if (i % 3) capsB.setMatrixAt(nb++, m.makeTranslation(v)); else capsA.setMatrixAt(na++, m.makeTranslation(v));
  }
  capsA.count = na; capsB.count = nb;
  scene.add(posts, capsA, capsB);

  return () => {
    const P = PALETTE;
    road.material.color.set(groundShade('#34343c'));
    postMat.color.set(groundShade('#55555e'));
    red.set(P.ac); white.set(P.fg);
    for (const geo of kerbs) {
      const col = geo.getAttribute('color') as THREE.BufferAttribute;
      for (let k = 0; k < col.count; k++) { const c = kerbAt(k >> 1); col.setXYZ(k, c.r, c.g, c.b); }
      col.needsUpdate = true;
    }
    centreMat.color.set(P.fg); capA.color.set(P.ac); capB.color.set(P.fg);
  };
}
