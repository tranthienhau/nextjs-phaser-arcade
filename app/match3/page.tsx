import GameScreen from "@/components/GameScreen";
import Match3Mount from "@/components/mounts/Match3Mount";

export default function Page() {
  return (
    <GameScreen title="Gem Match" subtitle="Match 3 - swipe or tap-swap adjacent gems">
      <Match3Mount />
    </GameScreen>
  );
}
