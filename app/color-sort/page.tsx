import GameScreen from "@/components/GameScreen";
import ColorSortMount from "@/components/mounts/ColorSortMount";

export default function Page() {
  return (
    <GameScreen title="Color Sort" subtitle="Color sort - pour balls until each tube is one color">
      <ColorSortMount />
    </GameScreen>
  );
}
