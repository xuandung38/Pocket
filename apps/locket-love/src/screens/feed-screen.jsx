import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Bell, Plus, ArrowUp, LayoutGrid, Share2 } from "lucide-react";

// At the top of the feed, an upward wheel/swipe goes back to camera (mirrors camera→feed)
const PULL_BACK_THRESHOLD = 50;

import Avatar from "../components/ui/avatar";
import AudiencePicker from "../components/ui/audience-picker";
import BottomNav from "../components/ui/bottom-nav";
import BottomSheet from "../components/sheets/bottom-sheet";
import ProfileSheet from "../components/sheets/profile-sheet";
import MomentShareSheet from "../components/sheets/moment-share-sheet";
import FriendMomentRow from "../components/friend-moment-row";
import EmojiStudio from "../components/emoji-studio";
import CaptionOverlay from "../components/caption-overlay/caption-overlay";
import {
  useAuthStore,
  useFriendStoreV2,
  useMomentsStoreV2,
} from "@/stores";
import { sendReactMoment } from "@/services/moment-services";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";
import { SonnerError } from "../components/ui/sonner-toast";

// -------------------------------------------------------------------------
// Backend moment shape varies across endpoints/proxies — read defensively.
// -------------------------------------------------------------------------
const getMomentOwnerUid = (m) => m?.user ?? m?.userUid ?? m?.owner;
const getMomentImage = (m) =>
  m?.thumbnailUrl || m?.thumbnail_url || m?.image_url || m?.image || null;
const getMomentVideo = (m) => m?.videoUrl || m?.video_url || null;
const getMomentCaption = (m) => m?.caption || "";

