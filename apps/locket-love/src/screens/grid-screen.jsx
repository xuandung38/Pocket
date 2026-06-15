// grid-screen.jsx
// Locket-style 3-column moment gallery, reached via the bottom-nav grid tab.
// Distinct from /feed (vertical scroll) and /memories (calendar) so the grid
// tab and the camera "Lịch sử" pill no longer point at the same surface.
//
// Reads real moments from useMomentsStoreV2. A cold visit prefetches the first
// page so a direct navigation here isn't empty. Tapping a cell opens the live
// vertical feed.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/ui/avatar";
import BottomNav from "../components/ui/bottom-nav";
import ProfileSheet from "../components/sheets/profile-sheet";
import { useAuthStore, useMomentsStoreV2, selectMomentsArray } from "@/stores";

// Backend moment shape varies across endpoints — read the thumbnail defensively.
const getMomentImage = (m) =>
  m?.thumbnailUrl || m?.thumbnail_url || m?.image_url || m?.image || null;

export default function GridScreen() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const momentsMap = useMomentsStoreV2((s) => s.moments);
  const loading = useMomentsStoreV2((s) => s.loading);
  const loadInitial = useMomentsStoreV2((s) => s.loadInitial);

  const moments = useMemo(
    () => selectMomentsArray({ moments: momentsMap }),
    [momentsMap],
  );

  // Cold-visit prefetch — run once. Reading via getState() (not the subscribed
  // map) avoids a render loop when the first page comes back empty.
  useEffect(() => {
    if (Object.keys(useMomentsStoreV2.getState().moments).length === 0) {
      loadInitial?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meName = user?.displayName || user?.firstName || "Bạn";
  const meAvatar = user?.profilePic || user?.photoURL || user?.picture || null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          height: 60,
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 10,
        }}
      >
        <div style={{ width: 38 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
          Mọi người
        </span>
        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Hồ sơ"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            borderRadius: "50%",
          }}
        >
          <Avatar src={meAvatar} name={meName} size={38} />
        </button>
      </div>

      {/* Grid */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 4px calc(var(--nav-height) + 16px)",
        }}
      >
        {moments.length === 0 ? (
          <div
            style={{
              display: "flex",
              height: "60%",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              fontSize: 14,
            }}
          >
            {loading ? "Đang tải…" : "Chưa có khoảnh khắc nào"}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
            }}
          >
            {moments.map((m) => {
              const img = getMomentImage(m);
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/feed?moment=${encodeURIComponent(m.id)}`)}
                  aria-label={m.caption || "Khoảnh khắc"}
                  style={{
                    aspectRatio: "1 / 1",
                    border: "none",
                    padding: 0,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#111",
                    cursor: "pointer",
                  }}
                >
                  {img && (
                    <img
                      src={img}
                      alt={m.caption || ""}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
