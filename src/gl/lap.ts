import * as THREE from 'three';
import { CIRCUIT_PATH } from '@/art/circuit';
import { NOISE_GLSL } from './field';

// 3D lap: the same circuit as the SVG lines, turned into a track ribbon with
// red/white kerbs and trackside lights. An aerial "broadcast" camera looks down
// on the whole circuit; a car marker and a red racing line advance one sector
// per career stage. Seen from above, the movement reads slow and calm.
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
  scene.fog = new THREE.FogExp2('#070708', 0.012);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 80);
  const curve = circuitCurve();
  const disposables: Array<{ dispose: () => void }> = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // Asphalt.
  const road = new THREE.Mesh(keep(ribbon(curve, WIDTH, 0, 700)),
    keep(new THREE.MeshStandardMaterial({ color: '#34343c', roughness: 0.7, metalness: 0.1 })));
  scene.add(road);

  // Kerbs: alternating red and white blocks on both edges.
  const red = new THREE.Color('#ff2438'), white = new THREE.Color('#f4f4ed');
  const kerbMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  for (const s of [-1, 1]) {
    const edge = offsetCurve(curve, s * (WIDTH + 0.035));
    scene.add(new THREE.Mesh(keep(ribbon(edge, 0.035, 0.004, 700, i => (Math.floor(i / 3) % 2 ? red : white))), kerbMat));
  }

  // Centre line.
  const dashMat = keep(new THREE.MeshBasicMaterial({ color: '#f4f4ed', transparent: true, opacity: 0.7, fog: true }));
  const dashGeo = keep(ribbon(curve, 0.008, 0.003, 700));
  scene.add(new THREE.Mesh(dashGeo, dashMat));

  // Trackside light posts for a sense of speed.
  const postGeo = keep(new THREE.BoxGeometry(0.02, 0.5, 0.02));
  const capGeo = keep(new THREE.BoxGeometry(0.07, 0.03, 0.07));
  const postMat = keep(new THREE.MeshStandardMaterial({ color: '#55555e', roughness: 0.6 }));
  const capA = keep(new THREE.MeshBasicMaterial({ color: '#ff2438', fog: true }));
  const capB = keep(new THREE.MeshBasicMaterial({ color: '#f4f4ed', fog: true }));
  // Instanced: two draw calls for all 90 posts and caps, not 180.
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

  // Racing line: a red ribbon revealed up to the car, plus the car marker.
  const SEGS = 700;
  const lineGeo = keep(ribbon(curve, 0.05, 0.006, SEGS));
  const lineMat = keep(new THREE.MeshBasicMaterial({ color: '#ff2438', fog: false }));
  scene.add(new THREE.Mesh(lineGeo, lineMat));
  const car = new THREE.Mesh(keep(new THREE.SphereGeometry(0.11, 20, 12)), keep(new THREE.MeshBasicMaterial({ color: '#ff2438', fog: false })));
  const halo = new THREE.Mesh(keep(new THREE.RingGeometry(0.16, 0.22, 32)), keep(new THREE.MeshBasicMaterial({ color: '#ff2438', transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false })));
  halo.rotation.x = -Math.PI / 2;
  scene.add(car, halo);

  // Contour ground far below the track: the same isolines as the page
  // background, laid flat in world space, fading out towards the edges.
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(70, 70)), keep(new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uCentre: { value: new THREE.Vector2() } },
    vertexShader: /* glsl */ `
      out vec2 vP;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in vec2 vP;
      out vec4 outColor;
      uniform vec2 uCentre;
      ${NOISE_GLSL}
      void main() {
        vec2 p = vP * 0.045;
        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
        float f = fbm(p + 1.4 * q) * 14.0;
        float w = max(fwidth(f), 1e-4);
        float line = clamp(1.0 - abs(fract(f + 0.5) - 0.5) / w * 0.9, 0.0, 1.0);
        float index = 1.0 - step(0.5, mod(floor(f + 0.5), 5.0));
        float racing = clamp(1.0 - abs(f - 3.5) / w * 0.55, 0.0, 1.0);
        float fade = smoothstep(26.0, 6.0, length(vP - uCentre));
        vec3 col = vec3(0.027, 0.027, 0.031);
        col = mix(col, vec3(0.957, 0.957, 0.929), line * 0.13 * (0.55 + index * 0.9) * fade);
        col = mix(col, vec3(1.0, 0.141, 0.22), racing * 0.2 * fade);
        outColor = vec4(col, 1.0);
      }`,
  })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.1;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight('#f4f4ed', '#1a1a20', 2.2));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(3, 6, 2);
  scene.add(key);

  const box = new THREE.Box3().setFromPoints(curve.getSpacedPoints(200));
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z);
  ground.position.x = centre.x; ground.position.z = centre.z;
  (ground.material as THREE.ShaderMaterial).uniforms.uCentre.value.set(centre.x, centre.z);
  // Veil: a full-screen quad in the scene's background colour, drawn last, so the
  // scene can fade in and out of the page without a second render pass.
  const veilMat = keep(new THREE.ShaderMaterial({
    uniforms: { uVeil: { value: 1 }, uCol: { value: new THREE.Color('#070708') } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uVeil; uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, uVeil); }',
    transparent: true, depthTest: false, depthWrite: false,
  }));
  const veil = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), veilMat);
  veil.frustumCulled = false;
  veil.renderOrder = 999;
  scene.add(veil);

  const START = 0.02, LAP = 0.96;
  const eye = new THREE.Vector3(), carPos = new THREE.Vector3();
  return {
    scene, camera,
    /** progress 0..1 through the lap (scrubbed to the pin); veil 0..1 fades the scene out. */
    update(progress: number, w: number, h: number, veilAmount = 0) {
      veilMat.uniforms.uVeil.value = veilAmount;
      veil.visible = veilAmount > 0.001;
      camera.aspect = w / h;
      // Desktop: the stage cards sit on the right, so frame the circuit left of centre.
      if (w / h > 1.2) camera.setViewOffset(w, h, w * 0.2, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();

      const t = (START + progress * LAP) % 1;
      curve.getPointAt(t, carPos);
      car.position.copy(carPos).setY(carPos.y + 0.12);
      halo.position.copy(carPos).setY(carPos.y + 0.02);
      lineGeo.setDrawRange(0, Math.floor(progress * LAP * SEGS) * 6);

      // Aerial camera: slow quarter orbit across the whole timeline.
      const a = -0.9 + progress * 0.6;
      eye.set(centre.x + Math.sin(a) * R * 1.3, centre.y + R * 1.5, centre.z + Math.cos(a) * R * 1.3);
      camera.position.copy(eye);
      camera.lookAt(centre.x, centre.y - 0.2, centre.z);
    },
    dispose: () => disposables.forEach(d => d.dispose()),
  };
}
