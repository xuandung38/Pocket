// axios.js
// Default authenticated client with automatic idToken refresh.
//
// Flow:
//   1. Request interceptor reads idToken from storage.
//   2. If the cached `exp` is < 5 minutes away, kicks off a refresh via
//      `instanceAuth` (which does not recurse into this interceptor).
//   3. Response interceptor catches 401 once, retries with the new token.
//   4. Any second failure → wipe local data and bounce to /login.
//
// Toast notifications (SonnerInfo) are wired up in Phase 2 — for Phase 1 we
// log to console so the file compiles without a UI dep.

import { CONFIG } from "@/config";
import {
  clearLocalData,
  getToken,
  removeToken,
  removeUser,
} from "@/utils";
import { parseJwt } from "@/utils/auth";
import { instanceAuth } from "./instanceAuth";
import { createUploadClient } from "./createBase";

// Phase 1 placeholder. Phase 2 replaces with `import { SonnerInfo } from "@/components/ui/SonnerToast"`.
const SonnerInfo = (message) => {
  if (typeof window !== "undefined" && message) {
    // eslint-disable-next-line no-console
    console.warn("[locket-love]", message);
  }
};

// ==== Expiry cache — avoids parsing JWT on every request ====
let cachedExp = null;
function isTokenExpired(token) {
  if (!token) return true;

  const now = Math.floor(Date.now() / 1000);

  if (!cachedExp) {
    const payload = parseJwt(token);
    if (!payload) return true;
    cachedExp = payload.exp;
  }

  const timeLeft = cachedExp - now;
  return timeLeft < 300; // < 5 minutes → treat as expired
}

// ==== Single-flight refresh ====
let isRefreshing = false;
let refreshPromise = null;

async function refreshIdToken() {
  try {
    const { refreshToken } = getToken();

    const res = await instanceAuth.post("locket/refresh-token", {
      refreshToken,
    });
    const newToken = res?.data?.data?.id_token;
    const newLocalId = res?.data?.data?.user_id;

    if (newToken) {
      localStorage.setItem("idToken", newToken);
      if (newLocalId) localStorage.setItem("localId", newLocalId);
      cachedExp = null;
      return newToken;
    }

    return null;
  } catch (err) {
    const status = err?.response?.status;

    if (status === 401) {
      handleLogout();
    } else if (status === 429) {
      SonnerInfo("Too many requests. Please retry shortly.");
    } else {
      SonnerInfo("Server error. Please try again.");
    }

    console.error("Failed to refresh idToken:", err);
    return null;
  }
}

function handleLogout() {
  isRefreshing = false;
  refreshPromise = null;
  cachedExp = null;

  clearLocalData();
  removeUser();
  removeToken();
  localStorage.removeItem("idToken");
  localStorage.removeItem("localId");

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ==== Axios instance ====
const api = createUploadClient(CONFIG.api.baseUrl);

// ==== Request Interceptor ====
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("idToken");

  if (!token) {
    // Not logged in — caller should treat this as a 401 without triggering refresh.
    return Promise.reject({
      status: 401,
      message: "Not authenticated",
    });
  }

  if (isTokenExpired(token)) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshIdToken();
    }

    token = await refreshPromise;

    isRefreshing = false;
    refreshPromise = null;

    if (!token) {
      handleLogout();
      return Promise.reject(new Error("Token refresh failed"));
    }
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==== Response Interceptor ====
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.message ||
      "Request failed";

    const originalRequest = error.config;

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (status === 401) {
      originalRequest._retry = true;

      if (
        !originalRequest.url?.includes("refresh-token") &&
        !isRefreshing &&
        !originalRequest.skipAuthRefresh
      ) {
        isRefreshing = true;
        refreshPromise = refreshIdToken();

        try {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            handleLogout();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          handleLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      } else {
        handleLogout();
        SonnerInfo("Session expired. Please log in again.");
        return Promise.reject(error);
      }
    }

    if (status === 403) SonnerInfo(message || "Access denied.");
    if (status === 404) SonnerInfo(message || "Not found.");
    if (status === 429) SonnerInfo(message || "Too many requests.");
    if (status === 500) SonnerInfo(message || "Server error.");
    if (status === 502) SonnerInfo(message || "Bad gateway.");
    if (status === 503) SonnerInfo(message || "Service unavailable.");
    if (status === 504) SonnerInfo(message || "Gateway timeout.");

    return Promise.reject(error);
  }
);

export default api;
