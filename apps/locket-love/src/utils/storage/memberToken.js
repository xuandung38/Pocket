// memberToken.js
// Optional member-session token (separate from Firebase idToken).
// Used as a fallback header for backend-issued sessions.

import { CACHE_CONFIG } from "@/config";

const TOKEN_KEY = CACHE_CONFIG.keys.memberToken;
const HEADER_KEY = CACHE_CONFIG.keys.memberHeader;

export const saveMemberToken = (session) => {
  if (!session?.member_token) return;

  localStorage.setItem(TOKEN_KEY, session.member_token);
  localStorage.setItem(HEADER_KEY, session.header || "X-LocketLove-Member");
};

export const getMemberToken = () => ({
  token: localStorage.getItem(TOKEN_KEY),
  header: localStorage.getItem(HEADER_KEY) || "X-LocketLove-Member",
});

export const clearMemberToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(HEADER_KEY);
};
