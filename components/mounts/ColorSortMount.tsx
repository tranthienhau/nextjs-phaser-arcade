"use client";

import dynamic from "next/dynamic";

const Game = dynamic(() => import("@/components/games/ColorSort"), {
  ssr: false,
  loading: () => <div className="stage" aria-label="Loading game" />,
});

export default function ColorSortMount() {
  return <Game />;
}
