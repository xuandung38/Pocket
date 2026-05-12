// OptionMoment — bottom sheet for downloading or deleting a selected moment.
// Ported from apps/self-hosted/lovekit/src/components/OptionMoment.jsx
// and adapted to locket-love conventions:
//   - state via AppContext (`modals.optionMoment`, `selectedMoment`)
//   - delete via `useMomentsStoreV2.deleteMoment` (server + store cleanup)
//   - download inlined (no shared util in this app)
//
// Rules-of-Hooks: ALL hook calls run before any conditional `return`. The
// component decides whether to render late, after hooks have already fired.
import { useEffect, useState } from "react";
import { Download, Trash2, X } from "lucide-react";

import { useAppContext } from "@/context/AppContext";
import {
  SonnerSuccess,
  SonnerWarning,
  SonnerInfo,
} from "@/components/ui/sonner-toast";
import { useMomentsStoreV2 } from "@/stores";

// Inline filename-driven anchor download. Same-origin or CORS-permitted URLs
// download directly; cross-origin URLs fall back to the browser's default
// behaviour (open in a new tab) which is still a usable outcome.
function downloadByLink(url, filename) {
  if (!url) return;
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.warn("[OptionMoment] downloadByLink failed:", err);
  }
}

export default function OptionMoment() {
  // --- All hooks first (Rules of Hooks) ---
  const {
    modals,
    closeModal,
    selectedMoment,
    setSelectedMoment,
  } = useAppContext();

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  // Selector form — avoids re-renders when unrelated slices of the store change.
  const deleteMoment = useMomentsStoreV2((s) => s.deleteMoment);

  const isOpen = !!modals?.optionMoment;

  // Lock body scroll while the sheet is open. Cleanup on close + unmount so
  // we never leave the page un-scrollable after a hot-reload.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // --- Early return AFTER all hooks above ---
  // Keep mounted while the confirm dialog is up, even if the sheet itself
  // is dismissed, so the delete action can complete.
  if (!isOpen && !openDeleteConfirm) return null;

  // --- Handlers ---
  const closeSheet = () => closeModal("optionMoment");

  // Clear context selection after a successful action.
  const handleClose = () => {
    setSelectedMoment(null);
    closeSheet();
  };

  const handleDelete = async () => {
    const momentId = selectedMoment?.id;
    if (!momentId) {
      SonnerWarning("Không tìm thấy moment để xoá.");
      return;
    }

    try {
      const deletedId = await deleteMoment(momentId);
      if (deletedId) {
        SonnerSuccess("Đã xoá ảnh thành công!");
        handleClose();
      } else {
        // Server returned no id → still in store; user can retry.
        SonnerWarning("Xoá không thành công, vui lòng thử lại!");
      }
    } catch (err) {
      SonnerWarning("Xoá không thành công, vui lòng thử lại!");
      console.warn("[OptionMoment] deleteMoment failed", err);
    }
  };

  const handleDownload = () => {
    const momentId = selectedMoment?.id;
    if (!momentId) {
      SonnerInfo("Không tìm thấy moment để tải.");
      return;
    }

    const videoUrl = selectedMoment?.videoUrl || selectedMoment?.video_url;
    const imageUrl =
      selectedMoment?.thumbnailUrl ||
      selectedMoment?.image_url ||
      selectedMoment?.image;

    if (videoUrl) {
      downloadByLink(videoUrl, `moment_${momentId}.mp4`);
    } else if (imageUrl) {
      downloadByLink(imageUrl, `moment_${momentId}.jpg`);
    } else {
      SonnerInfo("Không có video hoặc thumbnail để tải.");
    }
  };

  return (
    <>
      {/* Overlay — click to dismiss */}
      <div
        onClick={closeSheet}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.35s ease",
          zIndex: 62,
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          paddingTop: 12,
          paddingBottom: 24,
          paddingLeft: 16,
          paddingRight: 16,
          background: "var(--bg-surface, #1c1c1e)",
          color: "var(--text-primary, #fff)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          opacity: isOpen ? 1 : 0,
          transition: "transform 0.35s ease, opacity 0.35s ease",
          zIndex: 63,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600 }}>Tuỳ chọn</div>
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 6,
            }}
          >
            <X size={24} />
          </button>
        </div>

        <p
          style={{
            margin: "12px 0 0",
            fontSize: 14,
            opacity: 0.7,
            textAlign: "left",
          }}
        >
          Bạn có thể tải về hình ảnh/video của bạn bè hoặc xoá chúng khỏi lịch
          sử của bạn.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={handleDownload}
            style={{
              flex: 1,
              maxWidth: 160,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 24,
              border: "1px solid var(--text-primary, #fff)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            <Download size={20} /> Tải xuống
          </button>

          <button
            type="button"
            onClick={() => {
              closeSheet();
              setOpenDeleteConfirm(true);
            }}
            style={{
              flex: 1,
              maxWidth: 160,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 24,
              border: "1px solid var(--text-primary, #fff)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            <Trash2 size={20} /> Xoá
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {openDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            zIndex: 70,
          }}
          onClick={() => setOpenDeleteConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(360px, 90vw)",
              background: "var(--bg-surface, #1c1c1e)",
              color: "var(--text-primary, #fff)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>Xoá ảnh?</div>
            <p
              style={{
                margin: "10px 0 16px",
                fontSize: 14,
                opacity: 0.75,
              }}
            >
              Việc này sẽ xoá ảnh khỏi lịch sử của bạn và không thể hoàn tác.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(255,255,255,0.08)",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDelete();
                  setOpenDeleteConfirm(false);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "#e53935",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
