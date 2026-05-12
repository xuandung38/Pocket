// use-auth-store.js
// Zustand auth store — single source of truth for login state.
//
// State:
//   - user:    profile object returned by getUserLocket (null when logged out)
//   - isAuth:  boolean derived from idToken presence + validity
//   - loading: true on cold-load until bootstrap finishes (prevents login flash)
//
// Tokens persist via `@/utils/storage.saveToken` (localStorage when rememberMe).
// The store mirrors a cached user payload under CACHE_KEY so cold-loads can
// render the UI immediately without waiting for getUserLocket().

import { create } from "zustand";
import {
  getToken,
  removeToken,
  removeUser,
  saveToken,
  saveUser,
  clearLocalData,
} from "@/utils";
import { parseJwt } from "@/utils/auth";
import {
  loginWithEmail,
  loginWithPhone,
  logout as logoutApi,
  getUserLocket,
} from "@/services";

const CACHE_KEY = "userData";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

// JWT validity check — `null`/malformed token → false, expired → false.
function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload) return false;
  if (!payload.exp) return true;
  return payload.exp > Math.floor(Date.now() / 1000);
}

// Decide login route based on identifier shape. `@` ⇒ email; `+`/digit ⇒ phone.
// Default fallback: email (most users are email-based on this backend).
function detectIdentifier(identifier) {
  const trimmed = (identifier || "").trim();
  if (!trimmed) return "email";
  if (trimmed.includes("@")) return "email";
  if (/^\+?\d[\d\s().-]{4,}$/.test(trimmed)) return "phone";
  return "email";
}

// Read cached user blob without throwing on bad JSON.
function readCachedUser() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  if (!user) return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: user, timestamp: Date.now() }),
    );
  } catch (err) {
    console.warn("[auth-store] failed to cache user:", err);
  }
}

export const useAuthStore = create((set, get) => ({
  user: readCachedUser(),
  isAuth: isTokenValid(getToken().idToken),
  loading: true,

  // Synchronous boot — runs on store creation via App effect. Renders from
  // cache if available so we don't flash LoginScreen for already-authed users.
  hydrate: () => {
    // One-time migration: remove the Phase-1 mock auth flag so users aren't
    // stuck with a zombie session after upgrading.
    if (localStorage.getItem("locket-auth")) {
      localStorage.removeItem("locket-auth");
    }

    const { idToken } = getToken();
    const valid = isTokenValid(idToken);

    set({
      user: valid ? readCachedUser() : null,
      isAuth: valid,
      loading: false,
    });
  },

  // Async post-hydrate — refresh profile from backend if cache is stale.
  // Safe to call multiple times; bails out when offline / token absent.
  init: async () => {
    const { idToken } = getToken();
    if (!isTokenValid(idToken)) {
      set({ user: null, isAuth: false, loading: false });
      return;
    }

    try {
      const cached = readCachedUser();
      if (cached) set({ user: cached, isAuth: true });

      const fresh = await getUserLocket();
      if (fresh) {
        writeCachedUser(fresh);
        saveUser(fresh);
        set({ user: fresh, isAuth: true });
      }
    } catch (err) {
      // Don't trip auth state on transient failures — keep whatever we showed
      // from cache, surface error via the caller.
      console.error("[auth-store] init failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  // Login takes a raw identifier + password and routes to email / phone path.
  // Returns the user profile on success; throws (with .status) on failure so
  // the LoginScreen can surface inline errors.
  login: async ({ identifier, password, rememberMe = true }) => {
    const kind = detectIdentifier(identifier);
    const trimmed = identifier.trim();

    const res =
      kind === "phone"
        ? await loginWithPhone({ phone: trimmed, password, captchaToken: null })
        : await loginWithEmail({ email: trimmed, password, captchaToken: null });

    // Firebase signInWithPassword: camelCase. Self-hosted may normalise to
    // snake_case — accept both shapes.
    const data = res?.data ?? res ?? {};
    const idToken = data.idToken || data.id_token;
    const localId = data.localId || data.user_id;
    const refreshToken = data.refreshToken || data.refresh_token;

    if (!idToken || !localId) {
      const err = new Error("Server không trả về token hợp lệ");
      err.status = 500;
      throw err;
    }

    saveToken({ idToken, localId, refreshToken }, rememberMe);

    // Optimistic profile from login response (avoids an extra round-trip).
    const optimisticUser = {
      uid: localId,
      localId,
      displayName: data.displayName || data.display_name,
      email: data.email,
      ...data,
    };
    writeCachedUser(optimisticUser);
    saveUser(optimisticUser);
    set({ user: optimisticUser, isAuth: true, loading: false });

    // Fetch full profile in the background — don't block the UI on it.
    getUserLocket()
      .then((profile) => {
        if (profile) {
          writeCachedUser(profile);
          saveUser(profile);
          set({ user: profile });
        }
      })
      .catch((err) => {
        console.warn("[auth-store] post-login profile fetch failed:", err);
      });

    return optimisticUser;
  },

  // Centralized logout: tell server → wipe local state → flip flag.
  // Always succeeds locally even if the server call fails (offline, expired).
  clearAndLogout: async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn("[auth-store] server logout failed, continuing local cleanup:", err);
    }

    removeToken();
    removeUser();
    clearLocalData();
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}

    set({ user: null, isAuth: false, loading: false });

    // Notify axios interceptor (which keeps its own JWT exp cache) to reset.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lk:auth:reset"));
    }
  },

  // Manual setter — used by axios after a successful refresh-token rotation.
  setUser: (user) => {
    if (user) {
      writeCachedUser(user);
      saveUser(user);
    }
    set({ user, isAuth: !!user });
  },

  // Force-clear auth state without server round-trip. Used by App.jsx in
  // response to `lk:auth:logout` (refresh-token failure → session dead).
  forceLogout: () => {
    removeToken();
    removeUser();
    clearLocalData();
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    set({ user: null, isAuth: false, loading: false });
  },
}));
