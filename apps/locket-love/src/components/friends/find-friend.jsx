// find-friend.jsx
// Username/phone search panel used inside the friends sheet.
//
// Flow:
//   1. User types → submit → POST /locket/getUserByData
//   2. Result rendered through <NormalItemFriend> regardless of celebrity flag
//      (the row component branches on friendship_status only).
//   3. "Thêm" CTA fires `handleAddFriend`, which calls either
//      SendRequestToFriend or SendRequestToCelebrity, then re-runs the search
//      so the row reflects the new friendship_status ("outgoing-request").
//
// `loading` is shared between the search button and the row's Add CTA — both
// disable while a network call is in flight to prevent duplicate writes.

import { useState } from "react";
import { Search } from "lucide-react";
import {
  findFriendByUserName,
  SendRequestToFriend,
  SendRequestToCelebrity,
} from "@/services/request-services";
import {
  SonnerInfo,
  SonnerSuccess,
  SonnerWarning,
} from "@/components/ui/sonner-toast";
import NormalItemFriend from "./normal-item-friend";

export default function FindFriend() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [foundUser, setFoundUser] = useState(null);

  // Run a username search. Resets foundUser on any error so the UI can swap to
  // the empty-state hint without flicker.
  const handleFindFriend = async (username) => {
    if (!username) return;
    setLoading(true);
    try {
      const result = await findFriendByUserName(username);
      if (result?.success === true && result.data) {
        setFoundUser(result.data);
      } else {
        setFoundUser(null);
        SonnerInfo("Người dùng không tồn tại");
      }
    } catch (err) {
      console.error("[FindFriend] search failed:", err);
      setFoundUser(null);
      SonnerInfo(err?.response?.data?.message || "Người dùng không tồn tại");
    } finally {
      setLoading(false);
    }
  };

  // Send a friend request to the currently shown user. Celebrity vs normal is
  // determined by `foundUser.celebrity` (mirrors lovekit semantics).
  const handleAddFriend = async () => {
    if (!foundUser?.uid) return;
    setLoading(true);
    try {
      if (foundUser.celebrity === true) {
        await SendRequestToCelebrity(foundUser.uid);
      } else {
        await SendRequestToFriend(foundUser.uid);
      }
      SonnerSuccess("Đã gửi yêu cầu kết bạn!");
      // Re-run the same search so friendship_status flips to outgoing-request.
      await handleFindFriend(searchTerm);
    } catch (err) {
      console.error("[FindFriend] send request failed:", err);
      SonnerWarning(
        err?.response?.data?.message || err?.message || "Gửi yêu cầu thất bại",
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleFindFriend(searchTerm);
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
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
          <NormalItemFriend
            friend={foundUser}
            onAdd={handleAddFriend}
            loading={loading}
          />
        ) : (
          <p className="text-gray-400 h-[70px] text-center">
            {loading ? "Đang tìm..." : "Không tìm thấy người dùng nào"}
          </p>
        )}
      </div>
    </div>
  );
}
