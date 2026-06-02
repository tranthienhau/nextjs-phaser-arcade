// Light save state with localStorage so players can resume.
// SSR-safe: every access is guarded for `window`.

const KEY = "phaser-arcade:match3:v1";

export type SaveState = {
  grid: number[][];
  score: number;
  moves: number;
};

export function loadState(): SaveState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveState;
    if (!parsed || !Array.isArray(parsed.grid)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: SaveState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full / private mode - non-fatal for a casual game
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
