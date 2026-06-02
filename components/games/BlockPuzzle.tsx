"use client";

import PhaserHost from "@/components/PhaserHost";
import { BlockPuzzleScene } from "@/game/blockpuzzle/scene";

export default function BlockPuzzle() {
  return (
    <PhaserHost
      sceneKey="blockpuzzle"
      saveKey="blockpuzzle"
      createScene={() => new BlockPuzzleScene()}
    />
  );
}
