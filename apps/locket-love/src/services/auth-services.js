// auth-services.js
// Auth/identity HTTP layer — wraps the self-hosted backend's /locket/* endpoints.
// Uses `instanceAuth` so requests carry Bearer tokens + x-api-key without
// triggering the auto-refresh interceptor (which is reserved for `api`/axios.js).

import { instanceAuth } from "@/libs/instanceAuth";

// Email login. Backend (self-hosted) accepts captchaToken=null in dev.
export const loginWithEmail = async ({ email, password, captchaToken = null }) => {
  try {
    const res = await instanceAuth.post("locket/login", {
      email,
      password,
      captchaToken,
    });

    // Backend may return 200 with success=false for soft errors (e.g. wrong pwd)
    if (res.data?.success === false) {
      const err = new Error(res.data.message || "Đăng nhập thất bại");
      err.status = res.data.status || 400;
      throw err;
    }

    return res.data;
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data?.message ||
          error.response.data?.error?.message ||
          "Đăng nhập thất bại, vui lòng thử lại",
      );
      err.status = error.response.status;
      throw err;
    }
    if (error instanceof Error) throw error;
    throw new Error("Có sự cố khi kết nối đến hệ thống");
  }
};

// Phone login. Same shape as email but routes through V2 phone endpoint.
export const loginWithPhone = async ({ phone, password, captchaToken = null }) => {
  try {
    const res = await instanceAuth.post("locket/loginWithPhoneV2", {
      phone,
      password,
      captchaToken,
    });

    if (res.data?.success === false) {
      const err = new Error(res.data.message || "Đăng nhập thất bại");
      err.status = res.data.status || 400;
      throw err;
    }

    return res.data;
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data?.message ||
          error.response.data?.error?.message ||
          "Đăng nhập thất bại, vui lòng thử lại",
      );
      err.status = error.response.status;
      throw err;
    }
    if (error instanceof Error) throw error;
    throw new Error("Có sự cố khi kết nối đến hệ thống");
  }
};

// Server-side logout — invalidates the refresh-cookie session. Local cleanup
// is the caller's responsibility (see useAuthStore.clearAndLogout).
export const logout = async () => {
  try {
    const res = await instanceAuth.get("locket/logout");
    return res.data;
  } catch (error) {
    // Don't block client-side logout on server failure — log and let caller proceed.
    console.error(
      "[auth-services] logout failed:",
      error.response?.data || error.message,
    );
    throw error.response?.data || error;
  }
};

// Returns a new idToken (string) or null. The axios.js interceptor uses this
// directly; user-facing flows use the store's refresh path.
export const refreshIdToken = async () => {
  try {
    const res = await instanceAuth.post("locket/refresh-token");

    if (res.data?.success === false) {
      console.error("[auth-services] refresh failed:", res.data.message);
      return null;
    }

    const payload = res.data?.data ?? res.data ?? {};
    return payload.id_token || payload.idToken || null;
  } catch (error) {
    if (error.response && error.response.data?.error) {
      throw error.response.data.error;
    }
    throw new Error("Có sự cố khi kết nối đến hệ thống, vui lòng thử lại sau ít phút.");
  }
};

// Fetch the authenticated user's profile from the self-hosted backend.
// Body must be POST (legacy Locket convention) — payload is ignored server-side.
export const getUserLocket = async () => {
  try {
    const res = await instanceAuth.post("/locket/getInfoUser");
    return res.data?.data ?? res.data ?? null;
  } catch (error) {
    console.error(
      "[auth-services] getUserLocket failed:",
      error.response?.data || error.message,
    );
    throw error.response?.data || error;
  }
};
