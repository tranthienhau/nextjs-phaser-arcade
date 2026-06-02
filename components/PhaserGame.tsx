"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { Match3Scene } from "@/game/match3/scene";
import { BOARD_SIZE, BG_COLOR } from "@/game/match3/config";
import { createRewardsApi } from "@/lib/rewards";
import { clearState } from "@/lib/storage";

export default function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<Match3Scene | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const rewards = createRewardsApi({
      // scoreEndpoint: "/api/score",      // wire to real rewards endpoint
      // milestoneEndpoint: "/api/milestone",
      onToast: (m) => {
        setToast(m);
        window.setTimeout(() => setToast(""), 1800);
      },
    });

    const scene = new Match3Scene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      backgroundColor: BG_COLOR,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene,
    });
    gameRef.current = game;

    game.scene.start("match3", {
      onScore: (s: number) => {
        setScore(s);
        rewards.onScore(s);
      },
      onMilestone: rewards.onMilestone,
      onMoves: setMoves,
    });

    // Clean teardown: destroy the Phaser instance and release the canvas.
    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  const handleReset = () => sceneRef.current?.resetGame();
  const handleClearSave = () => {
    clearState();
    sceneRef.current?.resetGame();
    setToast("Saved game cleared");
    window.setTimeout(() => setToast(""), 1500);
  };

  return (
    <>
      <div className="hud">
        <div className="card">
          <div className="label">Score</div>
          <div className="value">{score}</div>
        </div>
        <div className="card">
          <div className="label">Moves</div>
          <div className="value">{moves}</div>
        </div>
      </div>

      <div className="stage" ref={hostRef} />

      <div className="toast">{toast}</div>

      <div className="row">
        <button className="btn" onClick={handleReset}>
          New game
        </button>
        <button className="btn secondary" onClick={handleClearSave}>
          Clear save
        </button>
      </div>
    </>
  );
}
