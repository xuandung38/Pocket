// moment-share-sheet.jsx
// Locket-style share sheet for the moment currently shown in the feed. Opened
// by the feed's right-side Share button. Shows branded share targets plus Save
// and (own-moment-only) Delete.
//
// Branded targets are best-effort: web cannot push an image straight into
// IG/Snap/TikTok, so each attempts the app's URL scheme and falls back to the
// native Web Share sheet / copy-link (see utils/share-targets.js).

import { useState } from "react";
import { MessageCircle, Share2, Download, Trash2 } from "lucide-react";
import BottomSheet from "./bottom-sheet";
import { InstagramLogo, SnapchatLogo, TikTokLogo } from "../ui/brand-logos";
import {
  SonnerError,
  SonnerSuccess,
  SonnerWarning,
} from "../ui/sonner-toast";
import { useMomentsStoreV2 } from "@/stores";
import { getMomentImage, getMomentOwnerUid, proxyImageUrl } from "@/utils/moment-media";
import { downloadMoment } from "@/utils/download-moment";
import { openShareTarget } from "@/utils/share-targets";

// Build a File from the remote image so Web Share can attach it where allowed.
// Returns undefined on CORS/network failure (caller shares the link instead).
async function buildShareFile(url) {
  if (!url) return undefined;
  try {
    const res = await fetch(proxyImageUrl(url), { mode: "cors" });
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
  { key: "instagram", label: "Instagram", icon: <InstagramLogo size={24} />, bg: "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)" },
  { key: "snapchat", label: "Snapchat", icon: <SnapchatLogo size={26} />, bg: "#FFFC00", fg: "#fff" },
  { key: "messages", label: "Tin nhắn", icon: <MessageCircle size={24} fill="#fff" stroke="#fff" />, bg: "#34C759" },
  { key: "tiktok", label: "TikTok", icon: <TikTokLogo size={22} />, bg: "#010101", fg: "#fff" },
  { key: "other", label: "Khác", icon: <Share2 size={22} />, bg: "rgba(255,255,255,0.14)" },
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

      {/* Save / Delete — side by side (Lưu left, Xóa right) like Locket */}
      <div style={{ padding: "8px 16px 24px", display: "flex", gap: 10 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "14px 12px",
            borderRadius: 14,
            border: "none",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Download size={22} />
          Lưu
        </button>

        {isOwn && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "14px 12px",
              borderRadius: 14,
              border: "none",
              background: "var(--bg-surface)",
              color: "#ff5a5a",
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Trash2 size={22} />
            Xóa
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
