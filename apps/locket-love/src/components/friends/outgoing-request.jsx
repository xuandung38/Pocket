// outgoing-request.jsx
// Renders the list of pending outgoing friend requests with a Cancel CTA.
//
// Data source: `useFriendStoreV2`
//   - `pendingOut`     : { uid, createdAt }[] — uid-only from the store
//   - `cancelRequest`  : optimistic action (uid → bool)
//   - `loadFriends`    : initial sync on first mount in case store is empty
//
// User-detail hydration mirrors incoming-requests.jsx — fetch on first sight,
// cache by uid in local state. No ConfirmDialog component exists in
// locket-love yet, so we use the native `window.confirm` to gate cancellation
// (acceptable for v1; replace with a styled dialog when one ships).

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useFriendStoreV2 } from "@/stores";
import { fetchUserDetails } from "@/services/friend-services";
import {
  SonnerError,
  SonnerSuccess,
} from "@/components/ui/sonner-toast";

const DEFAULT_AVATAR = "/images/default_profile.png";
const VISIBLE_LIMIT = 3;

export default function OutgoingRequest() {
  const pendingOut = useFriendStoreV2((s) => s.pendingOut);
  const cancelRequest = useFriendStoreV2((s) => s.cancelRequest);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const loadedOnce = useRef(false);

  const [detailsByUid, setDetailsByUid] = useState({});
  const [hydrating, setHydrating] = useState(false);
  const [busyUid, setBusyUid] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      loadFriends?.();
    }
  }, [loadFriends]);

  useEffect(() => {
    const missing = pendingOut.filter((r) => !detailsByUid[r.uid]);
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
        console.error("[OutgoingRequest] hydrate failed:", err),
      )
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pendingOut, detailsByUid]);

  const rows = useMemo(
    () => pendingOut.map((r) => detailsByUid[r.uid] ?? { uid: r.uid }),
    [pendingOut, detailsByUid],
  );

  const handleCancel = async (uid, name) => {
    if (busyUid) return;
    // Native confirm — temporary until locket-love ships a styled dialog.
    const ok = typeof window !== "undefined"
      ? window.confirm(`Bạn có muốn huỷ yêu cầu kết bạn tới ${name || "người này"}?`)
      : true;
    if (!ok) return;

    setBusyUid(uid);
    try {
      const success = await cancelRequest(uid);
      if (success) {
        SonnerSuccess(
          "Huỷ yêu cầu thành công",
          `Bạn đã huỷ yêu cầu kết bạn tới ${name || "người dùng"}`,
        );
      } else {
        SonnerError("Có lỗi xảy ra khi huỷ yêu cầu. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("[OutgoingRequest] cancel failed:", err);
      SonnerError("Có lỗi xảy ra khi huỷ yêu cầu. Vui lòng thử lại!");
    } finally {
      setBusyUid(null);
    }
  };

  const visibleRows = showAll ? rows : rows.slice(0, VISIBLE_LIMIT);
  const isEmpty = pendingOut.length === 0;

  return (
    <div>
      <h2 className="flex flex-row items-center gap-2 text-base-content font-semibold text-md lg:text-xl mb-3">
        <CheckCircle2 size={22} /> Yêu cầu đã gửi
      </h2>

      {hydrating && isEmpty ? (
        <p className="text-center text-base-content/50 h-[70px]">Đang tải...</p>
      ) : isEmpty ? (
        <p className="text-center text-base-content/50 h-[70px]">
          Chưa có yêu cầu nào đã gửi
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {visibleRows.map((friend) => (
              <OutgoingRow
                key={friend.uid}
                friend={friend}
                busy={busyUid === friend.uid}
                disabled={Boolean(busyUid) && busyUid !== friend.uid}
                onCancel={() => handleCancel(friend.uid, friend.firstName)}
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

function OutgoingRow({ friend, busy, disabled, onCancel }) {
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
      <button
        type="button"
        aria-label="Huỷ yêu cầu"
        disabled={busy || disabled}
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-base-200 disabled:opacity-50"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}
