// storage.js
// Thin abstraction over local/session storage with rememberMe semantics.
// Used by axios instances to fetch the active idToken and by auth flows to
// persist credentials after login.

const storage = {
  set(key, value, rememberMe) {
    const target = rememberMe ? localStorage : sessionStorage;
    target.setItem(key, value);
  },

  get(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },

  remove(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

// Persist auth bundle. `rememberMe=true` → localStorage (survives close).
// Otherwise sessionStorage (cleared on tab close).
export function saveToken({ idToken, localId, refreshToken }, rememberMe) {
  const finalRememberMe =
    rememberMe ?? (storage.get("rememberMe") === "true");

  if (rememberMe !== undefined) {
    localStorage.setItem("rememberMe", rememberMe);
  }

  if (idToken) storage.set("idToken", idToken, finalRememberMe);
  if (refreshToken) storage.set("refreshToken", refreshToken, finalRememberMe);
  if (localId) storage.set("localId", localId, finalRememberMe);
}

export function getToken() {
  const idToken = storage.get("idToken");
  const refreshToken = storage.get("refreshToken");
  const localId = storage.get("localId");
  return { idToken, localId, refreshToken }; // idToken may be null — that's valid
}

export function removeToken() {
  storage.remove("idToken");
  storage.remove("refreshToken");
  storage.remove("localId");
  localStorage.removeItem("rememberMe");
}
