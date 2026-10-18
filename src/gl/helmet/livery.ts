import * as THREE from 'three';
import { PALETTE } from '@/art/palette';
import { THETA_LEN } from './shape';

// The helmet paint, drawn in code onto the shell's UV layout:
//   u (x) = around the head, 0 = back seam, 0.25 = left side, 0.5 = front, 0.75 = right side
//   v (y) = top of the head (0) down to the neck opening (1), linear in theta.
const W = 2048, H = 1024;
const { ac: AC, fg: FG } = PALETTE, CARBON = '#121214';
const yAt = (theta: number) => (theta / THETA_LEN) * H;

type Ctx = CanvasRenderingContext2D;

function carbonWeave(c: Ctx) {
  // The twill repeats every 4 cells both ways, so one 4 x 4 cell tile, filled as a pattern,
  // gives the same pixels as painting the ~58k cells one by one (which cost a long task).
  const s = 6, tile = document.createElement('canvas');
  tile.width = tile.height = s * 4;
  const t = tile.getContext('2d')!;
  t.fillStyle = CARBON;
  t.fillRect(0, 0, s * 4, s * 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    t.fillStyle = ((x + y) & 3) < 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.25)';
    t.fillRect(x * s, y * s, s, s);
  }
  c.fillStyle = c.createPattern(tile, 'repeat')!;
  c.fillRect(0, 0, W, H);
}

/** Sweeping side stripe from the chin up toward the back of the head. */
function swoosh(c: Ctx, mirror: boolean, color: string, width: number, lift = 0) {
  const X = (u: number) => (mirror ? 1 - u : u) * W;
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(X(0.47), yAt(Math.PI * 0.74) - lift);
  c.bezierCurveTo(X(0.36), yAt(Math.PI * 0.7) - lift, X(0.26), yAt(Math.PI * 0.36) - lift, X(0.03), yAt(Math.PI * 0.26) - lift);
  c.stroke();
}

/** Text drawn squeezed horizontally so it reads with correct proportions on the sphere. */
function sideText(c: Ctx, u: number, theta: number, text: string, size: number, fill: string, stroke?: string) {
  const squeeze = (W / (2 * Math.PI)) / (H / THETA_LEN) / Math.sin(theta);
  c.save();
  c.translate(u * W, yAt(theta));
  c.scale(squeeze, 1);
  c.font = `italic 800 ${size}px "Hubot Sans", "Arial Black", sans-serif`;
  c.fontStretch = 'expanded';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (stroke) { c.lineWidth = size * 0.08; c.strokeStyle = stroke; c.strokeText(text, 0, 0); }
  c.fillStyle = fill;
  c.fillText(text, 0, 0);
  c.restore();
}

function paint(c: Ctx) {
  carbonWeave(c);

  // Centre stripe over the crown, front to back.
  c.fillStyle = AC;
  c.fillRect(W * 0.5 - W * 0.022, 0, W * 0.044, yAt(Math.PI * 0.37));
  c.fillRect(0, 0, W * 0.02, yAt(Math.PI * 0.72));
  c.fillRect(W - W * 0.02, 0, W * 0.02, yAt(Math.PI * 0.72));
  c.fillStyle = FG;
  c.fillRect(W * 0.5 - W * 0.03, 0, W * 0.006, yAt(Math.PI * 0.36));
  c.fillRect(W * 0.5 + W * 0.024, 0, W * 0.006, yAt(Math.PI * 0.36));

  // Side swooshes with a white pinstripe.
  for (const m of [false, true]) {
    swoosh(c, m, AC, 70);
    swoosh(c, m, FG, 8, 58);
  }

  // Driver number and initials on both sides.
  for (const u of [0.25, 0.75]) {
    sideText(c, u, Math.PI * 0.5, '04', 190, FG, AC);
    sideText(c, u, Math.PI * 0.335, 'MA', 64, AC);
  }
  // Name across the back seam (drawn on both edges so the halves meet).
  for (const u of [0, 1]) sideText(c, u, Math.PI * 0.6, 'AHSAN', 70, FG);

  // Checkered band just above the neck line.
  const y0 = yAt(THETA_LEN - Math.PI * 0.05), sq = 14;
  for (let row = 0; row < 2; row++) for (let x = 0; x < W; x += sq) {
    c.fillStyle = ((x / sq + row) & 1) ? FG : PALETTE.carbon;
    c.fillRect(x, y0 + row * sq, sq, sq);
  }
}

/** The shell's paint, as one texture: colour only, since the matte shell has uniform roughness. */
export async function liveryTexture(anisotropy: number) {
  try { await document.fonts.load('italic 800 100px "Hubot Sans"'); } catch { /* fallback font */ }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  paint(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  return map;
}

/** Rounded-rectangle alpha mask for the visor and its seal. */
export function roundedMask(radius = 0.22) {
  const el = document.createElement('canvas');
  el.width = el.height = 256;
  const c = el.getContext('2d')!;
  c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#fff';
  const r = radius * 256;
  c.beginPath();
  c.roundRect(4, 4, 248, 248, [r, r, r * 1.6, r * 1.6]);
  c.fill();
  return new THREE.CanvasTexture(el);
}
