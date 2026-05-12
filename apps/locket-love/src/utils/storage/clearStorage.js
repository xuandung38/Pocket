// clearStorage.js
// Wipes auth + cached user-derived data. Called on logout and when the
// refresh-token flow gives up.

import { removeToken } from "./storage";

export const clearLocalData = () => {
  try {
    removeToken();
    localStorage.removeItem("friendsList");
    localStorage.removeItem("friendDetails");
    localStorage.removeItem("userPlan");
  } catch (e) {
    // Storage can throw in private-mode Safari; swallow but log so we notice.
    console.error("Failed to clear local data:", e);
  }
};
