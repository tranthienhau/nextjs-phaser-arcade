import * as Phaser from "phaser";
import {
  Grid,
  ROWS,
  COLS,
  createGrid,
  findMatches,
  scoreFor,
  swap,
  areAdjacent,
  hasPossibleMove,
} from "./logic";
import {
  BOARD_SIZE,
  PADDING,
  GEM_COLORS,
  TILE_BG,
  SELECT_COLOR,
  SWAP_MS,
  DROP_MS,
  POP_MS,
} from "./config";
import { MILESTONES } from "@/lib/rewards";
import { load, save } from "@/lib/storage";
import { GameCallbacks } from "@/lib/game";

const SAVE_KEY = "match3";
type SaveState = { grid: Grid; score: number; moves: number };

type Tile = Phaser.GameObjects.Container & { gemType?: number };

const CELL = (BOARD_SIZE - PADDING * 2) / COLS;

export class Match3Scene extends Phaser.Scene {
  private grid: Grid = [];
  private tiles: (Tile | null)[][] = [];
  private selected: { r: number; c: number } | null = null;
  private busy = false;
  private score = 0;
  private moves = 0;
  private firedMilestones = new Set<number>();
  private cb!: GameCallbacks;
  private dragStart: { x: number; y: number; r: number; c: number } | null = null;

  constructor() {
    super("match3");
  }

  init(data: GameCallbacks) {
    this.cb = data;
  }

  private emitStats() {
    this.cb.onStats([
      { label: "Score", value: this.score },
      { label: "Moves", value: this.moves },
    ]);
  }

