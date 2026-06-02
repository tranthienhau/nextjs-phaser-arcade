"use client";

import PhaserHost from "@/components/PhaserHost";
import { Match3Scene } from "@/game/match3/scene";

export default function Match3() {
  return (
    <PhaserHost
      sceneKey="match3"
      saveKey="match3"
      createScene={() => new Match3Scene()}
    />
  );
}
