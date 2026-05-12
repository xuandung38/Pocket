// friend-moment-row.jsx
// Horizontal scroller of friend avatars rendered at the top of the feed.
// Each avatar gets a yellow ring when that friend has a recent moment in the
// in-memory store. Tapping an avatar invokes `onSelectFriend(uid)` so the
// parent (feed-screen) can switch the audience filter to that friend.
//
// Why a thin component (instead of bundling into feed-screen):
//   - Mirrors lovekit's FriendMomentRow port for Phase 4 spec parity.
//   - Keeps feed-screen focused on the snap-scroller / cards.
//   - Easy to drop into other surfaces (e.g. memories, activity) later.

import { useMemo } from "react";
import Avatar from "./ui/avatar";
import { useFriendStoreV2, useMomentsStoreV2 } from "@/stores";

// Pick the most-recent moment for a given uid out of the store's map.
// `createTime`, `date` (epoch ms or ISO), or falsy values are all tolerated;
// we sort numerically by best-effort timestamp and return the head.
function pickLatestForUid(momentsMap, uid) {
  if (!momentsMap || !uid) return null;
  let best = null;
  let bestTs = -Infinity;
  for (const m of Object.values(momentsMap)) {
    const owner = m?.user ?? m?.userUid ?? m?.owner;
    if (owner !== uid) continue;
    const ts = Number(m?.createTime ?? Date.parse(m?.date ?? "")) || 0;
    if (ts >= bestTs) {
      bestTs = ts;
      best = m;
    }
  }
  return best;
}

// Display name fallback chain — backend friend records use firstName/lastName,
// but legacy mocks may pass `name`. Empty → uid → "?".
function getDisplayName(friend) {
  const composed = [friend?.firstName, friend?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return composed || friend?.name || friend?.username || friend?.uid || "?";
}

export default function FriendMomentRow({ className = "", onSelectFriend }) {
  const friends = useFriendStoreV2((s) => s.friends);
  const momentsMap = useMomentsStoreV2((s) => s.moments);

  // Map each friend uid → their latest moment (or null). Memoized on the two
  // inputs so we don't rescan moments on every parent re-render.
  const latestByUid = useMemo(() => {
    const out = {};
    for (const f of friends ?? []) {
      if (!f?.uid) continue;
      out[f.uid] = pickLatestForUid(momentsMap, f.uid);
    }
    return out;
  }, [friends, momentsMap]);

  if (!friends?.length) return null;

  return (
    <div
      className={className}
      style={{
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        padding: "8px 0",
        flexShrink: 0,
      }}
      role="list"
      aria-label="Bạn bè có khoảnh khắc mới"
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "0 16px",
          touchAction: "pan-x",
        }}
      >
        {friends.map((friend) => {
          const hasMoment = Boolean(latestByUid[friend.uid]);
          const name = getDisplayName(friend);
          return (
            <button
              key={friend.uid}
              type="button"
              onClick={() => onSelectFriend?.(friend.uid)}
              role="listitem"
              aria-label={
                hasMoment
                  ? `${name} — có khoảnh khắc mới`
                  : `${name}`
              }
              style={{
                flexShrink: 0,
                background: "none",
                border: "none",
                padding: hasMoment ? 2 : 0,
                borderRadius: "50%",
                cursor: "pointer",
                // Yellow ring when the friend has a fresh moment, transparent
                // otherwise so the row stays visually quiet for inactive uids.
                boxShadow: hasMoment
                  ? "inset 0 0 0 2px var(--accent-yellow, #f5a623)"
                  : "none",
                transition: "transform 120ms",
              }}
            >
              <Avatar src={friend.profilePic} name={name} size={48} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
