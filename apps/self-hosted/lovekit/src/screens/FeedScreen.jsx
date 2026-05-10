import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import MomentCard from "@/components/MomentCard";
import MomentViewer from "@/components/MomentViewer";
import { DeleteMoment } from "@/services/LocketServices";
import {
  useAuthStore,
  useFriendStore,
  useMomentsStoreV2,
} from "@/stores";

export default function FeedScreen({ className }) {
  const user = useAuthStore((s) => s.user);
  const fetchMoments = useMomentsStoreV2((s) => s.fetchMoments);
  const loadMoreOlder = useMomentsStoreV2((s) => s.loadMoreOlder);
  const removeMoment = useMomentsStoreV2((s) => s.removeMoment);
  const bucket = useMomentsStoreV2((s) => s.momentsByUser?.all);

  const friends = useFriendStore((s) => s.friendDetails);
  const loadFriends = useFriendStore((s) => s.loadFriends);

  const [viewerIndex, setViewerIndex] = useState(null);
  const sentinelRef = useRef(null);

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
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreOlder, moments.length]);

  const handleDeleted = async (id) => {
    await removeMoment(id, meUid);
    setViewerIndex(null);
  };

  const handleLongPress = async (moment) => {
    if (!moment?.id || moment.user !== meUid) return;
    if (!confirm("Xoá moment này?")) return;
    const deletedId = await DeleteMoment(moment.id);
    if (deletedId) await removeMoment(deletedId, meUid);
  };

  const isEmpty = !loading && moments.length === 0;

  return (
    <section
      role="tabpanel"
      aria-label="Feed"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
        <header className="flex items-center justify-between pt-1">
          <h1 className="text-xl font-bold text-base-content">Feed</h1>
          <span className="text-xs text-base-content/50">
            {moments.length} moments
          </span>
        </header>

        {loading && moments.length === 0 && <LoadingSkeleton variant="feed" count={3} />}

        {isEmpty && (
          <EmptyState
            icon={Sparkles}
            title="No moments yet"
            subtitle="When friends share, you'll see their warm moments here."
          />
        )}

        {moments.map((m, idx) => (
          <MomentCard
            key={m.id}
            moment={m}
            friend={friendMap[m.user]}
            isOwn={m.user === meUid}
            onOpen={() => setViewerIndex(idx)}
            onLongPress={handleLongPress}
          />
        ))}

        {moments.length > 0 && (
          <div ref={sentinelRef} className="h-12 flex items-center justify-center">
            {isLoadingMore && (
              <span className="loading loading-dots loading-md text-primary" />
            )}
            {!hasMore && !isLoadingMore && (
              <span className="text-xs text-base-content/40">
                You're all caught up
              </span>
            )}
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <MomentViewer
          moments={moments}
          initialIndex={viewerIndex}
          meUid={meUid}
          friendMap={friendMap}
          onClose={() => setViewerIndex(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}
