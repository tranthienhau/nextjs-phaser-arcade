"use client";

import dynamic from "next/dynamic";

// Phaser touches `window`, so the game must never render on the server.
// Dynamic import with `ssr: false` keeps it client-only and code-split,
// exactly how each arcade game would be mounted inside the host app.
const PhaserGame = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => <div className="stage" aria-label="Loading game" />,
});

export default function GameMount() {
  return <PhaserGame />;
}
