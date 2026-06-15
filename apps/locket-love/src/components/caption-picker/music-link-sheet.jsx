// music-link-sheet.jsx
// Paste-a-link form (replaces the old mocked "connect service" sheet). The user
// drops a Spotify/Apple Music share link; the backend resolves it into a music
// overlay which is handed back via onSubmit. CORS is avoided by parsing on the
// server (music-services → /api/getInfoMusic).
import { useState } from "react";
import { Loader2 } from "lucide-react";
import BottomSheet from "../sheets/bottom-sheet";
import { getInfoMusicByUrl } from "@/services/music-services";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";
import { SonnerWarning } from "../ui/sonner-toast";

const PLATFORMS = [
  { id: "spotify", label: "Spotify" },
  { id: "apple", label: "Apple Music" },
];

export default function MusicLinkSheet({ open, onClose, onSubmit }) {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("spotify");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const link = url.trim();
    if (!link || loading) return;
    setLoading(true);
    try {
      const info = await getInfoMusicByUrl(link, platform);
      if (!info?.title && !info?.image) throw new Error("empty info");
      onSubmit(
        normalizeOverlay({ type: "music", caption: info.title || "Nhạc", music: info }),
      );
      setUrl("");
    } catch (err) {
      console.warn("[music-link-sheet] resolve failed:", err?.message);
      SonnerWarning("Không lấy được nhạc", "Kiểm tra lại link Spotify/Apple Music.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Thêm nhạc">
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 12,
                border: `1.5px solid ${platform === p.id ? "var(--accent-yellow)" : "rgba(255,255,255,0.15)"}`,
                background: platform === p.id ? "var(--accent-yellow-dim)" : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Dán link bài hát…"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 15,
            color: "#fff",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
          className="pill-btn"
          style={{ justifyContent: "center", opacity: loading || !url.trim() ? 0.6 : 1 }}
        >
          {loading ? (
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            "Thêm"
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
