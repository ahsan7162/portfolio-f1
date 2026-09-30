import * as THREE from 'three';
import { CIRCUIT_PATH } from '@/art/circuit';

// 3D lap: the same circuit as the SVG lines, turned into a track ribbon with
// red/white kerbs and trackside lights. The camera rides the racing line,
// scrubbed by lapState.progress.
const SCALE = 0.06;
const WIDTH = 0.34;

function circuitCurve() {
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

function ribbon(curve: THREE.CatmullRomCurve3, halfW: number, lift: number, segs: number, colorAt?: (i: number) => THREE.Color) {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = (i % segs) / segs;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    side.crossVectors(tan, up).normalize();
    for (const s of [-1, 1]) {
      pos.push(p.x + side.x * halfW * s, p.y + lift, p.z + side.z * halfW * s);
      if (colorAt) { const c = colorAt(i); col.push(c.r, c.g, c.b); }
    }
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function offsetCurve(curve: THREE.CatmullRomCurve3, off: number) {
  const up = new THREE.Vector3(0, 1, 0);
  const pts = curve.getSpacedPoints(400).slice(0, -1).map((p, i, arr) => {
    const tan = curve.getTangentAt(i / arr.length);
    return p.clone().add(new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(off));
  });
  return new THREE.CatmullRomCurve3(pts, true);
}

export function createLap() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070708');
  scene.fog = new THREE.FogExp2('#070708', 0.16);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.02, 60);
  const curve = circuitCurve();
  const disposables: Array<{ dispose: () => void }> = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // Asphalt.
  const road = new THREE.Mesh(keep(ribbon(curve, WIDTH, 0, 1400)),
    keep(new THREE.MeshStandardMaterial({ color: '#17171b', roughness: 0.85, metalness: 0.1 })));
  scene.add(road);

  // Kerbs: alternating red and white blocks on both edges.
  const red = new THREE.Color('#ff2438'), white = new THREE.Color('#f4f4ed');
  const kerbMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  for (const s of [-1, 1]) {
    const edge = offsetCurve(curve, s * (WIDTH + 0.035));
    scene.add(new THREE.Mesh(keep(ribbon(edge, 0.035, 0.004, 1400, i => (Math.floor(i / 6) % 2 ? red : white))), kerbMat));
  }

  // Centre line.
  const dashMat = keep(new THREE.MeshBasicMaterial({ color: '#f4f4ed', transparent: true, opacity: 0.35, fog: true }));
  const dashGeo = keep(ribbon(curve, 0.008, 0.003, 1400));
  scene.add(new THREE.Mesh(dashGeo, dashMat));

  // Trackside light posts for a sense of speed.
  const postGeo = keep(new THREE.BoxGeometry(0.02, 0.5, 0.02));
  const capGeo = keep(new THREE.BoxGeometry(0.07, 0.03, 0.07));
  const postMat = keep(new THREE.MeshStandardMaterial({ color: '#26262b', roughness: 0.6 }));
  const capA = keep(new THREE.MeshBasicMaterial({ color: '#ff2438', fog: true }));
  const capB = keep(new THREE.MeshBasicMaterial({ color: '#f4f4ed', fog: true }));
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 90; i++) {
    const t = i / 90, s = i % 2 ? 1 : -1;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(s * (WIDTH + 0.28));
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.copy(p).add(side).setY(p.y + 0.25);
    const cap = new THREE.Mesh(capGeo, i % 3 ? capB : capA);
    cap.position.copy(post.position).setY(p.y + 0.52);
    scene.add(post, cap);
  }

  // Ground grid far below the track.
  const grid = new THREE.GridHelper(60, 120, '#2a2a30', '#18181c');
  grid.position.y = -1.1;
  scene.add(grid);
  keep(grid.geometry); keep(grid.material as THREE.Material);

  scene.add(new THREE.HemisphereLight('#f4f4ed', '#070708', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.2);
  key.position.set(3, 6, 2);
  scene.add(key);

  const eye = new THREE.Vector3(), look = new THREE.Vector3();
  return {
    scene, camera,
    /** progress 0..1 through the pinned lap section. */
    update(progress: number, aspect: number) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      const t = (0.02 + progress * 0.96) % 1;
      curve.getPointAt(t, eye);
      curve.getPointAt((t + 0.012) % 1, look);
      eye.y += 0.2;
      look.y += 0.12;
      camera.position.copy(eye);
      camera.lookAt(look);
    },
    dispose: () => disposables.forEach(d => d.dispose()),
  };
}
