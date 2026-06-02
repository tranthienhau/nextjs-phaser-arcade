"use client";

import { useCallback, useEffect, useState } from "react";
import { load, save, clear } from "@/lib/storage";

const KEY = "word";
const LEN = 5;
const ROWS = 6;

const WORDS = [
  "REACT", "PHASE", "BLOCK", "SCORE", "LEVEL", "BRAVE", "CRANE", "PIXEL",
  "MOUNT", "STATE", "LOGIC", "ARRAY", "GAMES", "TOKEN", "SWIPE", "CHAIN",
  "BOARD", "MATCH", "TILES", "SOLVE",
];

type Mark = "correct" | "present" | "absent";

function pick(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function evaluate(guess: string, target: string): Mark[] {
  const res: Mark[] = Array(LEN).fill("absent");
  const counts: Record<string, number> = {};
  for (const ch of target) counts[ch] = (counts[ch] || 0) + 1;
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === target[i]) {
      res[i] = "correct";
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] === "correct") continue;
    const ch = guess[i];
    if (counts[ch] > 0) {
      res[i] = "present";
      counts[ch]--;
    }
  }
  return res;
}

const ROWS_KB = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type Saved = { target: string; guesses: string[]; status: string };

export default function Word() {
  const [target, setTarget] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const saved = load<Saved>(KEY);
    if (saved && saved.target) {
      setTarget(saved.target);
      setGuesses(saved.guesses);
      setStatus(saved.status as "playing" | "won" | "lost");
    } else {
      setTarget(pick());
    }
  }, []);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 1500);
  };

  const submit = useCallback(() => {
    if (status !== "playing") return;
    if (current.length !== LEN) {
      flash("Need 5 letters");
      return;
    }
    const nextGuesses = [...guesses, current];
    let nextStatus: "playing" | "won" | "lost" = "playing";
    if (current === target) nextStatus = "won";
    else if (nextGuesses.length >= ROWS) nextStatus = "lost";
    setGuesses(nextGuesses);
    setCurrent("");
    setStatus(nextStatus);
    save(KEY, { target, guesses: nextGuesses, status: nextStatus });
    if (nextStatus === "won") flash("You got it! 🎉");
    if (nextStatus === "lost") flash(`Word was ${target}`);
  }, [current, guesses, status, target]);

  const press = useCallback(
    (k: string) => {
      if (status !== "playing") return;
      if (k === "ENTER") return submit();
      if (k === "DEL") return setCurrent((c) => c.slice(0, -1));
      if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < LEN ? c + k : c));
    },
    [status, submit]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("DEL");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const reset = () => {
    const t = pick();
    setTarget(t);
    setGuesses([]);
    setCurrent("");
    setStatus("playing");
    clear(KEY);
    save(KEY, { target: t, guesses: [], status: "playing" });
  };

  // letter -> best mark, for keyboard coloring
  const keyMarks: Record<string, Mark> = {};
  for (const g of guesses) {
    const marks = evaluate(g, target);
    g.split("").forEach((ch, i) => {
      const m = marks[i];
      const prev = keyMarks[ch];
      const rank = { absent: 0, present: 1, correct: 2 } as const;
      if (!prev || rank[m] > rank[prev]) keyMarks[ch] = m;
    });
  }

  const rowsToRender = Array.from({ length: ROWS }, (_, r) => {
    if (r < guesses.length) return { word: guesses[r], marks: evaluate(guesses[r], target) };
    if (r === guesses.length) return { word: current, marks: null as Mark[] | null };
    return { word: "", marks: null as Mark[] | null };
  });

  return (
    <>
      <div className="hud">
        <div className="card">
          <div className="label">Tries</div>
          <div className="value">
            {guesses.length} / {ROWS}
          </div>
        </div>
        <div className="card">
          <div className="label">Status</div>
          <div className="value">
            {status === "playing" ? "Playing" : status === "won" ? "Won" : "Lost"}
          </div>
        </div>
      </div>

      <div className="stage panel-stage">
        <div className="wgrid">
          {rowsToRender.map((row, r) => (
            <div className="wrow" key={r}>
              {Array.from({ length: LEN }).map((_, c) => {
                const ch = row.word[c] || "";
                const mark = row.marks ? ` ${row.marks[c]}` : "";
                return (
                  <div className={`wcell${mark}${ch ? " filled" : ""}`} key={c}>
                    {ch}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="keyboard">
          {ROWS_KB.map((row, ri) => (
            <div className="krow" key={ri}>
              {ri === 2 && (
                <button className="key wide" onClick={() => press("ENTER")}>
                  Enter
                </button>
              )}
              {row.split("").map((k) => (
                <button
                  key={k}
                  className={`key${keyMarks[k] ? " " + keyMarks[k] : ""}`}
                  onClick={() => press(k)}
                >
                  {k}
                </button>
              ))}
              {ri === 2 && (
                <button className="key wide" onClick={() => press("DEL")}>
                  Del
                </button>
              )}
            </div>
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
