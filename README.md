# Next.js + Phaser Arcade (reskin & integration POC)

A small **arcade of casual web games** built with **Phaser 3 / HTML5 Canvas** and
**React DOM**, each integrated as a **client-side React component inside a
Next.js (App Router) app** - the exact pattern needed to drop open-source web
games into an existing React/Next.js repo.

Play in a browser, on iOS Safari, Android Chrome, and desktop.

**Live demo: https://nextjs-phaser-arcade.vercel.app**

## Games

| Route | Genre | Tech |
|-------|-------|------|
| `/match3` | Match 3 | Phaser / HTML5 Canvas |
| `/block-puzzle` | Block placement (1010!-style, place anywhere, clear a full row or column) | Phaser / HTML5 Canvas (drag & drop) |
| `/color-sort` | Color sort | React DOM |
| `/trivia` | Trivia | React DOM (timed) |
| `/word` | Word | React DOM (Wordle-style, on-screen keyboard) |

Every game reports score + milestones through a shared `GameCallbacks` contract
and persists its own state to localStorage so players can resume.

## What this demonstrates

- **Client-only mount, SSR off**: each game is loaded with
  `next/dynamic(..., { ssr: false })` so canvas/`window` code never runs on the
  server (`components/mounts/*`).
- **Clean mount and teardown**: the Phaser host creates the instance in a
  `useEffect` and fully destroys it with `game.destroy(true)` on unmount,
  releasing the canvas (`components/PhaserHost.tsx`). No leaks when navigating
  between games.
- **Score and milestone callbacks**: games emit pure events through a shared
  `GameCallbacks` contract (`lib/game.ts`); a thin adapter (`lib/rewards.ts`)
  forwards them to rewards/leaderboard endpoints (fire-and-forget, never blocks
  gameplay).
- **Light save state with localStorage**: each game persists under its own key
  (`lib/storage.ts`), SSR-safe, so players resume mid-game.
- **Brand reskin surface**: Phaser palette/tuning live in
  `game/match3/config.ts`; DOM games theme via CSS variables in
  `app/globals.css` - retheme without touching logic.
- **Testable logic**: match detection, gravity, refill, block placement,
  line clears and color-sort pours are pure functions
  (`game/*/logic.ts`, no Phaser, no DOM).
- **Responsive**: Phaser games use `Phaser.Scale.FIT`; DOM games use fluid CSS
  and an on-screen keyboard for mobile.

## Game feel

- `SWAP_MS` / `DROP_MS` / `POP_MS` in `game/match3/config.ts` are tuned for a
  snappy but readable feel.
- Match-3 invalid swaps animate forward then bounce back, so a rejected move
  *feels* rejected instead of silently doing nothing.
- Block Fit pieces pop in with a slight overshoot; a drag shows a ghost of the
  target cells only when the piece actually fits (no gravity - it is a
  place-anywhere puzzle, not a falling-block game).
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
2. Phaser game: add the scene under `game/<name>/` (pure logic + thin scene) and
   render it through `PhaserHost`. React game: add a component under
   `components/games/`.
3. Add a mount under `components/mounts/` using
   `next/dynamic(..., { ssr: false })`, a route page under `app/<slug>/`, and an
   entry in `GAMES` (`lib/game.ts`).
4. Emit score/milestone via `GameCallbacks` so it wires to your endpoints.

## License

MIT.
