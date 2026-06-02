"use client";

import dynamic from "next/dynamic";

const Game = dynamic(() => import("@/components/games/Match3"), {
  ssr: false,
  loading: () => <div className="stage" aria-label="Loading game" />,
});

export default function Match3Mount() {
  return <Game />;
}
