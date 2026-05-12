// incoming-requests.jsx
// Renders the list of pending incoming friend requests with Accept/Deny CTAs.
//
// Data source: `useFriendStoreV2`
//   - `pendingIn`     : { uid, createdAt }[] — uid-only list from the store
//   - `acceptRequest` : optimistic action (uid → bool)
//   - `denyRequest`   : optimistic action (uid → bool)
//   - `loadFriends`   : initial sync on first mount in case store is empty
//
// The store only carries uid + createdAt — UI needs first/last name + avatar,
// so we hydrate detailed records via fetchUserDetails locally and cache by uid
// to avoid refetching when pendingIn shrinks (after accept/deny).
//
// Per-row loading is tracked with a `busyUid` flag — only one in-flight call
// at a time to keep UX predictable on slow networks.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Star, X } from "lucide-react";
import { useFriendStoreV2 } from "@/stores";
import { fetchUserDetails } from "@/services/friend-services";
import {
  SonnerError,
  SonnerSuccess,
} from "@/components/ui/sonner-toast";

const DEFAULT_AVATAR = "/images/default_profile.png";
const VISIBLE_LIMIT = 3;

export default function IncomingRequests() {
  const pendingIn = useFriendStoreV2((s) => s.pendingIn);
  const acceptRequest = useFriendStoreV2((s) => s.acceptRequest);
  const denyRequest = useFriendStoreV2((s) => s.denyRequest);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const loadedOnce = useRef(false);

  // uid → normalized friend record. Persists across pendingIn changes so we
  // don't refetch the user record after the entry is removed.
  const [detailsByUid, setDetailsByUid] = useState({});
  const [hydrating, setHydrating] = useState(false);
  const [busyUid, setBusyUid] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // First-paint hydration — if the store is empty (e.g. tab opened cold),
  // trigger a sync so pendingIn populates.
  useEffect(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      loadFriends?.();
    }
  }, [loadFriends]);

  // Hydrate missing uid → user details whenever pendingIn changes.
  useEffect(() => {
    const missing = pendingIn.filter((r) => !detailsByUid[r.uid]);
    if (missing.length === 0) return;

    let cancelled = false;
    setHydrating(true);
    fetchUserDetails(missing)
      .then((users) => {
        if (cancelled) return;
        if (users?.length) {
          setDetailsByUid((prev) => {
            const next = { ...prev };
            for (const u of users) {
              if (u?.uid) next[u.uid] = u;
            }
            return next;
          });
        }
      })
      .catch((err) =>
        console.error("[IncomingRequests] hydrate failed:", err),
      )
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pendingIn, detailsByUid]);

  // Stable, ordered list of rows for rendering — uses store order so newest
  // first (matches loadFriends() result shape).
  const rows = useMemo(
    () => pendingIn.map((r) => detailsByUid[r.uid] ?? { uid: r.uid }),
    [pendingIn, detailsByUid],
  );

  const handleAccept = async (uid) => {
    if (busyUid) return;
    setBusyUid(uid);
    try {
      const ok = await acceptRequest(uid);
      if (ok) {
        SonnerSuccess("Đã chấp nhận lời mời kết bạn");
      } else {
        SonnerError("Không thể chấp nhận lời mời");
      }
    } catch (err) {
      console.error("[IncomingRequests] accept failed:", err);
      SonnerError("Chấp nhận lời mời thất bại");
    } finally {
      setBusyUid(null);
    }
  };

  const handleDeny = async (uid) => {
    if (busyUid) return;
    setBusyUid(uid);
    try {
      const ok = await denyRequest(uid);
      if (ok) {
        SonnerSuccess("Đã từ chối lời mời");
      } else {
        SonnerError("Không thể từ chối lời mời");
      }
    } catch (err) {
      console.error("[IncomingRequests] deny failed:", err);
      SonnerError("Từ chối lời mời thất bại");
    } finally {
      setBusyUid(null);
    }
  };

  const visibleRows = showAll ? rows : rows.slice(0, VISIBLE_LIMIT);
  const isEmpty = pendingIn.length === 0;

  return (
    <div>
      <h2 className="flex flex-row items-center gap-2 text-base-content font-semibold text-md lg:text-xl mb-3">
        <Star size={20} /> Lời mời kết bạn
      </h2>

      {hydrating && isEmpty ? (
        <p className="text-center text-base-content/50 h-[70px]">Đang tải...</p>
      ) : isEmpty ? (
        <p className="text-center text-base-content/50 h-[70px]">
          Chưa có lời mời kết bạn nào
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {visibleRows.map((friend) => (
              <RequestRow
                key={friend.uid}
                friend={friend}
                busy={busyUid === friend.uid}
                disabled={Boolean(busyUid) && busyUid !== friend.uid}
                onAccept={() => handleAccept(friend.uid)}
                onDeny={() => handleDeny(friend.uid)}
              />
            ))}
          </div>

          {rows.length > VISIBLE_LIMIT && (
            <div className="flex items-center gap-4 mt-4">
              <hr className="flex-grow border-t border-base-content/30" />
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="bg-base-200 hover:bg-base-300 text-base-content font-semibold px-4 py-2 transition-colors rounded-3xl"
              >
                {showAll ? "Thu gọn" : "Xem thêm"}
              </button>
              <hr className="flex-grow border-t border-base-content/30" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline row component — split out for readability + a tighter render scope.
function RequestRow({ friend, busy, disabled, onAccept, onDeny }) {
  const displayName = `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim();
  return (
    <div className="flex items-center gap-3 rounded-md justify-between">
      <div className="flex items-center gap-3">
        <img
          src={friend.profilePic || DEFAULT_AVATAR}
          alt={displayName || friend.username || friend.uid}
          className="w-16 h-16 rounded-full border-[3.5px] p-0.5 border-amber-400 object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_AVATAR;
          }}
        />
        <div>
          <h2 className="font-medium">{displayName || "Locket user"}</h2>
          <p className="text-sm text-base-content/60 underline">
            @{friend.username || "Không có username"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Chấp nhận"
          disabled={busy || disabled}
          onClick={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          className={`btn flex flex-row justify-center p-1 px-3 rounded-full transition shrink-0 ${
            busy || disabled
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-yellow-500 text-black"
          }`}
        >
          <Check className="w-5 h-5" strokeWidth={3} />
          <span className="text-base font-semibold">
            {busy ? "Đang xử lý..." : "Chấp nhận"}
          </span>
        </button>
        <button
          type="button"
          aria-label="Từ chối"
          disabled={busy || disabled}
          onClick={(e) => {
            e.stopPropagation();
            onDeny();
          }}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-base-200 text-base-content disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
