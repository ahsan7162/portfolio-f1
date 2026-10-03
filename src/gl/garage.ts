import * as THREE from 'three';

/**
 * A pit garage to bake into the helmet's reflection map: a dark box with long
 * strip lights overhead and down one side, plus one red strip. Baked once with
 * PMREMGenerator.fromScene, so it costs nothing per frame and downloads nothing;
 * as the helmet turns, the long strip highlights slide across the shell and visor.
 */
export function garageScene() {
  const scene = new THREE.Scene();
  const disposables: Array<{ dispose: () => void }> = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // Room: grey walls and a lighter floor, so the shell keeps its carbon texture between the strips.
  const room = new THREE.Mesh(keep(new THREE.BoxGeometry(12, 6, 12)), keep(new THREE.MeshBasicMaterial({ color: '#34343b', side: THREE.BackSide })));
  room.position.y = 1.5;
  scene.add(room);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(12, 12)), keep(new THREE.MeshBasicMaterial({ color: '#5a5a60' })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  scene.add(floor);

  // Strip lights: MeshBasic colours above 1 act as emitters in the baked map.
  const strip = keep(new THREE.BoxGeometry(0.45, 0.05, 9));
  const white = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(12) }));
  const red = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.14, 0.22).multiplyScalar(8) }));
  // Four overhead strips across the ceiling.
  for (const x of [-2.4, -0.8, 0.8, 2.4]) {
    const m = new THREE.Mesh(strip, white);
    m.position.set(x, 4.4, 0);
    scene.add(m);
  }
  // A tall side panel (the open garage door), soft and wide, for a broad highlight.
  const door = new THREE.Mesh(keep(new THREE.PlaneGeometry(7, 3)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(4), side: THREE.DoubleSide })));
  door.position.set(0, 1.2, 5.9);
  scene.add(door);
  // One red strip low on the left wall: a thin accent line on the helmet's side.
  const accent = new THREE.Mesh(strip, red);
  accent.position.set(-5.8, 0.4, 0);
  scene.add(accent);
  // A vertical white strip on the right for a rim highlight.
  const rim = new THREE.Mesh(keep(new THREE.BoxGeometry(0.05, 4, 0.4)), white);
  rim.position.set(5.8, 1.5, -2);
  scene.add(rim);

  return { scene, dispose: () => disposables.forEach(d => d.dispose()) };
}
