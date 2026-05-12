// normal-item-friend.jsx
// Displays a single non-celebrity user row inside the FindFriend results panel.
//
// Rendering rules — driven by `friend.friendship_status`:
//   - `friends`                 → static "Bạn bè" pill
//   - `outgoing-request` /
//     `outgoing-friend-request` → static "Đã gửi" pill (request already sent)
//   - everything else (`null`/`none`/`incoming-request`)
//                               → primary "Thêm" CTA wired to onAdd
//
// `loading` is forwarded by the parent during an in-flight send and disables
// the CTA to guard against double-submits.

import { Plus, UserRoundCheck } from "lucide-react";

export default function NormalItemFriend({ friend, onAdd, loading = false }) {
  if (!friend) return null;

  const status = friend.friendship_status ?? null;
  const displayName = `${friend.first_name ?? ""} ${friend.last_name ?? ""}`.trim();
  const avatarSrc = friend.profile_picture_url || "/images/default_profile.png";

  return (
    <div
      key={friend.uid}
      className="flex w-full items-center gap-3 space-y-2 rounded-md justify-between"
    >
      <div className="flex items-center gap-3">
        <img
          src={avatarSrc}
          alt={displayName || friend.username || friend.uid}
          className="w-16 h-16 rounded-full border-[3.5px] p-0.5 border-amber-400 object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/default_profile.png";
          }}
        />
        <div>
          <h2 className="font-medium">{displayName || "Locket user"}</h2>
          <p className="text-sm text-gray-500 underline">
            @{friend.username || "Không có username"}
          </p>
        </div>
      </div>

      <FriendActionButton status={status} loading={loading} onAdd={onAdd} />
    </div>
  );
}

// Inline subcomponent — kept here because it's only meaningful inside the row.
function FriendActionButton({ status, loading, onAdd }) {
  if (status === "friends") {
    return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-content font-semibold">
        <UserRoundCheck className="w-5 h-5" />
        Bạn bè
      </div>
    );
  }

  if (status === "outgoing-request" || status === "outgoing-friend-request") {
    return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-base-200 text-base-content font-semibold">
        Đã gửi
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation();
        if (loading) return;
        onAdd?.();
      }}
      className={`btn flex flex-row justify-center p-1 px-3 rounded-full transition shrink-0 ${
        loading
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-yellow-500 text-black"
      }`}
    >
      <Plus className="w-5 h-5" strokeWidth={3} />
      <span className="text-base font-semibold">
        {loading ? "Đang gửi..." : "Thêm"}
      </span>
    </button>
  );
}