  create() {
    this.drawBoardBackground();

    const saved = load<SaveState>(SAVE_KEY);
    if (saved) {
      this.grid = saved.grid;
      this.score = saved.score;
      this.moves = saved.moves;
    } else {
      this.grid = createGrid();
    }

    this.tiles = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.tiles[r][c] = this.makeGem(this.grid[r][c], r, c);
      }
    }

    this.cb.onScore(this.score);
    this.emitStats();
    this.recordSeenMilestones();

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointerup", this.onPointerUp, this);
  }

  // --- rendering helpers -------------------------------------------------

  private drawBoardBackground() {
    const g = this.add.graphics();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        g.fillStyle(TILE_BG, 1);
        g.fillRoundedRect(
          PADDING + c * CELL + 3,
          PADDING + r * CELL + 3,
          CELL - 6,
          CELL - 6,
          8
        );
      }
    }
  }

  private xFor(c: number) {
    return PADDING + c * CELL + CELL / 2;
  }
  private yFor(r: number) {
    return PADDING + r * CELL + CELL / 2;
  }

  private makeGem(type: number, r: number, c: number, y?: number): Tile {
    const size = CELL * 0.78;
    const gfx = this.add.graphics();
    gfx.fillStyle(GEM_COLORS[type], 1);
    gfx.fillRoundedRect(-size / 2, -size / 2, size, size, 12);
    gfx.fillStyle(0xffffff, 0.25);
    gfx.fillCircle(-size / 4, -size / 4, size / 7);

    const container = this.add.container(
      this.xFor(c),
      y ?? this.yFor(r),
      [gfx]
    ) as Tile;
    container.gemType = type;
    container.setSize(CELL, CELL);
    return container;
  }

  // --- input -------------------------------------------------------------

  private cellAt(x: number, y: number): { r: number; c: number } | null {
    const c = Math.floor((x - PADDING) / CELL);
    const r = Math.floor((y - PADDING) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    if (this.busy) return;
    const cell = this.cellAt(p.x, p.y);
    if (!cell) return;
    this.dragStart = { x: p.x, y: p.y, ...cell };

    if (this.selected) {
      if (areAdjacent([this.selected.r, this.selected.c], [cell.r, cell.c])) {
        this.trySwap(this.selected, cell);
        this.clearSelection();
        this.dragStart = null;
      } else {
        this.setSelection(cell);
      }
    } else {
      this.setSelection(cell);
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer) {
    if (this.busy || !this.dragStart) return;
    const dx = p.x - this.dragStart.x;
    const dy = p.y - this.dragStart.y;
    const threshold = CELL * 0.35;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
      this.dragStart = null;
      return; // treat as a tap; selection already handled on down
    }
    const { r, c } = this.dragStart;
    let target: { r: number; c: number };
    if (Math.abs(dx) > Math.abs(dy)) {
      target = { r, c: c + (dx > 0 ? 1 : -1) };
    } else {
      target = { r: r + (dy > 0 ? 1 : -1), c };
    }
    if (target.r >= 0 && target.r < ROWS && target.c >= 0 && target.c < COLS) {
      this.clearSelection();
      this.trySwap({ r, c }, target);
    }
    this.dragStart = null;
  }

  private setSelection(cell: { r: number; c: number }) {
    this.clearSelection();
    this.selected = cell;
    const tile = this.tiles[cell.r][cell.c];
    if (tile) {
      tile.setScale(1);
      this.tweens.add({
        targets: tile,
        scale: 1.12,
        duration: 120,
        ease: "Sine.Out",
      });
      const ring = this.add.graphics({ x: tile.x, y: tile.y });
      ring.lineStyle(3, SELECT_COLOR, 0.9);
      ring.strokeRoundedRect(-CELL / 2 + 4, -CELL / 2 + 4, CELL - 8, CELL - 8, 12);
      ring.setName("selRing");
    }
  }

  private clearSelection() {
    if (this.selected) {
      const tile = this.tiles[this.selected.r][this.selected.c];
      if (tile) this.tweens.add({ targets: tile, scale: 1, duration: 100 });
    }
    this.children.getByName("selRing")?.destroy();
    this.selected = null;
  }

  // --- core loop ---------------------------------------------------------

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({ ...config, onComplete: () => resolve() });
    });
  }

  private async trySwap(
    a: { r: number; c: number },
    b: { r: number; c: number }
  ) {
    if (this.busy) return;
    this.busy = true;

    await this.animateSwap(a, b);
    swap(this.grid, [a.r, a.c], [b.r, b.c]);
    this.swapTiles(a, b);

    if (findMatches(this.grid).size === 0) {
      // invalid move: bounce back so the player feels the rejection
      await this.animateSwap(a, b);
      swap(this.grid, [a.r, a.c], [b.r, b.c]);
      this.swapTiles(a, b);
      this.busy = false;
      return;
    }

    this.moves += 1;
    this.emitStats();
    await this.resolveCascades();
    this.persist();
    this.busy = false;
  }

  private async animateSwap(
    a: { r: number; c: number },
    b: { r: number; c: number }
  ) {
    const ta = this.tiles[a.r][a.c];
    const tb = this.tiles[b.r][b.c];
    if (!ta || !tb) return;
    await Promise.all([
      this.tween({
        targets: ta,
        x: this.xFor(b.c),
        y: this.yFor(b.r),
        duration: SWAP_MS,
        ease: "Quad.Out",
      }),
      this.tween({
        targets: tb,
        x: this.xFor(a.c),
        y: this.yFor(a.r),
        duration: SWAP_MS,
        ease: "Quad.Out",
      }),
    ]);
  }

  private swapTiles(
    a: { r: number; c: number },
    b: { r: number; c: number }
  ) {
    const tmp = this.tiles[a.r][a.c];
    this.tiles[a.r][a.c] = this.tiles[b.r][b.c];
    this.tiles[b.r][b.c] = tmp;
  }

  private async resolveCascades() {
    // Loop while clears keep producing new matches (combo chains).
    for (;;) {
      const matched = findMatches(this.grid);
      if (matched.size === 0) break;

      this.addScore(scoreFor(matched.size));

      const pops: Promise<void>[] = [];
      for (const key of matched) {
        const [r, c] = key.split(",").map(Number);
        const tile = this.tiles[r][c];
        this.grid[r][c] = -1;
        this.tiles[r][c] = null;
        if (tile) {
          pops.push(
            this.tween({
              targets: tile,
              scale: 0,
              duration: POP_MS,
              ease: "Back.In",
            }).then(() => tile.destroy())
          );
        }
      }
      await Promise.all(pops);
      await this.collapseColumns();
    }

    if (!hasPossibleMove(this.grid)) {
      await this.reshuffle();
    }
  }

  private async collapseColumns() {
    const drops: Promise<void>[] = [];
    for (let c = 0; c < COLS; c++) {
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] !== -1) {
          if (writeRow !== r) {
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[r][c] = -1;
            const tile = this.tiles[r][c]!;
            this.tiles[writeRow][c] = tile;
            this.tiles[r][c] = null;
            drops.push(
              this.tween({
                targets: tile,
                y: this.yFor(writeRow),
                duration: DROP_MS,
                ease: "Quad.In",
              })
            );
          }
          writeRow--;
        }
      }
      // spawn new gems above the board and drop them in
      for (let r = writeRow; r >= 0; r--) {
        const type = Math.floor(Math.random() * GEM_COLORS.length);
        this.grid[r][c] = type;
        const startY = this.yFor(r) - (writeRow - r + 1) * CELL - CELL;
        const tile = this.makeGem(type, r, c, startY);
        this.tiles[r][c] = tile;
        drops.push(
          this.tween({
            targets: tile,
            y: this.yFor(r),
            duration: DROP_MS + 40,
            ease: "Quad.In",
          })
        );
      }
    }
    await Promise.all(drops);
  }

  private async reshuffle() {
    this.grid = createGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.tiles[r][c]?.destroy();
        this.tiles[r][c] = this.makeGem(this.grid[r][c], r, c);
      }
    }
  }

  // --- scoring / persistence --------------------------------------------

  private addScore(points: number) {
    if (points <= 0) return;
    this.score += points;
    this.cb.onScore(this.score);
    this.emitStats();
    for (const m of MILESTONES) {
      if (this.score >= m && !this.firedMilestones.has(m)) {
        this.firedMilestones.add(m);
        this.cb.onMilestone(m, this.score);
      }
    }
  }

  private recordSeenMilestones() {
    for (const m of MILESTONES) {
      if (this.score >= m) this.firedMilestones.add(m);
    }
  }

  private persist() {
    const state: SaveState = {
      grid: this.grid,
      score: this.score,
      moves: this.moves,
    };
    save(SAVE_KEY, state);
  }

  resetGame() {
    this.score = 0;
    this.moves = 0;
    this.firedMilestones.clear();
    this.selected = null;
    this.grid = createGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.tiles[r][c]?.destroy();
        this.tiles[r][c] = this.makeGem(this.grid[r][c], r, c);
      }
    }
    this.cb.onScore(0);
    this.emitStats();
    this.persist();
  }
}
