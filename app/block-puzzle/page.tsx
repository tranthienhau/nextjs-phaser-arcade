import GameScreen from "@/components/GameScreen";
import BlockPuzzleMount from "@/components/mounts/BlockPuzzleMount";

export default function Page() {
  return (
    <GameScreen title="Block Fit" subtitle="Block placement - drop pieces anywhere, clear a full row or column">
      <BlockPuzzleMount />
    </GameScreen>
  );
}
