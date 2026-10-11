/**
 * Versioned localStorage helpers for per-viewer preferences only (widget
 * layout and theme). Moderation state lives in MongoDB. Every access is
 * wrapped because Safari in private mode and embedded webviews can throw on
 * read as well as on write.
 */

export const WIDGET_KEY = "rl.widget.v1";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable - preferences just will not persist */
  }
}

export function clear(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to clear */
  }
}