// Overlay metadata is surfaced by the API's normalizeMoment as `moment.overlays`
// (id/type/textColor/background.colors/icon/payload); the moment's free text
// stays on moment.caption. Plain-caption moments carry an all-null overlays
// object → return null so the feed falls back to the flat caption bar.
const getMomentOverlay = (m) => {
  const ov = m?.overlays;
  if (!ov) return null;
  // Icon may be a { type, data } map or a raw string — unwrap before truthiness
  // so an empty icon map ({type:"emoji", data:""}) doesn't count as an overlay
  // and render an empty pill where a plain caption should show nothing.
  const iconVal = ov.icon && typeof ov.icon === "object" ? ov.icon.data : ov.icon;
  const hasOverlay =
    !!ov.type ||
    (Array.isArray(ov.background?.colors) && ov.background.colors.length > 0) ||
    !!iconVal;
  if (!hasOverlay) return null;
  // Prefer the moment's caption, falling back to the overlay's own text (widget
  // value like an address or "77%") so a blank moment caption doesn't hide it.
  return normalizeOverlay({ ...ov, caption: m.caption || ov.text || "" });
};
const getMomentTimestampMs = (m) => {
  // Try numeric epoch (createTime) first, then ISO string, fallback 0.
  const numeric = Number(m?.createTime ?? m?.create_time);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(m?.date ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};
const getMomentDateKey = (m) => {
  // Reduce to a YYYY-MM-DD bucket so the ?date= filter matches reliably even
  // when the backend returns full ISO timestamps.
  const ts = getMomentTimestampMs(m);
  if (!ts) return m?.date ?? null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Best-effort "x phút/giờ/ngày trước" formatter — keeps native Locket feel.
function formatTimeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "vừa xong";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}ngày`;
  const date = new Date(ts);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Compose a display name out of normalized friend shape; falls back gracefully.
function friendDisplayName(friend) {
  if (!friend) return "";
  const combined = [friend.firstName, friend.lastName].filter(Boolean).join(" ").trim();
  return combined || friend.username || friend.name || "";
}

// Resolve the author meta for a moment from store + auth user.
function resolveAuthor({ ownerUid, friendsByUid, meUid, me }) {
  if (ownerUid && ownerUid === meUid) {
    return {
      id: meUid,
      name: me?.displayName || me?.first_name || me?.name || "Bạn",
      avatar: me?.profilePicture || me?.profile_picture_url || me?.avatar || null,
    };
  }
  const friend = ownerUid ? friendsByUid[ownerUid] : null;
  if (friend) {
    return {
      id: friend.uid,
      name: friendDisplayName(friend) || "Người dùng",
      avatar: friend.profilePic || null,
    };
  }
  return { id: ownerUid || "unknown", name: "Người dùng", avatar: null };
}

// Filter a sorted moment list by audience + optional date string.
// `audience`: "all" | "owner" | <friendUid>
// `date`: "YYYY-MM-DD" | null
function filterMoments(list, audience, date, meUid) {
  let out = list;
  if (audience === "owner") {
    out = out.filter((m) => getMomentOwnerUid(m) === meUid);
  } else if (audience !== "all") {
    out = out.filter((m) => getMomentOwnerUid(m) === audience);
  }
  if (date) {
    out = out.filter((m) => getMomentDateKey(m) === date);
  }
  return out;
}

// ----------------------- Reply overlay (unchanged UX) -----------------------
// Slide-up bottom input shown when tapping a friend's "Gửi tin nhắn..." row.
// Mirrors BottomSheet's mount-then-exit animation pattern.
const REPLY_EXIT_DURATION = 280;
function ReplyOverlay({ moment, authorName, image, onClose }) {
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
      <div
        className={closing ? "animate-fade-out" : "animate-fade-in"}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: image ? `url(${image})` : "none",
          backgroundColor: "#000",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(20px) brightness(0.45)",
          transform: "scale(1.1)",
        }}
      />
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
            placeholder={`Trả lời ${(authorName || "").split(" ").slice(0, 2).join(" ")}...`}
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

// Default emoji set rendered on the "Gửi tin nhắn..." row when the backend
// hasn't shipped per-moment reaction suggestions yet.
const DEFAULT_QUICK_REACTIONS = ["🔥", "😍", "❤️"];

function MomentCard({
  moment,
  meUid,
  author,
  onOpenReply,
  onOpenReactions,
  onSendQuickReaction,
  onOpenEmojiPicker,
}) {
  const ownerUid = getMomentOwnerUid(moment);
  const isOwn = ownerUid && ownerUid === meUid;
  const image = getMomentImage(moment);
  const video = getMomentVideo(moment);
  const caption = getMomentCaption(moment);
  const momentOverlay = getMomentOverlay(moment);
  const ts = getMomentTimestampMs(moment);
  const timeAgo = formatTimeAgo(ts);
  const quickReactions = Array.isArray(moment.reactions) && moment.reactions.length > 0
    ? moment.reactions
    : DEFAULT_QUICK_REACTIONS;
  const reactionCount = Array.isArray(moment.reactionList)
    ? moment.reactionList.length
    : moment.reactionsCount || 0;

  return (
    <div
      data-moment-id={moment.id}
      style={{
        scrollSnapAlign: "start",
        flexShrink: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // Top-align so the card sits just under the friend strip instead of
        // floating in the middle (which left a large gap below the avatars).
        justifyContent: "flex-start",
        padding: "8px 12px 0",
        boxSizing: "border-box",
      }}
    >
      {/* Square media card — video preferred when available, else still image */}
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
          {video ? (
            <video
              src={video}
              poster={image || undefined}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : image ? (
            <img
              src={image}
              alt={caption || "Moment"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Không có ảnh
            </div>
          )}
          {(momentOverlay || caption) && (
            <div
              style={{
                // Full-width centered row so chips size to content (left:50%
                // shrink-to-fit collapsed short captions like "76%").
                position: "absolute",
                bottom: 14,
                left: 0,
                right: 0,
                padding: "0 16px",
                zIndex: 1,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {momentOverlay ? (
                // Rich overlay (theme/gradient/image/snow) rendered client-side
                // from the moment's metadata — caption is metadata, not baked.
                <CaptionOverlay overlay={momentOverlay} />
              ) : (
                // Backward-compat: plain-caption moments keep the flat bar.
                <div
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 20,
                    padding: "6px 16px",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {caption}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 4px 8px" }}>
        <Avatar src={author.avatar} name={author.name} size={28} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          {isOwn ? "Bạn" : author.name}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{timeAgo}</span>
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
            {reactionCount > 0 && (
              <span style={{ marginLeft: 6, color: "var(--text-secondary)", fontWeight: 500 }}>
                {reactionCount}
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
          <span
            onClick={onOpenReply}
            style={{ flex: 1, fontSize: 15, color: "var(--text-secondary)", cursor: "pointer" }}
          >
            Gửi tin nhắn...
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {quickReactions.map((e) => (
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // ---- Stores ------------------------------------------------------------
  const user = useAuthStore((s) => s.user);

  const friends = useFriendStoreV2((s) => s.friends);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);

  const loadInitial = useMomentsStoreV2((s) => s.loadInitial);
  const loadMoreOlder = useMomentsStoreV2((s) => s.loadMoreOlder);
  const loading = useMomentsStoreV2((s) => s.loading);
  const isLoadingMore = useMomentsStoreV2((s) => s.isLoadingMore);
  const hasMore = useMomentsStoreV2((s) => s.hasMore);
  // Subscribe to the map (stable reference); derive sorted array via useMemo.
  // Do NOT pass selectMomentsArray directly to useMomentsStoreV2 — it creates
  // a new array each call which triggers an Object.is mismatch → infinite loop.
  const momentsMap = useMomentsStoreV2((s) => s.moments);
  const allMoments = useMemo(
    () =>
      Object.values(momentsMap).sort(
        (a, b) => (b.createTime ?? b.date ?? 0) - (a.createTime ?? a.date ?? 0),
      ),
    [momentsMap],
  );

  // ---- Local UI state ----------------------------------------------------
  const [audience, setAudience] = useState("all");
  const [reactionMoment, setReactionMoment] = useState(null);
  const [replyMoment, setReplyMoment] = useState(null);
  const [emojiPickerMoment, setEmojiPickerMoment] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // Moment currently filling the viewport (drives the Share sheet target) +
  // the feed-only share sheet open flag.
  const [activeMomentId, setActiveMomentId] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Date filter from /memories cell click — "YYYY-MM-DD" or null
  const dateFilter = searchParams.get("date");
  // Moment to scroll to, set by a /grid cell tap ("?moment=<id>"). Without this
  // the feed always opened at the newest moment regardless of which grid cell
  // was tapped.
  const focusMomentId = searchParams.get("moment");

  // ---- Derived data ------------------------------------------------------
  const meUid = user?.uid || user?.localId || null;

  // O(1) lookup for moment author info.
  const friendsByUid = useMemo(() => {
    const map = {};
    for (const f of friends ?? []) {
      if (f?.uid) map[f.uid] = f;
    }
    return map;
  }, [friends]);

  const moments = useMemo(
    () => filterMoments(allMoments, audience, dateFilter, meUid),
    [allMoments, audience, dateFilter, meUid],
  );

  // ---- Effects -----------------------------------------------------------
  // 1) Initial moment fetch — once on mount when authed.
  useEffect(() => {
    if (!user) return;
    loadInitial({ friendId: null });
  }, [user, loadInitial]);

  // 2) Friend list — only fetch if missing so we don't re-trigger on every
  //    moment store mutation.
  useEffect(() => {
    if (!user) return;
    if (!friends?.length) loadFriends?.();
  }, [user, friends?.length, loadFriends]);

  // 3) Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Pull-back-to-camera gesture --------------------------------------
  const scrollRef = useRef(null);

  // Jump to the moment named by "?moment=<id>" (a /grid cell tap). Runs once
  // when the target card exists; snap-scroll lands it at the top.
  const didFocusRef = useRef(false);
  useEffect(() => {
    if (!focusMomentId || didFocusRef.current) return;
    if (!moments.length) return;
    const selector = `[data-moment-id="${
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(focusMomentId)
        : focusMomentId
    }"]`;
    const el = scrollRef.current?.querySelector(selector);
    if (el) {
      el.scrollIntoView({ block: "start" });
      didFocusRef.current = true;
    }
  }, [focusMomentId, moments]);

  // Track which moment fills the viewport so the Share button targets it.
  // Re-observes whenever the moment list changes.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;
    const cards = root.querySelectorAll("[data-moment-id]");
    if (!cards.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = top?.target?.getAttribute("data-moment-id");
        if (id) setActiveMomentId(id);
      },
      { root, threshold: [0.4, 0.6, 0.8] },
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [moments]);

  // Drop a stale active id once its moment leaves the list (e.g. after delete)
  // so the Share sheet never targets a removed moment — it falls back to newest.
  useEffect(() => {
    if (activeMomentId && !moments.some((m) => m.id === activeMomentId)) {
      setActiveMomentId(null);
    }
  }, [moments, activeMomentId]);

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
    if (dy >= PULL_BACK_THRESHOLD && isAtTop()) navigate("/");
  }
  function handleScrollWheel(e) {
    if (Date.now() < wheelLockedUntil.current) return;
    if (e.deltaY <= -PULL_BACK_THRESHOLD && isAtTop()) {
      wheelLockedUntil.current = Date.now() + 1000;
      navigate("/");
    }
  }

  // ---- Infinite scroll sentinel ----------------------------------------
  // We only paginate when audience === "all" + no date filter — narrower
  // filters render a subset of already-fetched data; client-side filtering
  // is plenty for typical feed sizes.
  const sentinelRef = useRef(null);
  const canPaginate = audience === "all" && !dateFilter;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (!canPaginate) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMoreOlder({ friendId: null });
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canPaginate, hasMore, isLoadingMore, loading, loadMoreOlder, moments.length]);

  // Quick-tap reaction on a friend's moment. Optimistically toasts then fires
  // POST /locket/proxy/reactToMoment; rolls the toast back on failure so users
  // see an honest signal rather than a silent miss.
  async function sendReaction(moment, emoji) {
    if (!moment?.id) return;
    setToast(`Đã gửi ${emoji}`);
    setEmojiPickerMoment(null);
    try {
      const res = await sendReactMoment(emoji, moment.id, 0);
      if (res == null) {
        // sendReactMoment swallows transport errors and returns null on
        // failure — surface a toast so the user knows the tap didn't land.
        SonnerError("Gửi cảm xúc thất bại!");
      }
    } catch (err) {
      console.error("[feed-screen] sendReaction failed:", err);
      SonnerError("Gửi cảm xúc thất bại!");
    }
  }

  // After EmojiStudio resolves, just close the picker state. EmojiStudio owns
  // its own success/error toasts via sonner so we don't double-toast here.
  function handleEmojiStudioSent() {
    setEmojiPickerMoment(null);
  }

  // Slide-in from below on every visit (user always navigates here from another screen)
  const enterClass = location.key === "default" ? "" : "animate-slide-from-bottom";

  const showSkeleton = loading && moments.length === 0;
  const showEmpty = !loading && moments.length === 0;

  const authorAvatar =
    user?.profilePicture || user?.profile_picture_url || user?.avatar || null;
  const authorName = user?.displayName || user?.first_name || "Bạn";

  // Moment the Share sheet acts on — the one in view, else the newest.
  const activeMoment =
    moments.find((m) => m.id === activeMomentId) || moments[0] || null;

  return (
    <div
      className={enterClass}
      style={{ position: "absolute", inset: 0, background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}
    >
      {/* Top bar — pushed down for safe-area breathing room */}
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
          <Avatar src={authorAvatar} name={authorName} size={36} />
        </button>
      </div>

      {/* Horizontal friend strip — tap to scope feed to a friend */}
      <FriendMomentRow onSelectFriend={(uid) => setAudience(uid)} />

      {/* Vertical snap scroller */}
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
        {showSkeleton ? (
          <div
            style={{
              padding: "60px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 360,
                aspectRatio: "1 / 1",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-card)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 13 }}>Đang tải khoảnh khắc...</span>
          </div>
        ) : showEmpty ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
            Chưa có khoảnh khắc nào
          </div>
        ) : (
          moments.map((m) => {
            const ownerUid = getMomentOwnerUid(m);
            const author = resolveAuthor({
              ownerUid,
              friendsByUid,
              meUid,
              me: user,
            });
            return (
              <MomentCard
                key={m.id}
                moment={m}
                meUid={meUid}
                author={author}
                onOpenReactions={setReactionMoment}
                onOpenReply={() => setReplyMoment(m)}
                onSendQuickReaction={(emoji) => sendReaction(m, emoji)}
                onOpenEmojiPicker={() => setEmojiPickerMoment(m)}
              />
            );
          })
        )}

        {/* Bottom sentinel — drives loadMoreOlder when in view */}
        {moments.length > 0 && canPaginate && (
          <div
            ref={sentinelRef}
            aria-hidden="true"
            style={{ height: 1 }}
          />
        )}

        {/* Pagination loading footer */}
        {moments.length > 0 && canPaginate && isLoadingMore && (
          <div
            style={{
              padding: "16px 0 24px",
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            Đang tải thêm...
          </div>
        )}

        {/* End-of-feed marker */}
        {moments.length > 0 && canPaginate && !hasMore && !isLoadingMore && (
          <div
            style={{
              padding: "16px 0 32px",
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            Bạn đã xem hết
          </div>
        )}
      </div>

      {/* Feed-only side buttons flanking the nav pill (Locket layout):
          Grid (left) → gallery, Share (right) → share sheet for the active
          moment. Hidden while the feed is empty/loading. */}
      {moments.length > 0 && (
        <>
          <button
            onClick={() => navigate("/grid")}
            aria-label="Lưới"
            style={{
              position: "absolute",
              bottom: 22,
              left: 16,
              width: 46,
              height: 46,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(30,30,32,0.78)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
              zIndex: 30,
            }}
          >
            <LayoutGrid size={22} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Chia sẻ"
            style={{
              position: "absolute",
              bottom: 22,
              right: 16,
              width: 46,
              height: 46,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(30,30,32,0.78)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
              zIndex: 30,
            }}
          >
            <Share2 size={22} />
          </button>
        </>
      )}

      <BottomNav />

      {/* Share sheet for the active moment (feed-only) */}
      <MomentShareSheet
        open={shareOpen}
        moment={activeMoment}
        meUid={meUid}
        onClose={() => setShareOpen(false)}
      />

      {/* Reply overlay — friend's moment message bar opens this */}
      <ReplyOverlay
        moment={replyMoment}
        authorName={
          replyMoment
            ? resolveAuthor({
                ownerUid: getMomentOwnerUid(replyMoment),
                friendsByUid,
                meUid,
                me: user,
              }).name
            : ""
        }
        image={replyMoment ? getMomentImage(replyMoment) : null}
        onClose={() => setReplyMoment(null)}
      />

      {/* Profile sheet — opened from avatar (top-right) */}
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Emoji picker — opened from "+" button on friend's message bar.
          EmojiStudio owns the network call (sendReactionOnMoment) + its own
          success/error toasts; we just track the open state and clear it after. */}
      <EmojiStudio
        open={!!emojiPickerMoment}
        momentUid={emojiPickerMoment?.id ?? null}
        onClose={() => setEmojiPickerMoment(null)}
        onSent={handleEmojiStudioSent}
      />

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
                <Avatar src={r.user?.avatar || r.user?.profilePic} name={r.user?.name || r.user?.firstName} size={40} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {r.user?.name || r.user?.firstName || "Người dùng"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {r.time || ""}
                  </span>
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
