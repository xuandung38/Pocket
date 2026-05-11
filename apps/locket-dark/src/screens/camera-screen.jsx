import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BellOff, Users, RotateCcw, ChevronDown } from "lucide-react";
import Avatar from "../components/ui/avatar";
import CaptureButton from "../components/ui/capture-button";
import BottomNav from "../components/ui/bottom-nav";
import FriendsSheet from "../components/sheets/friends-sheet";
import { currentUser, friends, photoStrips } from "../data/mock-data";

// Demo photo shown inside viewfinder to simulate camera live feed
const DEMO_PHOTO = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=85";
// Vertical drag distance to trigger swipe-up → feed
const SWIPE_UP_THRESHOLD = 60;
// Wheel scroll distance threshold to trigger feed navigation
const WHEEL_THRESHOLD = 30;

export default function CameraScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // Skip slide-down animation on cold-load (initial route) — only animate when
  // returning here from /feed so the very first paint isn't artificial.
  const enterClass = location.key === "default" ? "" : "animate-slide-from-top";
  const [friendsOpen, setFriendsOpen] = useState(false);
  // Track vertical drag for swipe-up gesture (camera → feed)
  const dragStartY = useRef(null);
  // Debounce wheel events so we don't navigate on a tiny scroll tick
  const wheelLockedUntil = useRef(0);

  function handlePointerDown(e) {
    dragStartY.current = e.clientY;
  }
  function handlePointerUp(e) {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    // Negative dy = swipe up
    if (dy <= -SWIPE_UP_THRESHOLD) navigate("/feed");
  }
  function handleWheel(e) {
    if (Date.now() < wheelLockedUntil.current) return;
    if (e.deltaY >= WHEEL_THRESHOLD) {
      wheelLockedUntil.current = Date.now() + 1000; // prevent rapid retrigger
      navigate("/feed");
    }
  }

  return (
    <div
      className={enterClass}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (dragStartY.current = null)}
      onWheel={handleWheel}
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        touchAction: "pan-x",
      }}
    >
      {/* Top bar — pushed down for safe-area breathing room (see docs/design-patterns.md §1.1) */}
      <div
        style={{
          flexShrink: 0,
          height: 60,
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 16,
          paddingRight: 16,
          zIndex: 10,
        }}
      >
        <button className="icon-btn">
          <BellOff size={22} />
        </button>
        <button className="pill-btn" onClick={() => setFriendsOpen(true)}>
          <Users size={16} />
          <span>{friends.length} người bạn</span>
        </button>
        <Avatar src={currentUser.avatar} name={currentUser.name} size={38} />
      </div>

      {/* Viewfinder — square 1:1 via paddingBottom trick + outer border ring */}
      <div style={{ flexShrink: 0, padding: "0 12px" }}>
        {/* Outer border ring — 2px subtle white glow matching Locket native */}
        <div
          style={{
            borderRadius: "calc(var(--radius-card) + 3px)",
            padding: 2,
            background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
          }}
        >
          {/* Inner square: paddingBottom:100% = width → always 1:1 */}
          <div
            style={{
              position: "relative",
              paddingBottom: "100%",
              borderRadius: "var(--radius-card)",
              overflow: "hidden",
              background: "#111",
            }}
          >
            <div style={{ position: "absolute", inset: 0 }}>
              {/* Demo image simulating live camera feed */}
              <img
                src={DEMO_PHOTO}
                alt="camera preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Subtle dark vignette corners */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)",
                  pointerEvents: "none",
                }}
              />
              {/* Flash indicator dot top-right */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(6px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "#fff",
                }}
              >
                ⚡
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section — 3 zones matching send-screen layout pattern.
          Zone 2: capture action row. Zone 3: history label. */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          gap: 10,
        }}
      >
        {/* Zone 2 — capture row (gallery | shutter | flip) */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "6px 24px",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.15)",
              flexShrink: 0,
            }}
          >
            <img
              src={photoStrips[0]}
              alt="gallery"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>

          <CaptureButton onClick={() => navigate("/send")} />

          <button
            style={{
              width: 52,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <RotateCcw size={28} />
          </button>
        </div>

        {/* Zone 3 — history label (tap → feed; swipe-up on screen also navigates) */}
        <button
          onClick={() => navigate("/feed")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--text-secondary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          <span>📅</span>
          <span>Lịch sử</span>
          <ChevronDown size={14} />
        </button>
      </div>

      <BottomNav />

      {/* Friends invite/manage sheet — opened from "X người bạn" pill */}
      <FriendsSheet open={friendsOpen} onClose={() => setFriendsOpen(false)} />
    </div>
  );
}
