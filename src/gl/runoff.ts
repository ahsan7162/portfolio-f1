import * as THREE from 'three';

// Run-off logos: each career stage's company painted flat on the ground beside its
// sector, like the sponsor names on real F1 run-off areas. Flat and facing up, they
// read from the aerial camera (standing boards would be foreshortened). All of them
// are one mesh and one canvas atlas; the active stage's name lights up red.
const ROW_W = 1024, ROW_H = 256, BOARD_W = 3, BOARD_H = BOARD_W * ROW_H / ROW_W;

function atlas(labels: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = ROW_W; canvas.height = ROW_H * labels.length;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    try { (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'expanded'; } catch { /* older canvas */ }
    labels.forEach((label, i) => {
      const text = label.toUpperCase();
      let size = 170;
      ctx.font = `800 ${size}px "Mona Sans Variable", sans-serif`;
      const w = ctx.measureText(text).width;
      if (w > ROW_W * 0.92) { size *= (ROW_W * 0.92) / w; ctx.font = `800 ${size}px "Mona Sans Variable", sans-serif`; }
      ctx.fillText(text, ROW_W / 2, ROW_H * (i + 0.54));
    });
    tex.needsUpdate = true;
  };
  draw();
  // The site font is normally loaded long before the Stage; redraw once it is, just in case.
  document.fonts?.load('800 170px "Mona Sans Variable"').then(draw).catch(() => {});
  return tex;
}

/**
 * @param at   curve position (0..1) of each label's sector middle
 * @param view camera orbit angle at that moment, so the text reads upright from there
 */
export function createRunoff(curve: THREE.CatmullRomCurve3, labels: string[], at: number[], view: number[], clearance: number) {
  const track = curve.getSpacedPoints(400).map(p => new THREE.Vector2(p.x, p.z));
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  const pos: number[] = [], uv: number[] = [], stage: number[] = [], idx: number[] = [];

  labels.forEach((_, i) => {
    const p = curve.getPointAt(at[i]), tan = curve.getTangentAt(at[i]);
    side.crossVectors(tan, up).normalize();
    // Text top points away from the camera; right is screen right.
    const a = view[i];
    const top = new THREE.Vector2(-Math.sin(a), -Math.cos(a)), right = new THREE.Vector2(Math.cos(a), -Math.sin(a));
    const corners = (c: THREE.Vector2) => [-1, 1].flatMap(sx => [-1, 1].map(sy =>
      c.clone().addScaledVector(right, sx * BOARD_W / 2).addScaledVector(top, sy * BOARD_H / 2)));
    // Try spots on both sides of the sector, nearest first; keep the first that clears every part of the track.
    let best: THREE.Vector2 | null = null, bestGap = -Infinity;
    search: for (const d of [1.2, 1.5, 1.8, 2.2, 2.7]) for (const s of [1, -1]) for (const slide of [0, 0.4, -0.4]) {
      const c = new THREE.Vector2(p.x + side.x * d * s, p.z + side.z * d * s).addScaledVector(new THREE.Vector2(tan.x, tan.z).normalize(), slide);
      const probes = [c, ...corners(c), ...corners(c).map(k => k.clone().add(c).multiplyScalar(0.5))];
      const gap = Math.min(...probes.map(q => Math.min(...track.map(t => t.distanceTo(q)))));
      if (gap > bestGap) { bestGap = gap; best = c; }
      if (gap > clearance) { best = c; break search; }
    }
    const c = best!, base = pos.length / 3;
    corners(c).forEach((k, j) => {
      pos.push(k.x, p.y - 0.03, k.y);
      // corners(): (-1,-1) (-1,1) (1,-1) (1,1) as (right, top)
      uv.push(j < 2 ? 0 : 1, j % 2);
      stage.push(i);
    });
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aStage', new THREE.Float32BufferAttribute(stage, 1));
  geo.setIndex(idx);
  const tex = atlas(labels);
  const lit = new Array(labels.length).fill(0);
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uMap: { value: tex }, uRows: { value: labels.length }, uLit: { value: lit.slice() } },
    vertexShader: /* glsl */ `
      in float aStage;
      out vec2 vUv;
      out float vStage;
      void main() { vUv = uv; vStage = aStage; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in vec2 vUv;
      in float vStage;
      out vec4 outColor;
      uniform sampler2D uMap;
      uniform float uRows;
      uniform float uLit[${labels.length}];
      void main() {
        float a = texture(uMap, vec2(vUv.x, 1.0 - (vStage + 1.0 - vUv.y) / uRows)).a;
        float lit = 0.0;
        for (int i = 0; i < ${labels.length}; i++) if (abs(vStage - float(i)) < 0.5) lit = uLit[i];
        // Painted white at rest, faded into the ground; the active stage glows red.
        vec3 col = mix(vec3(0.957, 0.957, 0.929), vec3(1.0, 0.141, 0.22), lit);
        outColor = vec4(col, a * mix(0.14, 0.95, lit));
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;

  return {
    mesh,
    texture: tex,
    /** Ease each label towards lit (the active stage) or rest. Returns true while still easing. */
    update(active: number) {
      const u = mat.uniforms.uLit.value as number[];
      let easing = false;
      for (let i = 0; i < u.length; i++) {
        const target = i === active ? 1 : 0;
        u[i] += (target - u[i]) * 0.14;
        if (Math.abs(target - u[i]) > 0.005) easing = true; else u[i] = target;
      }
      return easing;
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose(); },
  };
}
