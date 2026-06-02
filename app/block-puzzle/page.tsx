import GameScreen from "@/components/GameScreen";
import BlockPuzzleMount from "@/components/mounts/BlockPuzzleMount";

export default function Page() {
  return (
    <GameScreen title="Block Drop" subtitle="Block placement - drag pieces, clear full lines">
      <BlockPuzzleMount />
    </GameScreen>
  );
}
