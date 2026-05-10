import clsx from "clsx";
import { useEffect, useMemo, useRef } from "react";
import { Sparkles } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import FriendAvatar from "@/components/FriendAvatar";
import EmojiReactionBar from "@/components/EmojiReactionBar";
import { formatTimeAgo } from "@/utils";
import {
  useAuthStore,
  useFriendStore,
  useMomentsStoreV2,
} from "@/stores";

const TOUCH_PULL_THRESHOLD = 60;

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

  return (
    <div
      className="relative w-full bg-black flex-shrink-0"
      style={{ height: "100dvh", scrollSnapAlign: "start" }}
    >
      {video ? (
        <video
          src={video}
          poster={thumb}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
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

      <div
        className="absolute left-0 right-0 bottom-0 px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <EmojiReactionBar
          momentId={moment?.id}
          size="lg"
          className="bg-white/15 backdrop-blur-md"
        />
      </div>
    </div>
  );
}

export default function FeedScreen({ className, onBack }) {
  const user = useAuthStore((s) => s.user);
  const fetchMoments = useMomentsStoreV2((s) => s.fetchMoments);
  const loadMoreOlder = useMomentsStoreV2((s) => s.loadMoreOlder);
  const bucket = useMomentsStoreV2((s) => s.momentsByUser?.all);

  const friends = useFriendStore((s) => s.friendDetails);
  const loadFriends = useFriendStore((s) => s.loadFriends);

  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const touchStartY = useRef(null);

  const moments = bucket?.items ?? [];
  const loading = bucket?.loading ?? false;
  const hasMore = bucket?.hasMore ?? true;
  const isLoadingMore = bucket?.isLoadingMore ?? false;

  const friendMap = useMemo(() => {
    const map = {};
    for (const f of friends ?? []) {
      if (f?.uid) map[f.uid] = f;
    }
    return map;
  }, [friends]);

  const meUid = user?.uid || user?.localId || null;

  useEffect(() => {
    if (!user) return;
    fetchMoments(user, null);
    if (!friends?.length) loadFriends?.();
  }, [user, fetchMoments, loadFriends, friends?.length]);

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

      {moments.map((m) => (
        <MomentSlide
          key={m.id}
          moment={m}
          friend={friendMap[m.user]}
          isOwn={m.user === meUid}
        />
      ))}

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
