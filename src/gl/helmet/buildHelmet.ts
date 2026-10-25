import * as THREE from 'three';
import { groundShade, onPalette, PALETTE } from '@/art/palette';
import { disposables } from '../dispose';
import { srgb } from '../glsl';
import { seamColour, withReveal } from './dissolve';
import { liveryTexture } from './livery';
import { addChinVent, addNeckRoll, addPivots, addScoop, addSpoiler, addVisor } from './parts';
import { shellGeometry } from './shape';

export type Helmet = {
  group: THREE.Group;
  /** 0 = nothing, 1 = fully built. Drives the dissolve on every solid part. */
  reveal: { value: number };
  /** 0..1 how much of the wireframe is drawn; wireOpacity fades it out. */
  wire: { draw: number; opacity: number };
  update: () => void;
  dispose: () => void;
};

/** The wireframe that draws itself before the solid dissolves in. */
function buildWire(group: THREE.Group, keep: ReturnType<typeof disposables>['keep']) {
  const geo = keep(new THREE.WireframeGeometry(shellGeometry({ w: 40, h: 22 })));
  const mat = keep(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }));
  const lines = new THREE.LineSegments(geo, mat);
  lines.scale.setScalar(1.004);
  group.add(lines);
  const state = { draw: 0, opacity: 0.9 };
  const count = geo.attributes.position.count;
  return {
    state, mat,
    update: () => {
      geo.setDrawRange(0, Math.floor(count * state.draw / 2) * 2);
      mat.opacity = state.opacity;
      lines.visible = state.opacity > 0.01 && state.draw > 0;
    },
  };
}

/** The procedural F1 helmet: a painted shell with its fittings, in the current livery. */
export async function buildHelmet(opts: { anisotropy: number }): Promise<Helmet> {
  // Shell resolution: smooth shading and the livery texture carry the detail, so this is plenty.
  // Same on phones: the helmet fills more of a small screen, so a coarser shell shows its facets.
  const seg = { w: 44, h: 28 };
  const reveal = { value: 0 };
  const group = new THREE.Group();
  const { keep, dispose } = disposables();

  const { map, repaint } = await liveryTexture(opts.anisotropy);
  keep(map);

  // Matte satin shell over carbon (no clear coat); the glossy visor contrasts with it.
  const shellMat = keep(withReveal(new THREE.MeshStandardMaterial({
    map, roughness: 0.75, metalness: 0.1,
    side: THREE.DoubleSide, envMapIntensity: 1.5,
  }), reveal));
  group.add(new THREE.Mesh(keep(shellGeometry(seg)), shellMat));

  addVisor(group, keep, reveal);
  addPivots(group, keep, reveal);
  const accentPaint = keep(withReveal(new THREE.MeshStandardMaterial({ roughness: 0.22 }), reveal));
  const carbonMat = keep(withReveal(new THREE.MeshStandardMaterial({ roughness: 0.3 }), reveal));
  addSpoiler(group, keep, carbonMat);
  addScoop(group, keep, carbonMat, accentPaint);
  addChinVent(group, keep, reveal);
  addNeckRoll(group, keep, reveal);
  const wire = buildWire(group, keep);

  // The livery's colours, now and on every change: the painted shell, the accent and carbon parts, the seam and wireframe.
  const paint = (first = false) => {
    if (!first) repaint();
    accentPaint.color.set(PALETTE.ac);
    carbonMat.color.set(groundShade('#141416'));
    srgb(PALETTE.ac, seamColour.value);
    wire.mat.color.set(PALETTE.ac);
  };
  paint(true);
  keep({ dispose: onPalette(() => paint()) });

  // Centre the helmet on its own middle and sit it slightly nose-down.
  group.position.set(0, 0.05, -0.05);
  const pivot = new THREE.Group();
  pivot.add(group);

  return { group: pivot, reveal, wire: wire.state, update: wire.update, dispose };
}
