import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundShade, PALETTE } from '@/art/palette';
import { disposables } from '../dispose';

// A low-poly F1 car from boxes and cylinders: the body with black wings, floor and halo in one
// vertex-coloured mesh, the wheels in a second, and the rain light. Local axes: +x forward,
// +y up, +z right. Scaled up beyond the track's proportions so it reads from the aerial camera.
// Each vertex keeps which colour it wears, so a livery change repaints it.
const BODY = new THREE.Color(), BLACK = new THREE.Color(), WHITE = new THREE.Color();
const ROLES = [BODY, BLACK, WHITE];

function part(geo: THREE.BufferGeometry, color: THREE.Color, x: number, y: number, z = 0) {
  geo.translate(x, y, z);
  const n = geo.attributes.position.count;
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('role', new THREE.BufferAttribute(new Uint8Array(n).fill(ROLES.indexOf(color)), 1));
  // mergeGeometries needs matching attributes: drop UVs, keep position, normal, colour, role.
  geo.deleteAttribute('uv');
  return geo.index ? geo.toNonIndexed() : geo;
}

export function buildCar() {
  const { keep, dispose } = disposables();
  const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const body = keep(mergeGeometries([
    part(B(0.4, 0.05, 0.11), BODY, 0, 0.05),            // monocoque
    part(B(0.18, 0.035, 0.05), BODY, 0.27, 0.04),       // nose
    part(B(0.2, 0.05, 0.22), BODY, -0.04, 0.045),       // sidepods
    part(B(0.16, 0.06, 0.06), BODY, -0.08, 0.1),        // engine cover
    part(B(0.04, 0.03, 0.04), WHITE, -0.01, 0.135),    // airbox
    part(B(0.62, 0.012, 0.24), BLACK, -0.02, 0.018),   // floor
    part(B(0.06, 0.012, 0.32), BLACK, 0.35, 0.02),     // front wing
    part(B(0.06, 0.014, 0.26), BLACK, -0.29, 0.15),    // rear wing
    part(B(0.08, 0.1, 0.01), BLACK, -0.29, 0.11, 0.125),
    part(B(0.08, 0.1, 0.01), BLACK, -0.29, 0.11, -0.125),
    part(B(0.07, 0.012, 0.07), BLACK, 0.06, 0.11),     // halo
    part(B(0.012, 0.035, 0.012), BLACK, 0.095, 0.09),
  ]));
  const wheel = (x: number, z: number, r: number, w: number) => {
    const g = new THREE.CylinderGeometry(r, r, w, 14);
    g.rotateX(Math.PI / 2);
    return part(g, BLACK, x, r, z);
  };
  const wheels = keep(mergeGeometries([
    wheel(0.19, 0.15, 0.05, 0.05), wheel(0.19, -0.15, 0.05, 0.05),
    wheel(-0.19, 0.15, 0.056, 0.065), wheel(-0.19, -0.15, 0.056, 0.065),
  ]));
  const bodyMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2, fog: false }));
  const wheelMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, fog: false }));
  const lightGeo = keep(new THREE.BoxGeometry(0.02, 0.03, 0.05));
  const lightMat = keep(new THREE.MeshBasicMaterial({ fog: false, toneMapped: false }));

  const group = new THREE.Group();
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(-0.335, 0.075, 0);
  group.add(new THREE.Mesh(body, bodyMat), new THREE.Mesh(wheels, wheelMat), light);
  group.scale.setScalar(1.25);

  // The roles stay on the CPU: the shader never reads them.
  const painted = [body, wheels].map(geo => {
    const roles = geo.getAttribute('role').array;
    geo.deleteAttribute('role');
    return { col: geo.getAttribute('color') as THREE.BufferAttribute, roles };
  });
  const on = new THREE.Color(), off = new THREE.Color();
  const paint = () => {
    BODY.set(PALETTE.ac2); BLACK.set(groundShade('#121214')); WHITE.set(PALETTE.fg);
    for (const { col, roles } of painted) {
      for (let i = 0; i < col.count; i++) { const c = ROLES[roles[i]]; col.setXYZ(i, c.r, c.g, c.b); }
      col.needsUpdate = true;
    }
    on.set(PALETTE.ac).multiplyScalar(2.2); off.set(PALETTE.lampOff);
    lightMat.color.copy(on);
  };
  paint();
  return {
    group,
    /** Repaint in the current livery (the lap calls it on a palette change). */
    paint,
    /** Rain light: blinks while the lap is moving, holds steady when it stops. */
    setLight(blinking: boolean, now: number) {
      lightMat.color.copy(blinking && Math.floor(now / 110) % 2 ? off : on);
    },
    dispose,
  };
}
