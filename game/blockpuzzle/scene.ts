import * as Phaser from "phaser";
import {
  G,
  Cell,
  emptyGrid,
  dealThree,
  fits,
  place,
  clearLines,
  anyFits,
} from "./logic";
import { BOARD_SIZE, TILE_BG, GEM_COLORS } from "@/game/match3/config";
import { MILESTONES } from "@/lib/rewards";
import { load, save } from "@/lib/storage";
import { GameCallbacks } from "@/lib/game";

const SAVE_KEY = "blockpuzzle";

// Geometry: grid in the top area, a dedicated tray band along the bottom.
const GRID_PX = 336;
const CELL = GRID_PX / G; // 42
const ORIGIN_X = (BOARD_SIZE - GRID_PX) / 2; // 72
const ORIGIN_Y = 8;
const TRAY_Y = ORIGIN_Y + GRID_PX + 64; // ~408
const TRAY_X = [BOARD_SIZE * 0.25, BOARD_SIZE * 0.5, BOARD_SIZE * 0.75];
const TRAY_SCALE = 0.52;
const BLOCK_COLOR = 0x5db1ff;

type Piece = {
  shape: Cell[];
  color: number;
  w: number;
  h: number;
  container: Phaser.GameObjects.Container | null;
  home: { x: number; y: number };
};

type SaveState = { grid: number[][]; score: number; lines: number };

export class BlockPuzzleScene extends Phaser.Scene {
  private grid: number[][] = emptyGrid();
  private blocks: (Phaser.GameObjects.Graphics | null)[][] = [];
  private pieces: (Piece | null)[] = [null, null, null];
  private ghost!: Phaser.GameObjects.Graphics;
  private score = 0;
  private lines = 0;
  private fired = new Set<number>();
  private cb!: GameCallbacks;

  constructor() {
    super("blockpuzzle");
  }

  init(data: GameCallbacks) {
    this.cb = data;
  }

  create() {
    this.drawBackground();
    this.ghost = this.add.graphics();
    this.blocks = Array.from({ length: G }, () => Array(G).fill(null));

    const saved = load<SaveState>(SAVE_KEY);
    if (saved) {
      this.grid = saved.grid;
      this.score = saved.score;
      this.lines = saved.lines;
      this.redrawPlaced();
    } else {
      this.grid = emptyGrid();
    }

    this.dealPieces();
    this.recordSeenMilestones();
    this.emitStats();

    this.input.on("dragstart", this.onDragStart, this);
    this.input.on("drag", this.onDrag, this);
    this.input.on("dragend", this.onDragEnd, this);
  }

  // --- rendering ---------------------------------------------------------

