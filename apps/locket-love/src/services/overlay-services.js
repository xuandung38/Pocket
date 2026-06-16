// overlay-services.js
// Fetches the caption/overlay preset dataset from the backend.
// The self-hosted backend proxies Locket Dio's `getAllOverlaysV2` (sectioned
// shape: [{ section_id, name, order_id, items: [...] }]). Returns [] on failure
// so useOverlayStore can degrade gracefully.

import api from "@/libs/axios";

export const getAllOverlayCaption = async () => {
  try {
    const res = await api.get("v1/public/getAllOverlaysV2");
    const data = res?.data;
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch {
    return [];
  }
};
