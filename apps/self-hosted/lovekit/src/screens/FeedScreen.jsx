import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import FriendAvatar from "@/components/FriendAvatar";
import MomentSlideActions from "@/components/MomentSlideActions";
import { formatTimeAgo } from "@/utils";
import { useAuthStore, useMomentsStoreV2 } from "@/stores";
import { useFriendStoreV2 } from "@/stores/friendStore";

const TOUCH_PULL_THRESHOLD = 60;

// Resolve the owning user's uid for a moment.
// Backend / cache may use any of these field names, so check all.
const getMomentOwnerUid = (m) => m?.user ?? m?.userUid ?? m?.owner;

function MomentSlide({ moment, friend, isOwn }) {
  const fullName =
    [friend?.firstName, friend?.lastName].filter(Boolean).join(" ").trim() ||
    (isOwn ? "Bạn" : "Người dùng");

  const thumb =
    moment?.thumbnailUrl || moment?.thumbnail_url || moment?.image_url;
  const video = moment?.videoUrl || moment?.video_url;
  const avatar = friend?.profilePic ?? friend?.profile_picture_url;
  const caption = moment?.caption;
  const when = moment?.date || moment?.createTime;
  const ownerUid = getMomentOwnerUid(moment);

  // Per-slide video ref + IntersectionObserver: only the visible slide plays.
  // Prevents all <video> elements from autoplaying simultaneously (perf).
  const videoRef = useRef(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          // play() returns a promise that may reject (e.g. autoplay policy);
          // swallow to avoid unhandled-promise warnings.
          const p = el.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [video]);

  return (
    <div
      className="relative w-full bg-black flex-shrink-0"
      style={{ height: "100dvh", scrollSnapAlign: "start" }}
    >
      {video ? (
        <video
          ref={videoRef}
          src={video}
          poster={thumb}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : thumb ? (
        <img
          src={thumb}
          alt={caption || "Moment"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
          No preview
        </div>
      )}

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent pointer-events-none h-32" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent pointer-events-none h-40" />

      <div
        className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center gap-2.5 max-w-[70%]">
          <FriendAvatar src={avatar} name={fullName} size="md" />
          <div className="flex flex-col text-white drop-shadow-md min-w-0">
            <span className="font-semibold text-sm truncate">
              {isOwn ? "Bạn" : fullName}
            </span>
          </div>
        </div>
        {when && (
          <span className="text-white/80 text-xs drop-shadow-md mt-2">
            {formatTimeAgo(when)}
          </span>
        )}
      </div>

      {caption && (
        <div className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] px-3 py-2 rounded-2xl bg-black/45 backdrop-blur-sm text-white text-sm text-center">
          {caption}
        </div>
      )}

      <MomentSlideActions momentId={moment?.id} ownerUid={ownerUid} />
    </div>
  );
}

export default function FeedScreen({ className, onBack }) {
  const user = useAuthStore((s) => s.user);
  const fetchMoments = useMomentsStoreV2((s) => s.fetchMoments);
  const loadMoreOlder = useMomentsStoreV2((s) => s.loadMoreOlder);
  const bucket = useMomentsStoreV2((s) => s.momentsByUser?.all);

  const friends = useFriendStoreV2((s) => s.friendList);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const friendMap = useFriendStoreV2((s) => s.friendDetailsMap);

  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const touchStartY = useRef(null);

  const moments = bucket?.items ?? [];
  const loading = bucket?.loading ?? false;
  const hasMore = bucket?.hasMore ?? true;
  const isLoadingMore = bucket?.isLoadingMore ?? false;

  const meUid = user?.uid || user?.localId || null;

  // Fetch moments only when the authed user changes — avoid refetching when
  // friend list mutates. (Zustand actions are stable refs.)
  useEffect(() => {
    if (!user) return;
    fetchMoments(user, null);
  }, [user, fetchMoments]);

  // Load friends only if missing — separate effect so it doesn't re-trigger
  // moments fetch when `friends.length` flips from 0 → N.
  useEffect(() => {
    if (!user) return;
    if (!friends?.length) loadFriends?.();
  }, [user, friends?.length, loadFriends]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          loadMoreOlder(null);
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreOlder, moments.length]);

  const handleTouchStart = (e) => {
    const c = containerRef.current;
    if (!c) return;
    if (c.scrollTop <= 0) {
      touchStartY.current = e.touches?.[0]?.clientY ?? null;
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current == null) return;
    const endY = e.changedTouches?.[0]?.clientY ?? touchStartY.current;
    const dy = endY - touchStartY.current;
    touchStartY.current = null;
    const c = containerRef.current;
    if (!c || c.scrollTop > 0) return;
    if (dy > TOUCH_PULL_THRESHOLD) onBack?.();
  };

  const isEmpty = !loading && moments.length === 0;

  return (
    <section
      ref={containerRef}
      role="tabpanel"
      aria-label="Feed"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={clsx("absolute inset-0 overflow-y-scroll bg-black", className)}
      style={{
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "contain",
      }}
    >
      {loading && moments.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSkeleton variant="feed" count={1} />
        </div>
      )}

      {isEmpty && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-base-100"
          style={{ scrollSnapAlign: "start", height: "100dvh" }}
        >
          <EmptyState
            icon={Sparkles}
            title="Chưa có khoảnh khắc"
            subtitle="Khi bạn bè chia sẻ, bạn sẽ thấy ở đây."
          />
        </div>
      )}

      {moments.map((m) => {
        const ownerUid = getMomentOwnerUid(m);
        return (
          <MomentSlide
            key={m.id}
            moment={m}
            friend={ownerUid ? friendMap[ownerUid] : null}
            isOwn={ownerUid === meUid}
          />
        );
      })}

      {moments.length > 0 && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center text-white/60 text-xs"
          style={{ height: "1px" }}
          aria-hidden="true"
        />
      )}

      {moments.length > 0 && isLoadingMore && (
        <div
          className="flex items-center justify-center text-white/70 text-xs py-4"
          style={{ height: "48px" }}
        >
          <span className="loading loading-dots loading-md" />
        </div>
      )}

      {moments.length > 0 && !hasMore && !isLoadingMore && (
        <div
          className="flex items-center justify-center text-white/50 text-xs py-4"
          style={{ height: "48px" }}
        >
          Bạn đã xem hết
        </div>
      )}
    </section>
  );
}
