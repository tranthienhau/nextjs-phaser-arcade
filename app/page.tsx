import Link from "next/link";
import { GAMES } from "@/lib/game";

export default function Home() {
  return (
    <main className="shell">
      <header className="brand">
        <h1>Phaser Arcade</h1>
        <p>Open-source web games reskinned &amp; integrated as client-side React components in Next.js</p>
      </header>

      <div className="menu">
        {GAMES.map((g) => (
          <Link href={`/${g.slug}`} key={g.slug} className="menu-card">
            <span className="menu-emoji">{g.emoji}</span>
            <span className="menu-title">{g.title}</span>
            <span className="menu-tag">{g.tagline}</span>
            <span className={`menu-kind ${g.kind}`}>
              {g.kind === "phaser" ? "Phaser / Canvas" : "React DOM"}
            </span>
          </Link>
        ))}
      </div>

      <p className="foot">
        Each game is mounted with <code>next/dynamic(ssr:false)</code>, with
        score/milestone callbacks and localStorage save.
      </p>
    </main>
  );
}
