import api from "@/lib/axios";

// Self-hosted backend does not implement /api/getInfoMusic. Gate behind a
// feature flag so the optional music-overlay UX stays available for forks
// that DO implement it, while default deployments skip the request entirely
// (avoids noisy 404s on every camera open).
const MUSIC_ENABLED = import.meta.env?.VITE_FEATURE_MUSIC === "true";
let warned = false;

export const getInfoMusicByUrl = async (url, platform) => {
  if (!url || !platform) {
    console.warn("⚠️ getInfoMusicByUrl: Thiếu url hoặc platform");
    return null;
  }

  if (!MUSIC_ENABLED) {
    if (!warned) {
      warned = true;
      console.warn(
        "[MusicServices] getInfoMusicByUrl disabled — set VITE_FEATURE_MUSIC=true to enable",
      );
    }
    return null;
  }

  try {
    const res = await api.post("/api/getInfoMusic", { url, platform });

    if (res?.data?.status === "success") {
      return res.data.data;
    }

    console.error("❌ getInfoMusicByUrl: Không có dữ liệu hợp lệ", res?.data);
    return null;
  } catch (error) {
    console.error("🚨 Lỗi khi gọi getInfoMusicByUrl:", error.message);
    return null;
  }
};
