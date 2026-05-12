import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Bell, Plus, ArrowUp } from "lucide-react";

// At the top of the feed, an upward wheel/swipe goes back to camera (mirrors camera→feed)
const PULL_BACK_THRESHOLD = 50;
import Avatar from "../components/ui/avatar";
import AudiencePicker from "../components/ui/audience-picker";
import BottomNav from "../components/ui/bottom-nav";
import BottomSheet from "../components/sheets/bottom-sheet";
import ProfileSheet from "../components/sheets/profile-sheet";
import { currentUser, feedMoments } from "../data/mock-data";

// Overlay for replying to a friend's moment — blurred photo background + bottom input.
// Mirrors BottomSheet's mount/unmount-with-animation pattern (see docs/design-patterns.md §2.3).
const REPLY_EXIT_DURATION = 280;
function ReplyOverlay({ moment, onClose }) {
  const open = !!moment;
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setText("");
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, REPLY_EXIT_DURATION);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted || !moment) return null;
  const canSend = text.trim().length > 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        overflow: "hidden",
      }}
    >
      {/* Blurred photo backdrop — heavy darken so the input pops */}
      <div
        className={closing ? "animate-fade-out" : "animate-fade-in"}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${moment.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(20px) brightness(0.45)",
          transform: "scale(1.1)",
        }}
      />
      {/* Bottom input row — slides up with the overlay */}
      <div
        className={closing ? "animate-slide-down" : "animate-slide-up"}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "12px 12px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(60,60,67,0.9)",
            backdropFilter: "blur(12px)",
            borderRadius: 999,
            padding: "10px 8px 10px 18px",
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder={`Trả lời ${moment.author.name.split(" ").slice(0, 2).join(" ")}...`}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 500,
            }}
          />
          <button
            onClick={() => canSend && onClose()}
            disabled={!canSend}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: canSend ? "#fff" : "rgba(255,255,255,0.25)",
              border: "none",
              cursor: canSend ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: canSend ? "#000" : "rgba(255,255,255,0.5)",
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Filter moments by audience selection + optional date filter.
// audience: "all" | "owner" | <friendId>
// date: "YYYY-MM-DD" | null (null = no date filter)
function filterMoments(audience, date) {
  let result = feedMoments;
  if (audience === "owner") result = result.filter((m) => m.author.id === currentUser.id);
  else if (audience !== "all") result = result.filter((m) => m.author.id === audience);
  if (date) result = result.filter((m) => m.date === date);
  return result;
}

// Common emoji list shown in the "+" picker — covers Locket's typical reactions
const EMOJI_REACTIONS = [
  "🔥", "😍", "❤️", "🙁", "😂", "😮",
  "👏", "🥰", "😎", "🥹", "🤣", "✨",
  "💀", "💯", "🙌", "😭", "🤔", "👀",
];

