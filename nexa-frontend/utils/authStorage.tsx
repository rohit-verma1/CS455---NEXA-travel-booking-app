// utils/authStorage.ts

export type StoredAuth = {
  user_id: string;
  token: string;
  username?: string;
  email?: string;
  user_type?: string;
  // expiry in ms since epoch
  expiresAt: number;
};

const KEY = "auth";

/**
 * 🧩 Utility: Checks if running in the browser
 */
function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * ✅ Save auth to localStorage with TTL (default: 30 days)
 */
export function setAuthStorage(payload: Omit<StoredAuth, "expiresAt">, ttlDays = 30) {
  if (!isBrowser()) return; // prevent crashes in SSR

  const expiresAt = Date.now() + Math.max(1, ttlDays) * 24 * 60 * 60 * 1000;
  const obj: StoredAuth = { ...payload, expiresAt };

  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn("setAuthStorage error", err);
  }
}

/**
 * ✅ Read auth safely from storage. Returns null if not found or expired.
 */
export function getAuthFromStorage(): StoredAuth | null {
  if (!isBrowser()) return null; // safe SSR guard

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredAuth;

    if (!parsed || !parsed.expiresAt || !parsed.token) {
      localStorage.removeItem(KEY);
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      // expired
      localStorage.removeItem(KEY);
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("getAuthFromStorage error", err);
    try {
      localStorage.removeItem(KEY);
    } catch {}
    return null;
  }
}

/**
 * ✅ Remove auth from storage safely
 */
export function clearAuthStorage() {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("clearAuthStorage error", err);
  }
}
