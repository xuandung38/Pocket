import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SonnerError, SonnerSuccess } from "@/components/ui/SonnerToast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuthStore } from "@/stores";
import {
  getOutgoingRequestFriend,
  loadFriendDetailsV2,
  rejectFriendRequests,
} from "@/services";

/**
 * OutgoingRequest — list of pending friend requests sent by the current user.
 *
 * Auto-fetches when the Friends tab opens. Lets the user cancel an
 * outstanding request via rejectFriendRequests("outgoing").
 */
const OutgoingRequest = () => {
  const { navigation } = useApp();
  const { user } = useAuthStore();
  const { isFriendsTabOpen } = navigation;

  const [friends, setFriends] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [pendingCancelUid, setPendingCancelUid] = useState(null);
  const [pendingCancelName, setPendingCancelName] = useState("");

  useEffect(() => {
    if (isFriendsTabOpen) {
      setFriends([]);
      setNextPageToken(null);
      setShowAllFriends(false);
      setErrorMessage(null);
      fetchFriendRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFriendsTabOpen]);

  const fetchFriendRequests = async (pageToken = null) => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getOutgoingRequestFriend(pageToken);
      if (result?.errorMessage) {
        setErrorMessage(result.errorMessage);
      } else {
        const friendDetails = await loadFriendDetailsV2(result?.friends);
        setFriends((prev) => [...prev, ...friendDetails]);
        setNextPageToken(result?.nextPageToken || null);
      }
    } catch (error) {
      console.error("Lỗi khi tải yêu cầu đã gửi:", error);
      setErrorMessage(error?.message || "Không tải được yêu cầu đã gửi");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = (uid, name) => {
    setPendingCancelUid(uid);
    setPendingCancelName(name);
  };

  const handleConfirmCancel = async () => {
    const uid = pendingCancelUid;
    const name = pendingCancelName;
    setPendingCancelUid(null);
    try {
      await rejectFriendRequests(uid, "outgoing");
      SonnerSuccess(
        "Huỷ yêu cầu thành công",
        `Bạn đã huỷ yêu cầu kết bạn tới ${name}`,
      );
      setFriends((prev) => prev.filter((f) => f.uid !== uid));
    } catch (error) {
      console.error("Lỗi khi huỷ yêu cầu:", error);
      SonnerError("Có lỗi xảy ra khi huỷ yêu cầu. Vui lòng thử lại!");
    }
  };

  const visibleFriends = showAllFriends ? friends : friends.slice(0, 3);

  return (
    <>
    <ConfirmDialog
      open={!!pendingCancelUid}
      title="Huỷ yêu cầu kết bạn?"
      message={`Bạn có muốn huỷ yêu cầu kết bạn tới ${pendingCancelName}?`}
      onConfirm={handleConfirmCancel}
      onCancel={() => setPendingCancelUid(null)}
    />
    <div>
      <h2 className="flex flex-row items-center gap-2 text-base-content font-semibold text-md lg:text-xl mb-3">
        <CheckCircle2 size={22} /> Yêu cầu đã gửi
      </h2>
      <div className="text-xs text-base-content/60 mt-1 w-full"></div>

      {loading && friends.length === 0 ? (
        <p className="text-center text-base-content/50 h-[70px]">Đang tải...</p>
      ) : errorMessage ? (
        <p className="text-center text-red-500 h-[70px]">{errorMessage}</p>
      ) : friends.length === 0 ? (
        <p className="text-center text-base-content/50 h-[70px]">
          Không tìm thấy ai!!
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {visibleFriends.map((friend) => (
              <div
                key={friend.uid}
                className="flex items-center gap-3 rounded-md justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.profilePic || "/images/default_profile.png"}
                    alt={`${friend.firstName || ""} ${friend.lastName || ""}`}
                    className="w-16 h-16 rounded-full border-[3.5px] p-0.5 border-amber-400 object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/default_profile.png";
                    }}
                  />
                  <div>
                    <h2 className="font-medium">
                      {friend.firstName} {friend.lastName}
                    </h2>
                    <p className="text-sm text-base-content/60 underline">
                      @{friend.username || "Không có username"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex flex-row justify-center p-1 px-2.5 rounded-full transition shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelRequest(friend.uid, friend.firstName);
                  }}
                  aria-label="Huỷ yêu cầu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>

          {(friends.length > 3 || nextPageToken) && (
            <div className="flex items-center gap-4 mt-4">
              <hr className="flex-grow border-t border-base-content/30" />
              <button
                type="button"
                onClick={async () => {
                  if (!showAllFriends) {
                    setShowAllFriends(true);
                  } else if (nextPageToken) {
                    await fetchFriendRequests(nextPageToken);
                  }
                }}
                className="bg-base-200 hover:bg-base-300 text-base-content font-semibold px-4 py-2 transition-colors rounded-3xl"
              >
                {nextPageToken
                  ? "Xem thêm"
                  : showAllFriends
                    ? "Đã hiện hết"
                    : "Xem thêm"}
              </button>
              <hr className="flex-grow border-t border-base-content/30" />
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
};

export default OutgoingRequest;
