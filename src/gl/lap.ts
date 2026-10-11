import * as THREE from 'three';
import { CIRCUIT_PATH } from '@/art/circuit';
import { PALETTE } from '@/art/palette';
import { timeline } from '@/content/data';
import { buildCar } from './car';
import { disposables } from './dispose';
import { CONTOURS_GLSL, NOISE_GLSL, vec3 } from './glsl';
import { createRunoff } from './runoff';
import { lapMarks } from './state';

// 3D lap: the same circuit as the SVG lines, turned into a track ribbon with
// red/white kerbs and trackside lights. An aerial "broadcast" camera looks down
// on the whole circuit; a car marker and a red racing line advance one sector
// per career stage. Seen from above, the movement reads slow and calm.
const SCALE = 0.06;
const WIDTH = 0.34;
/** Light pulses on the racing line: how many fit in one lap, and how fast they run next to the car. */
const PULSES = 6, PULSE_RATE = 1.5;

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

/** A flat strip along the curve. With `withUv`: uv.x runs 0..1 along it (not wrapped), uv.y 0..1 across. */
function ribbon(curve: THREE.CatmullRomCurve3, halfW: number, lift: number, segs: number, colorAt?: (i: number) => THREE.Color, withUv = false) {
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
  scene.background = new THREE.Color(PALETTE.pit);
  scene.fog = new THREE.FogExp2(PALETTE.pit, 0.012);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 80);
  const curve = circuitCurve();
  const { keep, dispose } = disposables();

  // Asphalt.
  const road = new THREE.Mesh(keep(ribbon(curve, WIDTH, 0, 700)),
    keep(new THREE.MeshStandardMaterial({ color: '#34343c', roughness: 0.7, metalness: 0.1 })));
  scene.add(road);

  // Kerbs: alternating red and white blocks on both edges.
  const red = new THREE.Color(PALETTE.ac), white = new THREE.Color(PALETTE.fg);
  const kerbMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  for (const s of [-1, 1]) {
    const edge = offsetCurve(curve, s * (WIDTH + 0.035));
    scene.add(new THREE.Mesh(keep(ribbon(edge, 0.035, 0.004, 700, i => (Math.floor(i / 3) % 2 ? red : white))), kerbMat));
  }

  // Centre line (solid).
  const centreMat = keep(new THREE.MeshBasicMaterial({ color: PALETTE.fg, transparent: true, opacity: 0.7, fog: true }));
  const centreGeo = keep(ribbon(curve, 0.008, 0.003, 700));
  scene.add(new THREE.Mesh(centreGeo, centreMat));

  // Trackside light posts for a sense of speed.
  const postGeo = keep(new THREE.BoxGeometry(0.02, 0.5, 0.02));
  const capGeo = keep(new THREE.BoxGeometry(0.07, 0.03, 0.07));
  const postMat = keep(new THREE.MeshStandardMaterial({ color: '#55555e', roughness: 0.6 }));
  const capA = keep(new THREE.MeshBasicMaterial({ color: PALETTE.ac, fog: true }));
  const capB = keep(new THREE.MeshBasicMaterial({ color: PALETTE.fg, fog: true }));
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
  const lineMat = keep(new THREE.MeshBasicMaterial({ color: PALETTE.ac, fog: false }));
  scene.add(new THREE.Mesh(lineGeo, lineMat));

  // Pulses of light running along the racing line towards the car (landonorris.com's
  // track scene), driven by the scroll, not a clock: their phase is the lap progress, so
  // they run backwards on the way up and stand still when you stop, and they fade out as
  // the scrolling slows. At rest the line is exactly the plain red one. A wide additive
  // strip with a soft edge stands in for bloom (no extra passes).
  const glowGeo = keep(ribbon(curve, 0.24, 0.007, SEGS, undefined, true));
  const glowMat = keep(new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uPhase: { value: 0 }, uGlow: { value: 0 }, uHead: { value: 0 } },
    vertexShader: /* glsl */ `
      out vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in vec2 vUv;
      out vec4 outColor;
      uniform float uPhase, uGlow, uHead;
      void main() {
        float across = vUv.y * 2.0 - 1.0;
        float core = exp(-across * across * 24.0), halo = exp(-across * across * 3.0);
        // Bright head, long fading tail behind it, moving in race direction (uv.x grows with the lap).
        float pulse = pow(fract(vUv.x * ${PULSES.toFixed(1)} - uPhase), 3.0);
        float head = smoothstep(0.0, 0.02, uHead - vUv.x); // fades into the car
        float a = uGlow * pulse * head * (core + halo * 0.55);
        outColor = vec4(mix(${vec3(PALETTE.ac)}, ${vec3(PALETTE.fg)}, core * pulse * 0.7), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.renderOrder = 2;
  scene.add(glow); // left visible until the first lap frame, so the warm-up compiles it
  const car = keep(buildCar());
  // A faint ring under the car, so it is easy to find on the whole circuit.
  const halo = new THREE.Mesh(keep(new THREE.RingGeometry(0.5, 0.56, 40)), keep(new THREE.MeshBasicMaterial({ color: PALETTE.ac, transparent: true, opacity: 0.3, side: THREE.DoubleSide, fog: false })));
  halo.rotation.x = -Math.PI / 2;
  scene.add(car.group, halo);

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
      ${CONTOURS_GLSL}
      void main() {
        vec2 p = vP * 0.045;
        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
        Contours c = contours(fbm(p + 1.4 * q) * 14.0);
        float fade = smoothstep(26.0, 6.0, length(vP - uCentre));
        vec3 col = ${vec3(PALETTE.pit)};
        col = mix(col, ${vec3(PALETTE.fg)}, c.line * 0.13 * (0.55 + c.index * 0.9) * fade);
        col = mix(col, ${vec3(PALETTE.ac)}, c.racing * 0.2 * fade);
        outColor = vec4(col, 1.0);
      }`,
  })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.1;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(PALETTE.fg, '#1a1a20', 2.2));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(3, 6, 2);
  scene.add(key);

  const box = new THREE.Box3().setFromPoints(curve.getSpacedPoints(200));
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z);
  ground.position.x = centre.x; ground.position.z = centre.z;
  ground.material.uniforms.uCentre.value.set(centre.x, centre.z);
  // Veil: a full-screen quad in the scene's background colour, drawn last, so the
  // scene can fade in and out of the page without a second render pass.
  const veilMat = keep(new THREE.ShaderMaterial({
    uniforms: { uVeil: { value: 1 }, uCol: { value: new THREE.Color(PALETTE.pit) } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uVeil; uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, uVeil); }',
    transparent: true, depthTest: false, depthWrite: false,
  }));
  const veil = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), veilMat);
  veil.frustumCulled = false;
  veil.renderOrder = 999;
  scene.add(veil);

  const START = 0.02, LAP = 0.96;
  const orbit = (progress: number) => -0.9 + progress * 0.6;
  // Each stage's company on the run-off beside the middle of its sector.
  const n = timeline.length, mid = timeline.map((_, i) => (i + 0.5) / n);
  const runoff = keep(createRunoff(curve, timeline.map(t => t.company), mid.map(p => (START + p * LAP) % 1), mid.map(orbit), WIDTH + 0.35));
  scene.add(runoff.mesh);
  // Sector starts, for the DOM marks the Lap section draws over the track (lapMarks).
  const marks = timeline.map((_, k) => curve.getPointAt((START + (k / n) * LAP) % 1).add(new THREE.Vector3(0, 0.02, 0)));
  lapMarks.xy = new Float32Array(n * 3);
  const proj = new THREE.Vector3();
  const eye = new THREE.Vector3(), carPos = new THREE.Vector3(), look = new THREE.Vector3();
  const ZOOM = 0.62, FOLLOW = 0.55;
  const fwd = new THREE.Vector3(), ahead = new THREE.Vector3(), side = new THREE.Vector3(), upV = new THREE.Vector3(), basis = new THREE.Matrix4();
  const roll = new THREE.Quaternion();
  let lastP = -1, movedAt = 0;
  let glowK = 0, glowP = -1, glowAt = 0;
  return {
    scene, camera,
    /** progress 0..1 through the lap (scrubbed to the pin); veil 0..1 fades the scene out. Returns true while it needs more frames. */
    update(progress: number, w: number, h: number, veilAmount = 0, stage = -1) {
      veilMat.uniforms.uVeil.value = veilAmount;
      veil.visible = veilAmount > 0.001;
      camera.aspect = w / h;
      // Desktop: the stage cards sit on the right, so frame the circuit left of centre.
      // Portrait: the card covers the lower half, so the car rides in the band above it.
      if (w / h > 1.2) camera.setViewOffset(w, h, w * 0.2, 0, w, h);
      else if (h > w) camera.setViewOffset(w, h, 0, h * 0.22, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();

      const t = (START + progress * LAP) % 1;
      curve.getPointAt(t, carPos);
      // Face along the track (pitching with its elevation) and lean into corners.
      curve.getTangentAt(t, fwd);
      curve.getTangentAt((t + 0.012) % 1, ahead);
      side.crossVectors(fwd, up).normalize();
      upV.crossVectors(side, fwd).normalize();
      basis.makeBasis(fwd, upV, side);
      const g = car.group;
      g.quaternion.setFromRotationMatrix(basis);
      const turn = fwd.x * ahead.z - fwd.z * ahead.x; // + = turning right
      g.quaternion.multiply(roll.setFromAxisAngle(fwd.set(1, 0, 0), THREE.MathUtils.clamp(turn * 2.2, -0.14, 0.14)));
      g.position.copy(carPos).setY(carPos.y + 0.005);
      halo.position.copy(carPos).setY(carPos.y + 0.008);
      const now = performance.now();
      if (progress !== lastP) { lastP = progress; movedAt = now; }
      const blinking = now - movedAt < 250;
      car.setLight(blinking, now);
      lineGeo.setDrawRange(0, Math.floor(t * SEGS) * 6); // up to the car

      // The pulses' strength follows how fast the lap moves, easing over about 0.2 s.
      const dt = Math.min(0.05, (now - glowAt) / 1000);
      glowAt = now;
      const speed = glowP < 0 || dt <= 0 ? 0 : Math.abs(progress - glowP) / dt;
      glowP = progress;
      glowK += (Math.min(1, speed / 0.5) - glowK) * (1 - Math.exp(-dt / 0.2));
      if (glowK < 0.004) glowK = 0;
      glowMat.uniforms.uPhase.value = progress * LAP * PULSES * PULSE_RATE;
      glowMat.uniforms.uGlow.value = glowK;
      glowMat.uniforms.uHead.value = t;
      glowGeo.setDrawRange(0, Math.floor(t * SEGS) * 6);
      glow.visible = glowK > 0;

      // Helicopter camera: a slow quarter orbit across the whole timeline, closer than a
      // full-circuit shot and leaning towards the car so it reads (the minimap shows the
      // whole circuit). The same framing on phones, where the circuit fills the width anyway.
      const a = orbit(progress);
      look.copy(centre).lerp(carPos, FOLLOW).setY(centre.y - 0.2);
      eye.set(look.x + Math.sin(a) * R * 1.3 * ZOOM, centre.y + R * 1.5 * ZOOM, look.z + Math.cos(a) * R * 1.3 * ZOOM);
      camera.position.copy(eye);
      camera.lookAt(look);
      // Project the sector starts now (render() would update the camera matrices only
      // later, and the marks would trail by a frame). The view offset is already in the
      // projection, so NDC maps straight onto the canvas.
      camera.updateMatrixWorld();
      marks.forEach((mark, k) => {
        proj.copy(mark).project(camera);
        const o = k * 3;
        lapMarks.xy[o] = (proj.x * w) / 2;
        lapMarks.xy[o + 1] = (-proj.y * h) / 2;
        lapMarks.xy[o + 2] = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 ? 1 : 0;
      });
      // Still blinking or glowing: ask for more frames, so the light settles to steady
      // and the pulses fade out when the lap stops.
      const lighting = runoff.update(stage);
      return blinking || lighting || glowK > 0;
    },
    /** Upload the run-off atlas ahead of the first lap frame. */
    warm: (r: THREE.WebGLRenderer) => r.initTexture(runoff.texture),
    dispose,
  };
}
