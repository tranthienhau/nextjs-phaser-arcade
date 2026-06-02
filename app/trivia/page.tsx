import GameScreen from "@/components/GameScreen";
import TriviaMount from "@/components/mounts/TriviaMount";

export default function Page() {
  return (
    <GameScreen title="Quick Trivia" subtitle="Trivia - beat the timer, pick the right answer">
      <TriviaMount />
    </GameScreen>
  );
}
