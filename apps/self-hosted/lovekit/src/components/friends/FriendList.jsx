import { useState } from "react";
import { Loader2, RefreshCcw, Users } from "lucide-react";
import {
  SonnerError,
  SonnerSuccess,
  SonnerWarning,
} from "@/components/ui/SonnerToast";
import { removeFriend, toggleHiddenFriend } from "@/services";
import FriendItem from "./FriendItem";

/**
 * FriendList — searchable, refreshable list of the current user's friends.
 *
 * Receives data and mutators from parent (FriendsSheet container). Handles
 * local UI concerns: search, show-all toggle, refresh, delete + hide flows.
 * Replaces the web SearchInput / LoadingRing with lovekit-native primitives.
 */
const FriendList = ({
  friendList = [],
  loading = false,
  loadFriends,
  removeFriendLocal,
  hiddenUserState,
  showAllFriends,
  setShowAllFriends,
}) => {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleRefreshFriends = async () => {
    try {
      await loadFriends?.();
      const updatedAt = new Date().toISOString();
      localStorage.setItem("friendsUpdatedAt", updatedAt);
      setLastUpdated(updatedAt);
      SonnerSuccess("Cập nhật thành công", "Đã làm mới danh sách bạn bè!");
    } catch (error) {
      console.error("Lỗi khi làm mới bạn bè:", error);
      SonnerError("Có lỗi xảy ra khi làm mới danh sách.");
    }
  };

  const handleDeleteFriend = async (uid) => {
    try {
      const result = await removeFriend(uid);
      if (result === uid) {
        await removeFriendLocal?.(uid);
        SonnerSuccess("Đã xoá bạn thành công.");
      } else {
        SonnerWarning("Vui lòng thử lại sau!");
      }
    } catch (error) {
      console.error("Lỗi khi xoá bạn:", error);
      SonnerError("Có lỗi xảy ra khi xoá bạn.");
    }
  };

  const handleHiddenFriend = async (relation, uid) => {
    if (!relation) return;

    const prevHidden = relation.hidden ?? false;
    await hiddenUserState?.(uid, !prevHidden);

    try {
      const res = await toggleHiddenFriend(uid);
      if (!res?.success) throw new Error("toggle failed");
      SonnerSuccess("Đã cập nhật trạng thái!");
    } catch {
      await hiddenUserState?.(uid, prevHidden);
      SonnerError("Không thể cập nhật trạng thái");
    }
  };

  // Filter friends by name/username (case-insensitive)
  const filteredFriends = (friendList || []).filter((friend) => {
    const fullName = `${friend?.firstName || ""} ${friend?.lastName || ""}`.toLowerCase();
    const username = (friend?.username || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || username.includes(term);
  });

  const visibleFriends = showAllFriends
    ? filteredFriends
    : filteredFriends.slice(0, 3);

  return (
    <div>
      <h1 className="flex items-center gap-2 font-semibold text-md mb-1">
        <Users size={22} className="scale-x-[-1]" /> Bạn bè của bạn
      </h1>

      {/* Search + refresh */}
      <div className="flex gap-2 items-center mt-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm bạn bè..."
          className="input input-bordered w-full rounded-xl text-base"
        />
        <button
          type="button"
          className={`btn btn-base-200 text-sm flex items-center gap-2 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleRefreshFriends}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang làm mới...</span>
            </>
          ) : (
            <>
              <RefreshCcw className="w-5 h-5" />
              <span>Làm mới</span>
            </>
          )}
        </button>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-xs text-base-content/60 mt-1">
          Cập nhật lần cuối: {new Date(lastUpdated).toLocaleString("vi-VN")}
        </p>
      )}

      {/* List */}
      <div className="mt-4">
        {filteredFriends.length === 0 && (
          <p className="text-base-content/50 text-center mt-10">
            Không có bạn bè để hiển thị
          </p>
        )}

        {visibleFriends.map((friend) => (
          <FriendItem
            key={friend.uid}
            friend={friend}
            onDelete={handleDeleteFriend}
            onHidden={handleHiddenFriend}
          />
        ))}

        {filteredFriends.length > 3 && (
          <div className="flex items-center gap-4 mt-4">
            <hr className="flex-grow border-t border-base-content/30" />
            <button
              type="button"
              onClick={() => setShowAllFriends?.(!showAllFriends)}
              className="bg-base-200 hover:bg-base-300 text-base-content font-semibold px-4 py-2 rounded-3xl"
            >
              {showAllFriends ? "Thu gọn" : "Xem thêm"}
            </button>
            <hr className="flex-grow border-t border-base-content/30" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList;