function MomentCard({ moment, onOpenReply, onOpenReactions, onSendQuickReaction, onOpenEmojiPicker }) {
  const isOwn = moment.author.id === currentUser.id;
  return (
    <div
      style={{
        scrollSnapAlign: "start",
        flexShrink: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      {/* Square photo card */}
      <div
        style={{
          position: "relative",
          paddingBottom: "100%",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src={moment.image}
            alt={moment.caption}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {moment.caption && (
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                whiteSpace: "nowrap",
              }}
            >
              {moment.caption}
            </div>
          )}
        </div>
      </div>

      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 4px 8px" }}>
        <Avatar src={moment.author.avatar} name={moment.author.name} size={28} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          {isOwn ? "Bạn" : moment.author.name}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{moment.timeAgo}</span>
      </div>

      {/* Conditional control area */}
      {isOwn ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
          <button
            className="pill-btn"
            onClick={() => onOpenReactions(moment)}
            style={{ fontSize: 14, padding: "8px 18px" }}
          >
            <span>⚡</span>
            <span>Hoạt động</span>
            {moment.reactionList?.length > 0 && (
              <span style={{ marginLeft: 6, color: "var(--text-secondary)", fontWeight: 500 }}>
                {moment.reactionList.length}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: 24,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {/* Text area — only this opens the reply overlay */}
          <span
            onClick={onOpenReply}
            style={{ flex: 1, fontSize: 15, color: "var(--text-secondary)", cursor: "pointer" }}
          >
            Gửi tin nhắn...
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Quick-reaction emojis — tap sends immediately, no popup */}
            {moment.reactions.map((e) => (
              <button
                key={e}
                onClick={() => onSendQuickReaction(e)}
                style={{
                  fontSize: 22,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                {e}
              </button>
            ))}
            {/* "+" button — opens the full emoji picker sheet */}
            <button
              onClick={onOpenEmojiPicker}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedScreen() {
  const [audience, setAudience] = useState("all");
  const [reactionMoment, setReactionMoment] = useState(null);
  const [replyMoment, setReplyMoment] = useState(null);
  const [emojiPickerMoment, setEmojiPickerMoment] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState(null); // string shown briefly after sending
  const [searchParams] = useSearchParams();
  const dateFilter = searchParams.get("date"); // "YYYY-MM-DD" from /memories cell click
  const moments = useMemo(() => filterMoments(audience, dateFilter), [audience, dateFilter]);
  const navigate = useNavigate();
  const location = useLocation();
  // Slide-in from below on every visit (user always navigates here from another screen)
  const enterClass = location.key === "default" ? "" : "animate-slide-from-bottom";

  // Pull-back-to-camera gesture state — only active when scroll is at the top
  const scrollRef = useRef(null);
  const dragStartY = useRef(null);
  const wheelLockedUntil = useRef(0);

  function isAtTop() {
    return (scrollRef.current?.scrollTop ?? 0) <= 1;
  }
  function handleScrollPointerDown(e) {
    dragStartY.current = isAtTop() ? e.clientY : null;
  }
  function handleScrollPointerUp(e) {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    // Positive dy (finger dragged down) at top of feed → back to camera
    if (dy >= PULL_BACK_THRESHOLD && isAtTop()) navigate("/");
  }
  function handleScrollWheel(e) {
    if (Date.now() < wheelLockedUntil.current) return;
    if (e.deltaY <= -PULL_BACK_THRESHOLD && isAtTop()) {
      wheelLockedUntil.current = Date.now() + 1000;
      navigate("/");
    }
  }

  // Auto-dismiss toast after 1.8s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  function sendReaction(emoji) {
    setToast(`Đã gửi ${emoji}`);
    setEmojiPickerMoment(null);
  }

  return (
    <div className={enterClass} style={{ position: "absolute", inset: 0, background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      {/* Top bar — pushed down for safe-area breathing room (see docs/design-patterns.md §1.1) */}
      <div
        style={{
          flexShrink: 0,
          marginTop: 40,
          padding: "0 16px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20,
        }}
      >
        <button className="icon-btn">
          <Bell size={22} />
        </button>
        <AudiencePicker value={audience} onChange={setAudience} />
        <button
          onClick={() => setProfileOpen(true)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }}
        >
          <Avatar src={currentUser.avatar} name={currentUser.name} size={36} />
        </button>
      </div>

      {/* Vertical snap scroller — one moment per snap, swipe up/down to navigate.
          When at the top, an upward wheel/drag-down navigates back to camera. */}
      <div
        ref={scrollRef}
        onPointerDown={handleScrollPointerDown}
        onPointerUp={handleScrollPointerUp}
        onPointerCancel={() => (dragStartY.current = null)}
        onWheel={handleScrollWheel}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {moments.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
            Chưa có khoảnh khắc nào
          </div>
        ) : (
          moments.map((m) => (
            <MomentCard
              key={m.id}
              moment={m}
              onOpenReactions={setReactionMoment}
              onOpenReply={() => setReplyMoment(m)}
              onSendQuickReaction={sendReaction}
              onOpenEmojiPicker={() => setEmojiPickerMoment(m)}
            />
          ))
        )}
      </div>

      <BottomNav />

      {/* Reply overlay — friend's moment message bar opens this */}
      <ReplyOverlay moment={replyMoment} onClose={() => setReplyMoment(null)} />

      {/* Profile sheet — opened from avatar (top-right) */}
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Emoji picker — opened from "+" button on friend's message bar */}
      <BottomSheet
        open={!!emojiPickerMoment}
        onClose={() => setEmojiPickerMoment(null)}
        title="Chọn phản ứng"
      >
        <div
          style={{
            padding: "12px 16px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 12,
          }}
        >
          {EMOJI_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => sendReaction(e)}
              style={{
                aspectRatio: "1 / 1",
                fontSize: 28,
                background: "var(--bg-elevated)",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Toast — confirms reaction sent. Auto-dismiss after 1.8s */}
      {toast && (
        <div
          style={{
            position: "absolute",
            top: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 100,
            pointerEvents: "none",
          }}
          className="animate-fade-in"
        >
          {toast}
        </div>
      )}

      {/* Reaction list sheet (own moments) */}
      <BottomSheet
        open={!!reactionMoment}
        onClose={() => setReactionMoment(null)}
        title="Phản ứng"
      >
        <div style={{ padding: "8px 0 24px" }}>
          {reactionMoment?.reactionList?.length ? (
            reactionMoment.reactionList.map((r, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}
              >
                <Avatar src={r.user.avatar} name={r.user.name} size={40} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{r.user.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.time}</span>
                </div>
                <span style={{ fontSize: 24 }}>{r.emoji}</span>
              </div>
            ))
          ) : (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-secondary)" }}>
              Chưa có hoạt động nào
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
