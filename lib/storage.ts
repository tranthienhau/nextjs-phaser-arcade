// Generic, SSR-safe localStorage helpers. Each game persists under its own key
// so players can resume any of them independently.

const PREFIX = "phaser-arcade:";

export function load<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full / private mode - non-fatal for a casual game
  }
}

export function clear(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
