import { useState } from "react";
import { Search } from "lucide-react";
import NormalItemFriend from "./NormalItemFriend";
import CelebItemFriend from "./CelebItemFriend";
import {
  SonnerInfo,
  SonnerSuccess,
  SonnerWarning,
} from "@/components/ui/SonnerToast";
import {
  FindFriendByUserName,
  SendRequestToCelebrity,
  SendRequestToFriend,
} from "@/services";

/**
 * FindFriend
 * Username search panel with celebrity-vs-normal result rendering and
 * celebrity follow-request flow.
 */
const FindFriend = () => {
  const [loading, setLoading] = useState(false);
  const [searchTermFind, setSearchTermFind] = useState("");
  const [foundUser, setFoundUser] = useState(null);

  const handleFindFriend = async (username) => {
    if (!username) return;

    try {
      setLoading(true);
      const result = await FindFriendByUserName(username);

      if (result?.success === true) {
        setFoundUser(result.data);
      } else {
        setFoundUser(null);
        SonnerInfo("Người dùng không tồn tại");
      }
    } catch (error) {
      console.error("❌ Lỗi khi tìm bạn:", error);
      setFoundUser(null);
      SonnerInfo(error?.message || "Người dùng không tồn tại");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!foundUser) return;

    try {
      setLoading(true);

      if (foundUser?.celebrity === true) {
        await SendRequestToCelebrity(foundUser.uid);
        SonnerSuccess("Gửi lời mời thành công!");

        // refetch to refresh friendship_status
        await handleFindFriend(searchTermFind);
      } else {
        // Normal user: send a regular friend request via the Locket proxy.
        // Backend route added in Phase 01; envelope shape verified against
        // acceptFriendRequest/removeFriend (`{ data: { user_uid } }`).
        await SendRequestToFriend(foundUser.uid);
        SonnerSuccess("Đã gửi yêu cầu kết bạn!");

        // refetch so friendship_status reflects the new outgoing-request state
        await handleFindFriend(searchTermFind);
      }
    } catch (error) {
      console.error("❌ Lỗi gửi yêu cầu:", error);
      SonnerWarning(error?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const isCelebrity = foundUser?.celebrity === true;

  const onSubmit = (e) => {
    e.preventDefault();
    handleFindFriend(searchTermFind);
  };

  return (
    <div>
      <h2 className="flex items-center gap-2 text-md font-semibold mb-1">
        <Search size={22} /> Tìm kiếm ai đó?
      </h2>

      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          className="input input-bordered w-full rounded-xl text-base"
          placeholder="Thêm một người bạn mới..."
          value={searchTermFind}
          onChange={(e) => setSearchTermFind(e.target.value)}
        />

        {searchTermFind && (
          <button
            type="submit"
            disabled={loading}
            className="btn btn-base-200 text-base flex items-center gap-2 rounded-full"
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" /> Đợi tí
              </>
            ) : (
              "Tìm kiếm"
            )}
          </button>
        )}
      </form>

      <div className="w-full flex justify-center mt-2">
        {foundUser ? (
          isCelebrity ? (
            <CelebItemFriend
              friend={foundUser}
              handleAddFriend={handleAddFriend}
              loading={loading}
            />
          ) : (
            <NormalItemFriend
              friend={foundUser}
              handleAddFriend={handleAddFriend}
              loading={loading}
            />
          )
        ) : (
          <p className="text-gray-400 h-[70px] text-center">
            {loading ? "Đang tìm..." : "Không tìm thấy người dùng nào"}
          </p>
        )}
      </div>
    </div>
  );
};

export default FindFriend;
