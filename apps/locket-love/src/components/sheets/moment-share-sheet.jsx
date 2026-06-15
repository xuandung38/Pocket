// moment-share-sheet.jsx
// Locket-style share sheet for the moment currently shown in the feed. Opened
// by the feed's right-side Share button. Shows branded share targets plus Save
// and (own-moment-only) Delete.
//
// Branded targets are best-effort: web cannot push an image straight into
// IG/Snap/TikTok, so each attempts the app's URL scheme and falls back to the
// native Web Share sheet / copy-link (see utils/share-targets.js).

import { useState } from "react";
import { Instagram, MessageSquare, Share2, Download, Trash2 } from "lucide-react";
import BottomSheet from "./bottom-sheet";
import {
  SonnerError,
  SonnerSuccess,
  SonnerWarning,
} from "../ui/sonner-toast";
import { useMomentsStoreV2 } from "@/stores";
import { getMomentImage, getMomentOwnerUid } from "@/utils/moment-media";
import { downloadMoment } from "@/utils/download-moment";
import { openShareTarget } from "@/utils/share-targets";

// Build a File from the remote image so Web Share can attach it where allowed.
// Returns undefined on CORS/network failure (caller shares the link instead).
async function buildShareFile(url) {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return new File([blob], `locket_${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
  } catch {
    return undefined;
  }
}

const TARGETS = [
  { key: "instagram", label: "Instagram", icon: <Instagram size={22} />, bg: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" },
  { key: "snapchat", label: "Snapchat", emoji: "👻", bg: "#FFFC00", fg: "#111" },
  { key: "messages", label: "Tin nhắn", icon: <MessageSquare size={22} />, bg: "#22c55e" },
  { key: "tiktok", label: "TikTok", emoji: "🎵", bg: "#111", fg: "#fff" },
  { key: "other", label: "Khác", icon: <Share2 size={22} />, bg: "rgba(255,255,255,0.12)" },
];

export default function MomentShareSheet({ open, moment, meUid, onClose }) {
  const deleteMoment = useMomentsStoreV2((s) => s.deleteMoment);
  const [busy, setBusy] = useState(false);

  const imageUrl = moment ? getMomentImage(moment) : null;
  const caption = moment?.caption || "";
  const isOwn = !!moment && getMomentOwnerUid(moment) === meUid;

  async function handleTarget(target) {
    if (!imageUrl) {
      SonnerWarning("Không có ảnh để chia sẻ.");
      return;
    }
    const file = target === "messages" ? undefined : await buildShareFile(imageUrl);
    const ok = await openShareTarget(target, { url: imageUrl, file, caption });
    if (!ok) SonnerWarning("Không mở được ứng dụng chia sẻ.");
  }

  async function handleSave() {
    if (!imageUrl) {
      SonnerWarning("Không có ảnh để lưu.");
      return;
    }
    const ok = await downloadMoment(imageUrl);
    if (ok) SonnerSuccess("Đã lưu", "Ảnh đã tải về máy.");
    else SonnerWarning("Đã mở ảnh ở tab mới (không tải trực tiếp được).");
  }

  async function handleDelete() {
    if (!moment?.id || !isOwn || busy) return;
    if (!window.confirm("Xóa khoảnh khắc này?")) return;
    setBusy(true);
    try {
      const deleted = await deleteMoment(moment.id);
      if (deleted) {
        SonnerSuccess("Đã xóa", "Khoảnh khắc đã được gỡ.");
        onClose?.();
      } else {
        SonnerError("Xóa thất bại", "Không gỡ được khoảnh khắc.");
      }
    } catch (err) {
      console.error("[moment-share-sheet] delete failed:", err);
      SonnerError("Xóa thất bại", "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Chia sẻ">
      {/* Share targets */}
      <div
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          padding: "18px 16px 8px",
          scrollbarWidth: "none",
        }}
      >
        {TARGETS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTarget(t.key)}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: t.bg,
                color: t.fg || "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              {t.icon || t.emoji}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Save / Delete */}
      <div style={{ padding: "8px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleSave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: "none",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Download size={20} />
          Lưu ảnh
        </button>

        {isOwn && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              background: "var(--bg-surface)",
              color: "#ff5a5a",
              fontSize: 15,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Trash2 size={20} />
            Xóa
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
