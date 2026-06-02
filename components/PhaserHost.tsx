"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { BOARD_SIZE, BG_COLOR } from "@/game/match3/config";
import { createRewardsApi } from "@/lib/rewards";
import { Stat, GameCallbacks } from "@/lib/game";
import { clear as clearSave } from "@/lib/storage";

type ResettableScene = Phaser.Scene & { resetGame: () => void };

export default function PhaserHost({
  sceneKey,
  createScene,
  saveKey,
}: {
  sceneKey: string;
  createScene: () => ResettableScene;
  saveKey: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ResettableScene | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const showToast = (m: string) => {
      setToast(m);
      window.setTimeout(() => setToast(""), 1800);
    };
    const rewards = createRewardsApi({ onToast: showToast });

    const scene = createScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      backgroundColor: BG_COLOR,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene,
    });
    gameRef.current = game;

    const cb: GameCallbacks = {
      onStats: setStats,
      onScore: rewards.onScore,
      onMilestone: rewards.onMilestone,
      onToast: showToast,
    };
    game.scene.start(sceneKey, cb);

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => sceneRef.current?.resetGame();
  const handleClearSave = () => {
    clearSave(saveKey);
    sceneRef.current?.resetGame();
    setToast("Saved game cleared");
    window.setTimeout(() => setToast(""), 1500);
  };

  return (
    <>
      <div className="hud">
        {stats.map((s) => (
          <div className="card" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
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
