// Pure block-placement logic (1010!-style). No Phaser, no DOM.

export const G = 8;
export type Cell = [number, number]; // [dRow, dCol] relative to shape origin

export const SHAPES: Cell[][] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]], // 2x2
  [[0, 0], [1, 0], [1, 1]], // L variants
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 0]],
];

export function emptyGrid(): number[][] {
  return Array.from({ length: G }, () => Array(G).fill(0));
}

export function randomShape(): Cell[] {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

export function dealThree(): Cell[][] {
  return [randomShape(), randomShape(), randomShape()];
}

export function fits(grid: number[][], shape: Cell[], r0: number, c0: number): boolean {
  for (const [dr, dc] of shape) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r < 0 || r >= G || c < 0 || c >= G) return false;
    if (grid[r][c] !== 0) return false;
  }
  return true;
}

export function place(grid: number[][], shape: Cell[], r0: number, c0: number): void {
  for (const [dr, dc] of shape) grid[r0 + dr][c0 + dc] = 1;
}

// Clears full rows and columns. Returns the list of cleared cells for animation.
export function clearLines(grid: number[][]): { cells: Cell[]; lines: number } {
  const fullRows: number[] = [];
  const fullCols: number[] = [];
  for (let r = 0; r < G; r++) if (grid[r].every((v) => v !== 0)) fullRows.push(r);
  for (let c = 0; c < G; c++) {
    let full = true;
    for (let r = 0; r < G; r++) if (grid[r][c] === 0) full = false;
    if (full) fullCols.push(c);
  }
  const cells: Cell[] = [];
  const seen = new Set<string>();
  const mark = (r: number, c: number) => {
    const k = `${r},${c}`;
    if (!seen.has(k)) {
      seen.add(k);
      cells.push([r, c]);
    }
  };
  for (const r of fullRows) for (let c = 0; c < G; c++) mark(r, c);
  for (const c of fullCols) for (let r = 0; r < G; r++) mark(r, c);
  for (const [r, c] of cells) grid[r][c] = 0;
  return { cells, lines: fullRows.length + fullCols.length };
}

// Can any of the given shapes be placed somewhere on the grid?
export function anyFits(grid: number[][], shapes: Cell[][]): boolean {
  for (const shape of shapes) {
    if (shape.length === 0) continue;
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        if (fits(grid, shape, r, c)) return true;
      }
    }
  }
  return false;
}
