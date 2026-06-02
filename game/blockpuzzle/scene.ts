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
const PAD = 12;
const GRID_PX = 360;
const CELL = GRID_PX / G; // 45
const ORIGIN_X = (BOARD_SIZE - GRID_PX) / 2;
const ORIGIN_Y = 12;
const TRAY_Y = ORIGIN_Y + GRID_PX + 52;
const TRAY_X = [BOARD_SIZE * 0.25, BOARD_SIZE * 0.5, BOARD_SIZE * 0.75];
const TRAY_SCALE = 0.6;
const BLOCK_COLOR = 0x5db1ff;

type Piece = {
  shape: Cell[];
  color: number;
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
    this.drawGridBackground();
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

  private drawGridBackground() {
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

    const children: Phaser.GameObjects.GameObject[] = shape.map(([dr, dc]) => {
      const g = this.blockGfx(color, CELL - 4);
      g.setPosition(dc * CELL, dr * CELL);
      return g;
    });

    // center the bounding box on the tray slot
    const home = { x: TRAY_X[slot], y: TRAY_Y };
    const container = this.add.container(
      home.x - (w - CELL) / 2 * TRAY_SCALE,
      home.y - (h - CELL) / 2 * TRAY_SCALE,
      children
    );
    container.setScale(TRAY_SCALE);
    container.setData("shape", shape);
    container.setData("slot", slot);
    container.setData("color", color);

    const rect = new Phaser.Geom.Rectangle(-CELL / 2, -CELL / 2, w, h);
    container.setInteractive(rect, Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(container);

    return { shape, color, container, home };
  }

  // --- drag --------------------------------------------------------------

  private onDragStart(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container
  ) {
    this.children.bringToTop(obj);
    this.tweens.add({ targets: obj, scale: 1, duration: 100, ease: "Sine.Out" });
  }

  private targetOrigin(obj: Phaser.GameObjects.Container) {
    return {
      r0: Math.round((obj.y - ORIGIN_Y - CELL / 2) / CELL),
      c0: Math.round((obj.x - ORIGIN_X - CELL / 2) / CELL),
    };
  }

  private onDrag(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dragX: number,
    dragY: number
  ) {
    obj.setPosition(dragX, dragY);
    const shape = obj.getData("shape") as Cell[];
    const { r0, c0 } = this.targetOrigin(obj);
    this.ghost.clear();
    if (fits(this.grid, shape, r0, c0)) {
      this.ghost.fillStyle(0xffffff, 0.18);
      for (const [dr, dc] of shape) {
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
    const shape = obj.getData("shape") as Cell[];
    const slot = obj.getData("slot") as number;
    const color = obj.getData("color") as number;
    const { r0, c0 } = this.targetOrigin(obj);

    if (fits(this.grid, shape, r0, c0)) {
      place(this.grid, shape, r0, c0);
      for (const [dr, dc] of shape) {
        const { x, y } = this.cellCenter(r0 + dr, c0 + dc);
        const g = this.blockGfx(color, CELL - 4);
        g.setPosition(x, y);
        g.setScale(0.2);
        this.tweens.add({ targets: g, scale: 1, duration: 110, ease: "Back.Out" });
        this.blocks[r0 + dr][c0 + dc] = g;
      }
      obj.destroy();
      this.pieces[slot] = null;
      this.addScore(shape.length);
      this.resolveClears();
      this.afterPlace();
      this.persist();
    } else {
      const piece = this.pieces[slot];
      if (piece) {
        const maxDr = Math.max(...shape.map((s) => s[0]));
        const maxDc = Math.max(...shape.map((s) => s[1]));
        const w = (maxDc + 1) * CELL;
        const h = (maxDr + 1) * CELL;
        this.tweens.add({
          targets: obj,
          x: piece.home.x - ((w - CELL) / 2) * TRAY_SCALE,
          y: piece.home.y - ((h - CELL) / 2) * TRAY_SCALE,
          scale: TRAY_SCALE,
          duration: 150,
          ease: "Quad.Out",
        });
      }
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
