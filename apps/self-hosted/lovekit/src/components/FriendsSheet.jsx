import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useFriendStoreV2 } from "@/stores";
import { AcceptRequestToFriend } from "@/services/LocketServices/friend.services";
import { SonnerError, SonnerSuccess } from "@/components/ui/SonnerToast";
import FindFriend from "@/components/friends/FindFriend";
import FriendList from "@/components/friends/FriendList";
import IncomingFriendRequests from "@/components/friends/IncomingRequests";
import OutgoingRequest from "@/components/friends/OutgoingRequest";

/**
 * FriendsSheet
 * Top-level bottom-sheet container for friend management:
 *   - FindFriend (search + add)
 *   - FriendList (current friends)
 *   - IncomingFriendRequests / OutgoingRequest
 *
 * Visibility is controlled by `navigation.isFriendsTabOpen` from AppContext.
 */
const FriendsSheet = () => {
  const popupRef = useRef(null);
  const { navigation } = useApp();

  const {
    friendList,
    loading,
    loadFriends,
    removeFriendLocal,
    addFriendLocal,
    hiddenUserState,
    friendRelationsMap,
  } = useFriendStoreV2();

  const { isFriendsTabOpen, setFriendsTabOpen, isPWA } = navigation;
  const [showAllFriends, setShowAllFriends] = useState(false);

  // Lock body scroll while sheet is mounted (always open when this renders)
  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  const handleAcceptRequest = async (uid) => {
    try {
      const data = await AcceptRequestToFriend(uid);
      if (data) {
        addFriendLocal(data);
        SonnerSuccess(
          "Thông báo từ Locket Dio",
          `Đã chấp nhận ${data.firstName}`,
        );
      } else {
        SonnerError(
          "Thông báo từ Locket Dio",
          "Không tìm thấy lời mời để chấp nhận.",
        );
      }
    } catch (error) {
      console.error("❌ Lỗi khi chấp nhận lời mời:", error?.message || error);
      SonnerError("❌ Chấp nhận lời mời thất bại!");
    }
  };

  if (!isFriendsTabOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-base-100/10 backdrop-blur-[2px] bg-opacity-50 z-40"
        onClick={() => {
          setFriendsTabOpen(false);
          setShowAllFriends(false);
        }}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex justify-center items-end text-base-content">
        <div
          ref={popupRef}
          className={`relative w-full ${isPWA ? "h-[95dvh]" : "h-[85dvh]"}
            bg-base-100 flex flex-col rounded-t-4xl shadow-lg
            will-change-transform z-50`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Header */}
          <div className="sticky top-0 shadow-md z-10 flex flex-col items-center pb-2 px-3 bg-base-100 rounded-t-4xl">
            <div className="flex justify-between items-center w-full">
              <div className="w-12 h-1.5 bg-base-content rounded-full mx-auto my-2" />
              <button
                className="absolute top-2 right-3"
                onClick={() => setFriendsTabOpen(false)}
              >
                <X className="w-8 h-8 btn btn-circle p-1" />
              </button>
            </div>
            <h1 className="text-2xl font-semibold text-base-content">
              ❤️‍🔥 {friendList.length} người bạn
            </h1>
            <h2 className="text-md font-semibold text-base-content">
              Tìm kiếm và thêm bạn thân
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
            {/* Search */}
            <FindFriend />

            {/* Friend list */}
            <FriendList
              friendList={friendList}
              loading={loading}
              loadFriends={loadFriends}
              removeFriendLocal={removeFriendLocal}
              hiddenUserState={hiddenUserState}
              friendRelationsMap={friendRelationsMap}
              showAllFriends={showAllFriends}
              setShowAllFriends={setShowAllFriends}
            />

            {/* Requests */}
            <IncomingFriendRequests />
            <OutgoingRequest />
          </div>
        </div>
      </div>
    </>
  );
};

export default FriendsSheet;
