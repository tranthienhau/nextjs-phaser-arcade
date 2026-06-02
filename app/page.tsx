import GameMount from "@/components/GameMount";

export default function Home() {
  return (
    <main className="shell">
      <header className="brand">
        <h1>Phaser Arcade</h1>
        <p>Match-3 reskinned &amp; integrated as a client-side React component in Next.js</p>
      </header>
      <GameMount />
    </main>
  );
}
