// Shared contract between a game (Phaser scene or React game) and the host UI.

export type Stat = { label: string; value: number };

export type GameCallbacks = {
  // HUD stats to render (Score, Moves, Lines...).
  onStats: (stats: Stat[]) => void;
  // Raw score for the rewards endpoint.
  onScore: (score: number) => void;
  // Fired once per milestone threshold crossed.
  onMilestone: (milestone: number, score: number) => void;
  // Free-form transient message for the HUD toast.
  onToast: (message: string) => void;
};

export type ArcadeGame = {
  slug: string;
  title: string;
  tagline: string;
  emoji: string;
  // Phaser canvas game or React DOM game - the menu does not care.
  kind: "phaser" | "react";
};

export const GAMES: ArcadeGame[] = [
  { slug: "match3", title: "Gem Match", tagline: "Match 3", emoji: "💎", kind: "phaser" },
  { slug: "color-sort", title: "Color Sort", tagline: "Color sort", emoji: "🧪", kind: "react" },
  { slug: "block-puzzle", title: "Block Drop", tagline: "Block placement", emoji: "🧱", kind: "phaser" },
  { slug: "trivia", title: "Quick Trivia", tagline: "Trivia", emoji: "❓", kind: "react" },
  { slug: "word", title: "Word Hunt", tagline: "Word", emoji: "🔤", kind: "react" },
];
