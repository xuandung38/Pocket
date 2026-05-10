import { useMemo, useState } from "react";
import clsx from "clsx";
import FriendAvatar from "@/components/FriendAvatar";
import MomentViewer from "@/components/MomentViewer";
import { useFriendStoreV2 } from "@/stores";
import { useMomentsStoreV2 } from "@/stores/useMomentsStoreV2";
import { useAuthStore } from "@/stores";

function pickLatestMoment(items) {
  if (!items?.length) return null;
  return [...items].sort((a, b) => (b.createTime || 0) - (a.createTime || 0))[0];
}

export default function FriendMomentRow({ className }) {
  const friendList = useFriendStoreV2((s) => s.friendList);
  const friendDetailsMap = useFriendStoreV2((s) => s.friendDetailsMap);
  const momentsByUser = useMomentsStoreV2((s) => s.momentsByUser);
  const user = useAuthStore((s) => s.user);

  const [viewer, setViewer] = useState(null); // { moments, initialIndex }

  const allBucket = momentsByUser?.all?.items ?? [];

  const meUid = user?.uid || user?.localId || null;

  const friendMomentMap = useMemo(() => {
    const map = {};
    for (const f of friendList || []) {
      if (!f?.uid) continue;
      const fromBucket = momentsByUser?.[f.uid]?.items;
      const fromAll = allBucket.filter((m) => (m.user || m.userUid) === f.uid);
      map[f.uid] = pickLatestMoment(fromBucket?.length ? fromBucket : fromAll);
    }
    return map;
  }, [friendList, momentsByUser, allBucket]);

  const handleOpen = (friend) => {
    const moment = friendMomentMap[friend.uid];
    if (!moment) return;
    setViewer({ moments: [moment], initialIndex: 0 });
  };

  return (
    <>
      <div
        className={clsx(
          "flex gap-3 px-4 py-2 overflow-x-auto",
          "[&::-webkit-scrollbar]:hidden",
          className,
        )}
        style={{ scrollbarWidth: "none" }}
        role="list"
        aria-label="Friend moments"
      >
        {(friendList || []).map((friend) => {
          const hasNewMoment = Boolean(friendMomentMap[friend.uid]);
          const fullName =
            [friend?.firstName, friend?.lastName].filter(Boolean).join(" ").trim() ||
            friend?.uid ||
            "?";
          return (
            <button
              key={friend.uid}
              type="button"
              onClick={() => handleOpen(friend)}
              className={clsx(
                "shrink-0 rounded-full transition-transform active:scale-95",
                hasNewMoment && "ring-2 ring-primary ring-offset-2 ring-offset-base-100",
              )}
              style={{ width: 52, height: 52 }}
              aria-label={`${fullName}${hasNewMoment ? " — has new moment" : ""}`}
              role="listitem"
            >
              <FriendAvatar
                src={friend?.profilePic}
                name={fullName}
                size="md"
                className="size-[52px]"
              />
            </button>
          );
        })}
      </div>

      {viewer && (
        <MomentViewer
          moments={viewer.moments}
          initialIndex={viewer.initialIndex}
          meUid={meUid}
          friendMap={friendDetailsMap}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
