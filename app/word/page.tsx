import GameScreen from "@/components/GameScreen";
import WordMount from "@/components/mounts/WordMount";

export default function Page() {
  return (
    <GameScreen title="Word Hunt" subtitle="Word - guess the 5-letter word in six tries">
      <WordMount />
    </GameScreen>
  );
}
