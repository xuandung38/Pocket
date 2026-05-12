import { instanceMain } from "@/lib/axios.main";

// Self-hosted backend does not implement /api/collab/getCaption. Gate behind
// a feature flag so the optional collab-caption UX stays available for forks
// that DO implement it, while default deployments return null gracefully
// (avoids noisy 404s on every feed open).
const COLLAB_ENABLED = import.meta.env?.VITE_FEATURE_COLLAB === "true";
let warned = false;

export const getCollabCaption = async (captionId) => {
  if (!COLLAB_ENABLED) {
    if (!warned) {
      warned = true;
      console.warn(
        "[CollabServices] getCollabCaption disabled — set VITE_FEATURE_COLLAB=true to enable",
      );
    }
    return null;
  }

  try {
    const res = await instanceMain.post("/api/collab/getCaption", {
      id: captionId,
    });
    return res.data?.data || null;
  } catch (error) {
    console.error("🚨 Lỗi khi gọi API:", error.message);
    return null;
  }
};