  private drawBackground() {
    const g = this.add.graphics();
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        g.fillStyle(TILE_BG, 1);
        g.fillRoundedRect(
          ORIGIN_X + c * CELL + 2,
          ORIGIN_Y + r * CELL + 2,
          CELL - 4,
          CELL - 4,
          6
        );
      }
    }
    // tray band backdrop
    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(8, TRAY_Y - 52, BOARD_SIZE - 16, 104, 14);
  }

  private cellCenter(r: number, c: number) {
    return {
      x: ORIGIN_X + c * CELL + CELL / 2,
      y: ORIGIN_Y + r * CELL + CELL / 2,
    };
  }

  private blockGfx(color: number, size: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-size / 2, -size / 2, size, size, 7);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(-size / 2, -size / 2, size, size / 3, 7);
    return g;
  }

  private redrawPlaced() {
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        if (this.grid[r][c] !== 0) {
          const { x, y } = this.cellCenter(r, c);
          const g = this.blockGfx(BLOCK_COLOR, CELL - 4);
          g.setPosition(x, y);
          this.blocks[r][c] = g;
        }
      }
    }
  }

  // --- tray / pieces -----------------------------------------------------

  private dealPieces() {
    const shapes = dealThree();
    for (let i = 0; i < 3; i++) {
      const color = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
      this.pieces[i] = this.makePiece(shapes[i], color, i);
    }
  }

  private makePiece(shape: Cell[], color: number, slot: number): Piece {
    const maxDr = Math.max(...shape.map((s) => s[0]));
    const maxDc = Math.max(...shape.map((s) => s[1]));
    const w = (maxDc + 1) * CELL;
    const h = (maxDr + 1) * CELL;

    // Anchor the bounding box on the container origin (0,0) so the container
    // position == the piece's visual center. Makes drag + grid math simple.
    const children: Phaser.GameObjects.GameObject[] = shape.map(([dr, dc]) => {
      const g = this.blockGfx(color, CELL - 4);
      g.setPosition(dc * CELL - (w - CELL) / 2, dr * CELL - (h - CELL) / 2);
      return g;
    });

    const home = { x: TRAY_X[slot], y: TRAY_Y };
    const container = this.add.container(home.x, home.y, children);
    container.setScale(TRAY_SCALE);
    container.setData("slot", slot);

    const rect = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
    container.setInteractive(rect, Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(container);

    return { shape, color, w, h, container, home };
  }

  // --- drag --------------------------------------------------------------

  private onDragStart(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container
  ) {
    this.children.bringToTop(obj);
    this.tweens.add({ targets: obj, scale: 1, duration: 100, ease: "Sine.Out" });
  }

  // grid coords of the piece's top-left (0,0) cell, at scale 1
  private targetOrigin(piece: Piece, obj: Phaser.GameObjects.Container) {
    const x0 = obj.x - (piece.w - CELL) / 2;
    const y0 = obj.y - (piece.h - CELL) / 2;
    return {
      r0: Math.round((y0 - ORIGIN_Y - CELL / 2) / CELL),
      c0: Math.round((x0 - ORIGIN_X - CELL / 2) / CELL),
    };
  }

  private pieceOf(obj: Phaser.GameObjects.Container): Piece | null {
    const slot = obj.getData("slot") as number;
    return this.pieces[slot] ?? null;
  }

  private onDrag(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dragX: number,
    dragY: number
  ) {
    obj.setPosition(dragX, dragY);
    const piece = this.pieceOf(obj);
    if (!piece) return;
    const { r0, c0 } = this.targetOrigin(piece, obj);
    this.ghost.clear();
    if (fits(this.grid, piece.shape, r0, c0)) {
      this.ghost.fillStyle(0xffffff, 0.18);
      for (const [dr, dc] of piece.shape) {
        const { x, y } = this.cellCenter(r0 + dr, c0 + dc);
        this.ghost.fillRoundedRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4, 6);
      }
    }
  }

  private onDragEnd(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container
  ) {
    this.ghost.clear();
    const piece = this.pieceOf(obj);
    if (!piece) return;
    const slot = obj.getData("slot") as number;
    const { r0, c0 } = this.targetOrigin(piece, obj);

    if (fits(this.grid, piece.shape, r0, c0)) {
      place(this.grid, piece.shape, r0, c0);
      for (const [dr, dc] of piece.shape) {
        const { x, y } = this.cellCenter(r0 + dr, c0 + dc);
        const g = this.blockGfx(piece.color, CELL - 4);
        g.setPosition(x, y);
        g.setScale(0.2);
        this.tweens.add({ targets: g, scale: 1, duration: 110, ease: "Back.Out" });
        this.blocks[r0 + dr][c0 + dc] = g;
      }
      obj.destroy();
      this.pieces[slot] = null;
      this.addScore(piece.shape.length);
      this.resolveClears();
      this.afterPlace();
      this.persist();
    } else {
      // snap back to the tray slot
      this.tweens.add({
        targets: obj,
        x: piece.home.x,
        y: piece.home.y,
        scale: TRAY_SCALE,
        duration: 150,
        ease: "Quad.Out",
      });
    }
  }

  private resolveClears() {
    const { cells, lines } = clearLines(this.grid);
    if (lines === 0) return;
    this.lines += lines;
    this.addScore(lines * 18);
    for (const [r, c] of cells) {
      const g = this.blocks[r][c];
      this.blocks[r][c] = null;
      if (g) {
        this.tweens.add({
          targets: g,
          scale: 0,
          alpha: 0,
          duration: 150,
          ease: "Back.In",
          onComplete: () => g.destroy(),
        });
      }
    }
  }

  private afterPlace() {
    if (this.pieces.every((p) => p === null)) {
      this.dealPieces();
    }
    const live = this.pieces.filter((p) => p).map((p) => p!.shape);
    if (!anyFits(this.grid, live)) {
      this.cb.onToast("No moves left - reshuffling");
      this.time.delayedCall(700, () => this.resetGame());
    }
  }

  // --- score / persistence ----------------------------------------------

  private addScore(points: number) {
    if (points <= 0) return;
    this.score += points;
    this.cb.onScore(this.score);
    this.emitStats();
    for (const m of MILESTONES) {
      if (this.score >= m && !this.fired.has(m)) {
        this.fired.add(m);
        this.cb.onMilestone(m, this.score);
      }
    }
  }

  private recordSeenMilestones() {
    for (const m of MILESTONES) if (this.score >= m) this.fired.add(m);
  }

  private emitStats() {
    this.cb.onStats([
      { label: "Score", value: this.score },
      { label: "Lines", value: this.lines },
    ]);
  }

  private persist() {
    const state: SaveState = {
      grid: this.grid,
      score: this.score,
      lines: this.lines,
    };
    save(SAVE_KEY, state);
  }

  resetGame() {
    this.score = 0;
    this.lines = 0;
    this.fired.clear();
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        this.blocks[r][c]?.destroy();
        this.blocks[r][c] = null;
      }
    }
    this.pieces.forEach((p) => p?.container?.destroy());
    this.pieces = [null, null, null];
    this.grid = emptyGrid();
    this.ghost.clear();
    this.dealPieces();
    this.cb.onScore(0);
    this.emitStats();
    this.persist();
  }
}
