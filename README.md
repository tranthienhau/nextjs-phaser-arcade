# Next.js + Phaser Arcade (reskin & integration POC)

A casual **match-3** game built with **Phaser 3** and **HTML5 Canvas**, integrated
as a **client-side React component inside a Next.js (App Router) app** - the exact
pattern needed to drop open-source web games into an existing React/Next.js repo.

Play in a browser, on iOS Safari, Android Chrome, and desktop.

**Live demo: https://nextjs-phaser-arcade.vercel.app**

Swipe or tap-then-tap adjacent gems to swap. Match 3+. Score and moves show
in the HUD; state auto-saves to localStorage so a reload resumes the game.

## What this demonstrates

- **Client-only mount, SSR off**: the game is loaded with
  `next/dynamic(..., { ssr: false })` so Phaser never runs on the server
  (`components/GameMount.tsx`).
- **Clean mount and teardown**: the Phaser instance is created in a `useEffect`
  and fully destroyed with `game.destroy(true)` on unmount, releasing the canvas
  (`components/PhaserGame.tsx`). No leaks when navigating away.
- **Score and milestone callbacks**: the scene emits pure events; a thin adapter
  (`lib/rewards.ts`) forwards them to rewards/leaderboard endpoints
  (fire-and-forget, never blocks gameplay).
- **Light save state with localStorage**: grid, score and moves persist so
  players resume mid-game (`lib/storage.ts`), SSR-safe.
- **Brand reskin surface**: all colors, palette and tuning live in
  `game/match3/config.ts` - retheme without touching logic.
- **Testable logic**: match detection, gravity, refill, scoring and dead-board
  detection are pure functions in `game/match3/logic.ts` (no Phaser, no DOM).
- **Responsive**: `Phaser.Scale.FIT` + CSS aspect-ratio container scales the
  board to any screen.

## Game feel

- `SWAP_MS` / `DROP_MS` / `POP_MS` in `config.ts` are tuned for a snappy but
  readable feel.
- Invalid swaps animate forward then bounce back, so a rejected move *feels*
  rejected instead of silently doing nothing.
- Dead boards (no possible move) auto-reshuffle.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

## Integrating another game

1. Verify the open-source base is cleanly permissive (MIT / Apache-2.0 / similar).
2. Add the Phaser scene under `game/<name>/`, keeping logic pure and rendering thin.
3. Move brand values into a `config.ts`.
4. Mount it with `next/dynamic(..., { ssr: false })` and wire score/milestone
   callbacks to your endpoints.

## License

MIT.
