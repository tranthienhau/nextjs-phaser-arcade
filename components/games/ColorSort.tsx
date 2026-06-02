"use client";

import { useEffect, useState } from "react";
import { load, save, clear } from "@/lib/storage";

const CAP = 4;
const COLORS = 5;
const EMPTIES = 2;
const KEY = "color-sort";

const PALETTE = ["#ff5d8f", "#5db1ff", "#ffd166", "#8af3a0", "#c792ea"];

type Tubes = number[][];

function generate(): Tubes {
  const pool: number[] = [];
  for (let c = 0; c < COLORS; c++) for (let i = 0; i < CAP; i++) pool.push(c);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const tubes: Tubes = [];
  for (let t = 0; t < COLORS; t++) tubes.push(pool.slice(t * CAP, t * CAP + CAP));
  for (let e = 0; e < EMPTIES; e++) tubes.push([]);
  return tubes;
}

function topRun(tube: number[]): { color: number; count: number } | null {
  if (tube.length === 0) return null;
  const color = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++;
  return { color, count };
}

function canPour(src: number[], dst: number[]): number {
  const run = topRun(src);
  if (!run) return 0;
  if (dst.length === CAP) return 0;
  if (dst.length > 0 && dst[dst.length - 1] !== run.color) return 0;
  return Math.min(run.count, CAP - dst.length);
}

function isSolved(tubes: Tubes): boolean {
  return tubes.every(
    (t) => t.length === 0 || (t.length === CAP && t.every((v) => v === t[0]))
  );
}

export default function ColorSort() {
  const [tubes, setTubes] = useState<Tubes>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const saved = load<{ tubes: Tubes; moves: number }>(KEY);
    if (saved) {
      setTubes(saved.tubes);
      setMoves(saved.moves);
    } else {
      setTubes(generate());
    }
  }, []);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 1600);
  };

  const persist = (t: Tubes, m: number) => save(KEY, { tubes: t, moves: m });

  const onTube = (i: number) => {
    if (selected === null) {
      if (tubes[i].length > 0) setSelected(i);
      return;
    }
    if (i === selected) {
      setSelected(null);
      return;
    }
    const next = tubes.map((t) => t.slice());
    const n = canPour(next[selected], next[i]);
    if (n > 0) {
      const run = topRun(next[selected])!;
      for (let k = 0; k < n; k++) {
        next[selected].pop();
        next[i].push(run.color);
      }
      const m = moves + 1;
      setTubes(next);
      setMoves(m);
      persist(next, m);
      if (isSolved(next)) flash("Solved! 🎉");
    } else {
      flash("Can't pour there");
    }
    setSelected(null);
  };

  const reset = () => {
    const t = generate();
    setTubes(t);
    setSelected(null);
    setMoves(0);
    clear(KEY);
    persist(t, 0);
  };

  const solved = tubes.length > 0 && isSolved(tubes);

  return (
    <>
      <div className="hud">
        <div className="card">
          <div className="label">Moves</div>
          <div className="value">{moves}</div>
        </div>
        <div className="card">
          <div className="label">Status</div>
          <div className="value">{solved ? "Solved" : "Playing"}</div>
        </div>
      </div>

      <div className="stage tubes-stage">
        <div className="tubes">
          {tubes.map((tube, i) => (
            <button
              key={i}
              className={`tube${selected === i ? " selected" : ""}`}
              onClick={() => onTube(i)}
              aria-label={`Tube ${i + 1}`}
            >
              {Array.from({ length: CAP }).map((_, slot) => {
                const idx = CAP - 1 - slot; // render top-down
                const color = tube[idx];
                return (
                  <span
                    key={slot}
                    className="ball"
                    style={{
                      background:
                        color === undefined ? "transparent" : PALETTE[color],
                    }}
                  />
                );
              })}
            </button>
          ))}
        </div>
      </div>

      <div className="toast">{toast}</div>

      <div className="row">
        <button className="btn" onClick={reset}>
          New game
        </button>
      </div>
    </>
  );
}
