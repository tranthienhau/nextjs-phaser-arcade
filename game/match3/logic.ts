// Pure match-3 board logic. No Phaser, no DOM - so it is unit-testable and
// the rendering layer can stay thin. Grid is [row][col], values are gem ids.

export const ROWS = 8;
export const COLS = 8;
export const GEM_TYPES = 6;

export type Grid = number[][];

function randGem(): number {
  return Math.floor(Math.random() * GEM_TYPES);
}

// Build a starting grid with no pre-existing matches, so the first frame is calm.
export function createGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      let gem = randGem();
      // avoid 3-in-a-row on spawn
      while (
        (c >= 2 && grid[r][c - 1] === gem && grid[r][c - 2] === gem) ||
        (r >= 2 && grid[r - 1][c] === gem && grid[r - 2][c] === gem)
      ) {
        gem = randGem();
      }
      grid[r][c] = gem;
    }
  }
  return grid;
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function areAdjacent(a: [number, number], b: [number, number]): boolean {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  return dr + dc === 1;
}

export function swap(grid: Grid, a: [number, number], b: [number, number]): void {
  const tmp = grid[a[0]][a[1]];
  grid[a[0]][a[1]] = grid[b[0]][b[1]];
  grid[b[0]][b[1]] = tmp;
}

// Returns the set of cells that are part of any horizontal/vertical run >= 3.
export function findMatches(grid: Grid): Set<string> {
  const matched = new Set<string>();

  // horizontal
  for (let r = 0; r < ROWS; r++) {
    let runStart = 0;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && grid[r][c] === grid[r][runStart]) continue;
      const len = c - runStart;
      if (len >= 3) {
        for (let k = runStart; k < c; k++) matched.add(`${r},${k}`);
      }
      runStart = c;
    }
  }

  // vertical
  for (let c = 0; c < COLS; c++) {
    let runStart = 0;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && grid[r][c] === grid[runStart][c]) continue;
      const len = r - runStart;
      if (len >= 3) {
        for (let k = runStart; k < r; k++) matched.add(`${k},${c}`);
      }
      runStart = r;
    }
  }

  return matched;
}

export type CollapseMove = { from: number; to: number; col: number; gem: number };

// Clears matched cells, applies gravity, and refills from the top.
// Returns the per-column drops so the renderer can animate them.
export function collapseAndRefill(
  grid: Grid,
  matched: Set<string>
): CollapseMove[] {
  const moves: CollapseMove[] = [];

  for (const key of matched) {
    const [r, c] = key.split(",").map(Number);
    grid[r][c] = -1;
  }

  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== -1) {
        if (writeRow !== r) {
          grid[writeRow][c] = grid[r][c];
          grid[r][c] = -1;
          moves.push({ from: r, to: writeRow, col: c, gem: grid[writeRow][c] });
        }
        writeRow--;
      }
    }
    // refill empties above
    for (let r = writeRow; r >= 0; r--) {
      const gem = randGem();
      grid[r][c] = gem;
      moves.push({ from: r - writeRow - 1, to: r, col: c, gem });
    }
  }

  return moves;
}

// Score: 3 = 30, each extra gem in the clear = +15 (rewards bigger cascades).
export function scoreFor(matchedCount: number): number {
  if (matchedCount < 3) return 0;
  return 30 + (matchedCount - 3) * 15;
}

// Is there at least one swap that produces a match? Used to reshuffle a dead board.
export function hasPossibleMove(grid: Grid): boolean {
  const test = (a: [number, number], b: [number, number]): boolean => {
    const g = cloneGrid(grid);
    swap(g, a, b);
    return findMatches(g).size > 0;
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS && test([r, c], [r, c + 1])) return true;
      if (r + 1 < ROWS && test([r, c], [r + 1, c])) return true;
    }
  }
  return false;
}
