// fetch.services.js
// Generic user-record + auth-validation HTTP helpers.
//
// Surface (per Phase 3 spec):
//   - ValidateEmailAddress(email)  → pre-login email validity check
//   - GetUserLocket()              → authenticated user profile (alias to auth-services.getUserLocket)
//   - fetchUserById(uid)           → fetch single raw user payload by uid
//   - fetchUserByToken(token)      → fetch user by idToken via the extension API
//
// `ValidateEmailAddress` / `GetUserLocket` use PascalCase to match the legacy
// lovekit ABI — kept as-is so consumers porting from lovekit don't need rewrites.

import { CONFIG } from "@/config";
import { api, instanceExten } from "@/libs";
import { getUserLocket } from "@/services/auth-services";

/**
 * Pre-login email validation. Backend returns whether the email is registered
 * and which login flow (sign_in / sign_up) applies.
 *
 * Throws with the upstream error payload (or a generic network error) so the
 * login form can surface a meaningful inline message.
 */
export const ValidateEmailAddress = async (email) => {
  try {
    const res = await api.post("/locket/proxy/validateEmailAddress", {
      data: {
        email,
        operation: "sign_in",
        platform: "ios",
      },
    });
    return res.data;
  } catch (error) {
    if (error.response?.data?.error) {
      throw error.response.data.error;
    }
    console.error(
      "[fetch.services] ValidateEmailAddress network error:",
      error.message,
    );
    throw new Error(
      "Có sự cố khi kết nối đến hệ thống, vui lòng thử lại sau ít phút.",
    );
  }
};

/**
 * Return the authenticated user's full profile. Re-exports auth-services
 * canonical implementation so the lovekit-style PascalCase symbol stays valid.
 */
export const GetUserLocket = getUserLocket;

/**
 * Fetch a single raw user record by uid (no normalization).
 * Returns the inner `result.data` payload or undefined if missing.
 */
export const fetchUserById = async (uid) => {
  if (!uid) return undefined;
  const res = await api.post("/locket/proxy/fetchUserV2", {
    data: { user_uid: uid },
  });
  return res?.data?.result?.data;
};

/**
 * Resolve a user record from an arbitrary idToken via the extension API.
 * Used during auth handoff (e.g. magic-link, push notifications).
 *
 * Note: relies on CONFIG.api.extenApi being set; returns undefined if no
 * extension endpoint is configured for the current environment.
 */
export const fetchUserByToken = async (token) => {
  if (!token) return undefined;
  const base = CONFIG?.api?.extenApi;
  if (!base) return undefined;
  const res = await instanceExten.post(`${base}/fetchUserV3`, { token });
  return res?.data?.data;
};
