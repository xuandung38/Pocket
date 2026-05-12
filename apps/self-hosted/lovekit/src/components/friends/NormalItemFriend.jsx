import React from "react";
import { Plus, UserRoundCheck } from "lucide-react";

/**
 * NormalItemFriend
 * Displays a non-celebrity user found via FindFriend search.
 * Renders the contextual action button based on `friendship_status`:
 *   - `friends`            → static "Bạn bè" badge
 *   - `outgoing-request`   → static "Đã gửi" badge
 *   - `incoming-request`   → CTA labelled "Chấp nhận" (still fires onAdd; parent decides)
 *   - default              → primary "Thêm" CTA wired to `handleAddFriend`
 *
 * `loading` is forwarded by the parent during an in-flight request and
 * disables the CTA to prevent double-submits.
 */
export default function NormalItemFriend({ friend, handleAddFriend, loading }) {
  return (
    <div
      key={friend.uid}
      className="flex w-full items-center gap-3 space-y-2 rounded-md justify-between"
    >
      <div className="flex items-center gap-3">
        <img
          src={friend.profile_picture_url || "./default-avatar.png"}
          alt={`${friend?.first_name} ${friend?.last_name}`}
          className="w-16 h-16 rounded-full border-[3.5px] p-0.5 border-amber-400 object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "./default-avatar.png";
          }}
        />
        <div>
          <h2 className="font-medium">
            {friend?.first_name} {friend?.last_name}
          </h2>
          <p className="text-sm text-gray-500 underline">
            @{friend.username || "Không có username"}
          </p>
        </div>
      </div>

      <FriendActionButton
        status={friend?.friendship_status}
        loading={loading}
        onAdd={handleAddFriend}
      />
    </div>
  );
}

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
