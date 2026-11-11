// Places bento tiles on a grid of `cols` columns with no holes, whatever the count and mix.

export type TileKind = 'number' | 'text' | 'media';
export type Place = { col: number; row: number; w: number; h: number };

/** The first number tile is wide, screens are tall, the rest take one cell. */
function wanted(kinds: TileKind[], cols: number) {
  const firstNumber = kinds.indexOf('number');
  return kinds.map((k, i) => ({ w: i === firstNumber ? Math.min(2, cols) : 1, h: k === 'media' && cols > 1 ? 2 : 1 }));
}

/**
 * Dense first-fit packing, then every hole is closed by stretching a neighbour into it:
 * the tile to its left grows right, else the tile above grows down, else the tile to its right grows left.
 * Holes are scanned top to bottom, so each fix only ever sees filled cells above it.
 */
export function layoutBento(kinds: TileKind[], cols: number): Place[] {
  const grid: number[][] = []; // grid[row][col] = tile index, or -1
  const row = (r: number) => (grid[r] ??= Array.from({ length: cols }, () => -1));
  const free = (r: number, c: number, w: number, h: number) => {
    if (c + w > cols) return false;
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (row(y)[x] !== -1) return false;
    return true;
  };
  const fill = (i: number, p: Place) => { for (let y = p.row; y < p.row + p.h; y++) for (let x = p.col; x < p.col + p.w; x++) row(y)[x] = i; };

  const places = wanted(kinds, cols).map((s, i) => {
    for (let r = 0; ; r++) {
      for (let c = 0; c < cols; c++) {
        if (free(r, c, s.w, s.h)) { const p = Object.assign(s, { col: c, row: r }); fill(i, p); return p; }
      }
    }
  });

  const rows = Math.max(...places.map(p => p.row + p.h));
  const columnFree = (p: Place, x: number) => x >= 0 && x < cols && Array.from({ length: p.h }, (_, k) => row(p.row + k)[x]).every(v => v === -1);
  const rowFree = (p: Place, y: number) => y < rows && Array.from({ length: p.w }, (_, k) => row(y)[p.col + k]).every(v => v === -1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (row(r)[c] !== -1) continue;
      const left = c > 0 ? row(r)[c - 1] : -1;
      const up = r > 0 ? row(r - 1)[c] : -1;
      const right = c < cols - 1 ? row(r)[c + 1] : -1;
      let p: Place | undefined;
      if (left !== -1 && columnFree(places[left], c)) { p = places[left]; p.w++; }
      else if (up !== -1 && rowFree(places[up], r)) { p = places[up]; p.h++; }
      else if (right !== -1 && columnFree(places[right], c)) { p = places[right]; p.col--; p.w++; }
      if (p) fill(places.indexOf(p), p);
    }
  }
  return places;
}
