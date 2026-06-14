// overlay-services.js
// Fetches caption overlay themes from the backend.
// Mirrors lovekit/web getAllOverlayCaption — same endpoint, same contract.
// Self-hosted backend returns [] (public.route.js stub); a full deployment
// returns an array of theme objects grouped later by useOverlayStore.

import api from "@/libs/axios";

export const getAllOverlayCaption = async () => {
  try {
    const res = await api.get("v1/public/themes");
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
};
