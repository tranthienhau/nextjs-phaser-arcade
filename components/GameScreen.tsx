import Link from "next/link";

export default function GameScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="shell">
      <header className="brand">
        <Link href="/" className="back">
          ← Arcade
        </Link>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </main>
  );
}
