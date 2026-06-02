"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { load, save, clear } from "@/lib/storage";

const KEY = "trivia";
const TIME_MS = 12000;

type Q = { q: string; options: string[]; answer: number };

const BANK: Q[] = [
  { q: "Which language runs natively in web browsers?", options: ["Python", "JavaScript", "Rust", "Go"], answer: 1 },
  { q: "Phaser is a framework for building what?", options: ["Databases", "HTML5 games", "CSS grids", "Servers"], answer: 1 },
  { q: "What does SSR stand for in Next.js?", options: ["Server-Side Rendering", "Static Style Reset", "Secure Socket Relay", "Single Source Repo"], answer: 0 },
  { q: "Which API stores small data in the browser?", options: ["localStorage", "Webpack", "Babel", "ESLint"], answer: 0 },
  { q: "HTML5 Canvas draws using which context?", options: ["3d-only", "2d", "svg", "gl-legacy"], answer: 1 },
  { q: "TypeScript adds what to JavaScript?", options: ["Types", "Threads", "Pixels", "Sockets"], answer: 0 },
  { q: "Which is a React state hook?", options: ["useState", "useFetch", "useQueryAll", "useDom"], answer: 0 },
  { q: "A match-3 clears a line of at least how many?", options: ["2", "3", "5", "7"], answer: 1 },
  { q: "Which renders only on the client in Next.js?", options: ["next/dynamic ssr:false", "getStaticProps", "middleware", "route handler"], answer: 0 },
  { q: "What unit makes layouts responsive?", options: ["px-only", "rem / %", "pt", "cm"], answer: 1 },
];

function shuffled(): Q[] {
  const a = BANK.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 8);
}

export default function Trivia() {
  const [deck, setDeck] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_MS);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const saved = load<{ best: number }>(KEY);
    if (saved) setBest(saved.best);
    setDeck(shuffled());
  }, []);

  const next = useCallback(() => {
    setPicked(null);
    setIdx((i) => {
      const ni = i + 1;
      return ni;
    });
  }, []);

  // countdown for the current question
  useEffect(() => {
    if (done || deck.length === 0 || picked !== null) return;
    setTimeLeft(TIME_MS);
    const start = Date.now();
    timer.current = window.setInterval(() => {
      const left = TIME_MS - (Date.now() - start);
      if (left <= 0) {
        window.clearInterval(timer.current!);
        setTimeLeft(0);
        setPicked(-1); // timed out, reveal
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [idx, deck, picked, done]);

  // advance after a brief reveal
  useEffect(() => {
    if (picked === null) return;
    const t = window.setTimeout(() => {
      if (idx + 1 >= deck.length) {
        setDone(true);
      } else {
        next();
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [picked, idx, deck.length, next]);

  // persist best score on finish
  useEffect(() => {
    if (!done) return;
    if (score > best) {
      setBest(score);
      save(KEY, { best: score });
    }
  }, [done, score, best]);

  const choose = (i: number) => {
    if (picked !== null) return;
    if (i === deck[idx].answer) setScore((s) => s + 10);
    setPicked(i);
  };

  const restart = () => {
    setDeck(shuffled());
    setIdx(0);
    setScore(0);
    setPicked(null);
    setDone(false);
  };

  const clearBest = () => {
    clear(KEY);
    setBest(0);
  };

  const current = deck[idx];

  return (
    <>
      <div className="hud">
        <div className="card">
          <div className="label">Score</div>
          <div className="value">{score}</div>
        </div>
        <div className="card">
          <div className="label">Best</div>
          <div className="value">{best}</div>
        </div>
      </div>

      <div className="stage panel-stage">
        {done || !current ? (
          <div className="finish">
            <div className="big">{done ? "Done!" : "Loading..."}</div>
            {done && <p>You scored {score}.</p>}
          </div>
        ) : (
          <div className="quiz">
            <div className="timerbar">
              <span style={{ width: `${(timeLeft / TIME_MS) * 100}%` }} />
            </div>
            <div className="qno">
              Question {idx + 1} / {deck.length}
            </div>
            <div className="qtext">{current.q}</div>
            <div className="opts">
              {current.options.map((o, i) => {
                let cls = "opt";
                if (picked !== null) {
                  if (i === current.answer) cls += " correct";
                  else if (i === picked) cls += " wrong";
                }
                return (
                  <button key={i} className={cls} onClick={() => choose(i)}>
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="toast" />

      <div className="row">
        <button className="btn" onClick={restart}>
          New game
        </button>
        <button className="btn secondary" onClick={clearBest}>
          Clear best
        </button>
      </div>
    </>
  );
}
