import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A low-poly F1 car built from boxes and cylinders (no model download): red body
// with black wings, floor and halo in one vertex-coloured mesh, four wheels in a
// second, and the blinking rain light. Local axes: +x forward, +y up, +z right.
// It is scaled up beyond the track's real proportions so it reads from the aerial camera.
const RED = new THREE.Color('#ff2438'), BLACK = new THREE.Color('#121214'), WHITE = new THREE.Color('#f4f4ed');

function part(geo: THREE.BufferGeometry, color: THREE.Color, x: number, y: number, z = 0) {
  geo.translate(x, y, z);
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  // mergeGeometries needs matching attributes: drop UVs, keep position, normal, colour.
  geo.deleteAttribute('uv');
  return geo.index ? geo.toNonIndexed() : geo;
}

export function buildCar() {
  const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const body = mergeGeometries([
    part(B(0.4, 0.05, 0.11), RED, 0, 0.05),            // monocoque
    part(B(0.18, 0.035, 0.05), RED, 0.27, 0.04),       // nose
    part(B(0.2, 0.05, 0.22), RED, -0.04, 0.045),       // sidepods
    part(B(0.16, 0.06, 0.06), RED, -0.08, 0.1),        // engine cover
    part(B(0.04, 0.03, 0.04), WHITE, -0.01, 0.135),    // airbox
    part(B(0.62, 0.012, 0.24), BLACK, -0.02, 0.018),   // floor
    part(B(0.06, 0.012, 0.32), BLACK, 0.35, 0.02),     // front wing
    part(B(0.06, 0.014, 0.26), BLACK, -0.29, 0.15),    // rear wing
    part(B(0.08, 0.1, 0.01), BLACK, -0.29, 0.11, 0.125),
    part(B(0.08, 0.1, 0.01), BLACK, -0.29, 0.11, -0.125),
    part(B(0.07, 0.012, 0.07), BLACK, 0.06, 0.11),     // halo
    part(B(0.012, 0.035, 0.012), BLACK, 0.095, 0.09),
  ])!;
  const wheel = (x: number, z: number, r: number, w: number) => {
    const g = new THREE.CylinderGeometry(r, r, w, 14);
    g.rotateX(Math.PI / 2);
    return part(g, BLACK, x, r, z);
  };
  const wheels = mergeGeometries([
    wheel(0.19, 0.15, 0.05, 0.05), wheel(0.19, -0.15, 0.05, 0.05),
    wheel(-0.19, 0.15, 0.056, 0.065), wheel(-0.19, -0.15, 0.056, 0.065),
  ])!;
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2, fog: false });
  const wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, fog: false });
  const lightGeo = new THREE.BoxGeometry(0.02, 0.03, 0.05);
  const lightMat = new THREE.MeshBasicMaterial({ color: '#ff2438', fog: false, toneMapped: false });

  const group = new THREE.Group();
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(-0.335, 0.075, 0);
  group.add(new THREE.Mesh(body, bodyMat), new THREE.Mesh(wheels, wheelMat), light);
  group.scale.setScalar(1.25);

  const on = new THREE.Color('#ff2438').multiplyScalar(2.2), off = new THREE.Color('#3a070c');
  return {
    group,
    /** Rain light: blinks while the lap is moving, holds steady when it stops. */
    setLight(blinking: boolean, now: number) {
      lightMat.color.copy(blinking && Math.floor(now / 110) % 2 ? off : on);
    },
    dispose() { [body, wheels, lightGeo, bodyMat, wheelMat, lightMat].forEach(d => d.dispose()); },
  };
}
