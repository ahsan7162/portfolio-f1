import * as THREE from 'three';
import { groundShade, onPalette, PALETTE } from '@/art/palette';
import { timeline } from '@/content/data';
import { disposables } from '../dispose';
import { lapMarks } from '../state';
import { buildCar } from './car';
import { circuitCurve, WIDTH } from './circuit';
import { buildGround } from './ground';
import { buildRacingLine } from './racingLine';
import { createRunoff } from './runoff';
import { buildTrack } from './track';

// The 3D lap: the circuit as a track, seen from an aerial "broadcast" camera; a car and a
// red racing line advance one sector per career stage. Seen from above, it reads slow and calm.

/** Where the lap starts on the curve, and how much of the curve one lap covers. */
const START = 0.02, LAP = 0.96;
const ZOOM = 0.62, FOLLOW = 0.55;
/** The camera's orbit angle at a point of the lap: a slow quarter turn across the whole timeline. */
const orbit = (progress: number) => -0.9 + progress * 0.6;

/** A full-screen quad in the scene's background colour, drawn last, so the scene fades in and out of the page without a second pass. */
function buildVeil(scene: THREE.Scene, keep: ReturnType<typeof disposables>['keep']) {
  const mat = keep(new THREE.ShaderMaterial({
    uniforms: { uVeil: { value: 1 }, uCol: { value: new THREE.Color() } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uVeil; uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, uVeil); }',
    transparent: true, depthTest: false, depthWrite: false,
  }));
  const veil = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), mat);
  veil.frustumCulled = false;
  veil.renderOrder = 999;
  scene.add(veil);
  return {
    set(amount: number) { mat.uniforms.uVeil.value = amount; veil.visible = amount > 0.001; },
    paint() { mat.uniforms.uCol.value.set(PALETTE.pit); },
  };
}

/** Desktop: the stage cards sit on the right, so frame the circuit left of centre. Portrait: the card covers the lower half, so the car rides in the band above it. */
function frameView(camera: THREE.PerspectiveCamera, w: number, h: number) {
  camera.aspect = w / h;
  if (w / h > 1.2) camera.setViewOffset(w, h, w * 0.2, 0, w, h);
  else if (h > w) camera.setViewOffset(w, h, 0, h * 0.22, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

export function createLap() {
  const scene = new THREE.Scene();
  const background = new THREE.Color(), fog = new THREE.FogExp2(0, 0.012);
  scene.background = background;
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 80);
  const curve = circuitCurve();
  const { keep, dispose } = disposables();
  const box = new THREE.Box3().setFromPoints(curve.getSpacedPoints(200));
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z);

  const paintTrack = buildTrack(scene, curve, keep);
  const line = buildRacingLine(scene, curve, keep);
  const car = keep(buildCar());
  // A faint ring under the car, so it is easy to find on the whole circuit.
  const halo = new THREE.Mesh(keep(new THREE.RingGeometry(0.5, 0.56, 40)), keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, side: THREE.DoubleSide, fog: false })));
  halo.rotation.x = -Math.PI / 2;
  scene.add(car.group, halo);
  const paintGround = buildGround(scene, keep, centre);
  const sky = new THREE.HemisphereLight(0xffffff, 0, 2.2);
  scene.add(sky);
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(3, 6, 2);
  scene.add(key);
  const veil = buildVeil(scene, keep);
  // Each stage's company on the run-off beside the middle of its sector.
  const n = timeline.length, mid = timeline.map((_, i) => (i + 0.5) / n);
  const runoff = keep(createRunoff(curve, timeline.map(t => t.company), mid.map(p => (START + p * LAP) % 1), mid.map(orbit), WIDTH + 0.35));
  scene.add(runoff.mesh);

  // Every palette colour, set now and again whenever the livery changes.
  const paint = () => {
    background.set(PALETTE.pit); fog.color.set(PALETTE.pit);
    veil.paint();
    paintTrack();
    line.paint();
    halo.material.color.set(PALETTE.ac);
    paintGround();
    sky.color.set(PALETTE.fg); sky.groundColor.set(groundShade('#1a1a20'));
    car.paint(); runoff.paint();
  };
  paint();
  keep({ dispose: onPalette(paint) });

  // Sector starts, for the DOM marks the Lap section draws over the track (lapMarks).
  const marks = timeline.map((_, k) => curve.getPointAt((START + (k / n) * LAP) % 1).add(new THREE.Vector3(0, 0.02, 0)));
  lapMarks.xy = new Float32Array(n * 3);
  const proj = new THREE.Vector3();
  /** Project the sector starts now (render() would update the camera matrices only later, and the marks would trail by a frame). */
  const projectMarks = (w: number, h: number) => {
    camera.updateMatrixWorld();
    marks.forEach((mark, k) => {
      proj.copy(mark).project(camera);
      const o = k * 3;
      lapMarks.xy[o] = (proj.x * w) / 2;
      lapMarks.xy[o + 1] = (-proj.y * h) / 2;
      lapMarks.xy[o + 2] = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 ? 1 : 0;
    });
  };

  const up = new THREE.Vector3(0, 1, 0), carPos = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3();
  const fwd = new THREE.Vector3(), ahead = new THREE.Vector3(), side = new THREE.Vector3(), upV = new THREE.Vector3(), basis = new THREE.Matrix4();
  const roll = new THREE.Quaternion();
  /** The car at `t` on the curve: facing along the track (pitching with its elevation) and leaning into corners. */
  const placeCar = (t: number) => {
    curve.getPointAt(t, carPos);
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
  };
  /** Helicopter camera: closer than a full-circuit shot and leaning towards the car so it reads (the minimap shows the whole circuit). */
  const aim = (progress: number) => {
    const a = orbit(progress);
    look.copy(centre).lerp(carPos, FOLLOW).setY(centre.y - 0.2);
    eye.set(look.x + Math.sin(a) * R * 1.3 * ZOOM, centre.y + R * 1.5 * ZOOM, look.z + Math.cos(a) * R * 1.3 * ZOOM);
    camera.position.copy(eye);
    camera.lookAt(look);
  };

  let lastP = -1, movedAt = 0;
  /** progress 0..1 through the lap (scrubbed to the pin); veil 0..1 fades the scene out. Returns true while it needs more frames. */
  function update(progress: number, w: number, h: number, veilAmount = 0, stage = -1) {
    veil.set(veilAmount);
    frameView(camera, w, h);
    const t = (START + progress * LAP) % 1;
    placeCar(t);
    // The rain light blinks while the lap moves and holds steady once it stops.
    const now = performance.now();
    if (progress !== lastP) { lastP = progress; movedAt = now; }
    const blinking = now - movedAt < 250;
    car.setLight(blinking, now);
    const glowing = line.update(progress, t, LAP, now);
    aim(progress);
    projectMarks(w, h);
    const lighting = runoff.update(stage);
    return blinking || lighting || glowing;
  }

  return {
    scene, camera, update,
    /**
     * Get the scene ready ahead of its first frame: upload the run-off atlas and draw it once
     * (the caller paints over it in the same frame), so the GPU sets up each material's
     * pipeline now, in idle time, not on the first scrolling frame of the lap.
     */
    warm(r: THREE.WebGLRenderer, w: number, h: number) {
      r.initTexture(runoff.texture);
      update(0, w, h, 1);
      line.glow.visible = true;
      r.render(scene, camera);
      line.glow.visible = false;
      lastP = -1; // forget this frame: the lap's first real one starts afresh
      line.forget();
    },
    dispose,
  };
}
