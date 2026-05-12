import { useEffect, useRef, useState } from "react";
import {
  Ban,
  CircleEllipsis,
  Eye,
  EyeOff,
  Info,
  UserRoundX,
  X,
} from "lucide-react";
import { useFriendStoreV2 } from "@/stores";
import { SonnerInfo } from "@/components/ui/SonnerToast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/**
 * FriendItem — single friend row inside FriendList.
 *
 * Renders avatar + name + username on the left, and an info dropdown +
 * action menu (hide / delete / block) on the right. Confirmation modals
 * use lovekit's ConfirmDialog component (replacement for web ConfirmPoup).
 */
export default function FriendItem({ friend, onDelete, onHidden }) {
  const [openMenuUid, setOpenMenuUid] = useState(null);
  const [openInfoUid, setOpenInfoUid] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openHiddenModal, setOpenHiddenModal] = useState(false);
  const [openBlockModal, setOpenBlockModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);

  const menuRefs = useRef({});
  const infoRefs = useRef({});

  const friendRelationsMap = useFriendStoreV2((s) => s.friendRelationsMap);
  const relation = friendRelationsMap[friend.uid] || {};

  const isHidden = relation.hidden;
  const sharedHistoryOn = relation.sharedHistoryOn;
  const createdAt = relation.createdAt;

  const toggleMenu = (uid) =>
    setOpenMenuUid((prev) => (prev === uid ? null : uid));

  const toggleInfo = (uid) =>
    setOpenInfoUid((prev) => (prev === uid ? null : uid));

  // close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (openMenuUid) {
        const ref = menuRefs.current[openMenuUid];
        if (ref && !ref.contains(e.target)) setOpenMenuUid(null);
      }
      if (openInfoUid) {
        const ref = infoRefs.current[openInfoUid];
        if (ref && !ref.contains(e.target)) setOpenInfoUid(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuUid, openInfoUid]);

  const handleDelete = () => {
    if (selectedFriend?.uid) onDelete?.(selectedFriend.uid);
    setOpenDeleteModal(false);
  };

  const handleHidden = () => {
    if (selectedFriend?.uid) onHidden?.(relation, selectedFriend.uid);
    setOpenHiddenModal(false);
  };

  const handleBlock = () => {
    // Block feature is not implemented server-side yet
    SonnerInfo("Chậm một chút :))", "Tính năng đang được phát triển!");
    setOpenBlockModal(false);
  };

  const fullName = `${friend?.firstName || ""} ${friend?.lastName || ""}`.trim();

  return (
    <>
      <div className="flex items-center justify-between py-2">
        {/* LEFT */}
        <div className={`flex items-center gap-3 ${isHidden ? "opacity-60" : ""}`}>
          <Avatar friend={friend} />
          <div>
            <h2 className={`font-medium ${isHidden ? "text-gray-400" : ""}`}>
              {friend?.firstName} {friend?.lastName}
            </h2>
            <p className="text-sm text-base-content/60">
              @{friend?.username || "Không có username"}
            </p>
          </div>
          {isHidden && (
            <div className="flex items-center gap-1 text-sm">
              <EyeOff className="w-4 h-4" /> Hidden
            </div>
          )}
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-1">
          {/* INFO */}
          {!isHidden && (
            <div
              className="relative"
              ref={(el) => (infoRefs.current[friend.uid] = el)}
            >
              <button
                type="button"
                onClick={() => toggleInfo(friend.uid)}
                className="text-blue-500 p-2 rounded-full"
                aria-label="Thông tin bạn bè"
              >
                <Info className="w-5 h-5" />
              </button>
              <InfoDropdown
                open={openInfoUid === friend.uid}
                sharedHistoryOn={sharedHistoryOn}
                createdAt={createdAt}
              />
            </div>
          )}

          {/* MENU */}
          <div
            className="relative"
            ref={(el) => (menuRefs.current[friend.uid] = el)}
          >
            <button
              type="button"
              onClick={() => toggleMenu(friend.uid)}
              className="p-2 rounded-full"
              aria-label="Tuỳ chọn bạn bè"
            >
              {isHidden ? (
                <CircleEllipsis className="w-6 h-6" />
              ) : (
                <X className="w-6 h-6 text-red-500" />
              )}
            </button>
            <MenuDropdown
              open={openMenuUid === friend.uid}
              isHidden={isHidden}
              onHidden={() => {
                setSelectedFriend(friend);
                setOpenHiddenModal(true);
                setOpenMenuUid(null);
              }}
              onDelete={() => {
                setSelectedFriend(friend);
                setOpenDeleteModal(true);
                setOpenMenuUid(null);
              }}
              onBlock={() => {
                setSelectedFriend(friend);
                setOpenBlockModal(true);
                setOpenMenuUid(null);
              }}
            />
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      <ConfirmDialog
        open={openDeleteModal}
        title={`Bạn có chắc muốn xoá ${fullName}?`}
        message="Cả hai bạn sẽ không là bạn bè với nhau nữa. Hành động này không thể hoàn tác."
        confirmText="Xoá bạn"
        cancelText="Huỷ"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setOpenDeleteModal(false)}
      />

      {/* HIDDEN MODAL */}
      <ConfirmDialog
        open={openHiddenModal}
        title={
          isHidden ? `Bỏ ẩn ${fullName}?` : `Ẩn ${fullName}?`
        }
        message={
          isHidden
            ? "Bạn sẽ thấy lại Locket của họ và họ cũng sẽ xem được các Locket mới kể từ bây giờ."
            : "Bạn sẽ không còn thấy Locket của họ nữa. Họ sẽ không nhận được các Locket mới mà bạn đăng kể từ khi ẩn."
        }
        confirmText={isHidden ? "Bỏ ẩn" : "Ẩn"}
        cancelText="Huỷ"
        destructive={false}
        onConfirm={handleHidden}
        onCancel={() => setOpenHiddenModal(false)}
      />

      {/* BLOCK MODAL */}
      <ConfirmDialog
        open={openBlockModal}
        title={`Chặn ${fullName}?`}
        message="Họ sẽ không thể xem Locket của bạn, gửi tin nhắn, hoặc yêu cầu làm bạn của bạn. Hành động này không thể hoàn tác."
        confirmText="Chặn"
        cancelText="Huỷ"
        destructive
        onConfirm={handleBlock}
        onCancel={() => setOpenBlockModal(false)}
      />
    </>
  );
}

/* ---------------- Sub-components ---------------- */

function Avatar({ friend }) {
  return (
    <div className="relative w-16 h-16">
      <img
        src={friend?.profilePic || "/images/default_profile.png"}
        alt={`${friend?.firstName || ""} ${friend?.lastName || ""}`}
        className="w-16 h-16 rounded-full border-[3.5px] p-0.5 border-amber-400 object-cover"
        onError={(e) => {
          e.currentTarget.onerror = null; // prevent loop
          e.currentTarget.src = "/images/default_profile.png";
        }}
      />
      {friend?.badge === "locket_gold" ? (
        <img
          src="https://cdn.locket-dio.com/v1/caption/caption-icon/locket_gold_badge.png"
          alt="Gold Badge"
          className="absolute bottom-0 right-0 w-6 h-6 p-0.5 bg-base-100 rounded-full"
        />
      ) : friend?.isCelebrity ? (
        <img
          src="https://cdn.locket-dio.com/v1/caption/caption-icon/celebrity_badge.png"
          alt="Celebrity"
          className="absolute bottom-0 right-0 w-6 h-6 p-0.5 bg-base-100 rounded-full"
        />
      ) : null}
    </div>
  );
}

function InfoDropdown({ open, sharedHistoryOn, createdAt }) {
  return (
    <div
      className={`absolute z-50 right-0 -top-20 origin-bottom-right bg-base-200 shadow-lg rounded-xl p-3 text-sm w-56 transition-all duration-500 ${
        open
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <p>
        <span className="font-medium">Chia sẻ lịch sử:</span>{" "}
        {sharedHistoryOn
          ? new Date(sharedHistoryOn).toLocaleString("vi-VN")
          : "Không rõ"}
      </p>
      <p>
        <span className="font-medium">Kết bạn lúc:</span>{" "}
        {createdAt ? new Date(createdAt).toLocaleString("vi-VN") : "Không rõ"}
      </p>
    </div>
  );
}

function MenuDropdown({ open, isHidden, onHidden, onDelete, onBlock }) {
  return (
    <div
      className={`absolute -top-38 right-1 origin-bottom-right bg-base-300 shadow-xl rounded-xl w-48 p-2 flex flex-col gap-2 transition-all duration-300 z-50 ${
        open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={onHidden}
        className="btn w-full justify-between"
      >
        {isHidden ? "Bỏ ẩn bạn bè" : "Ẩn bạn bè"}
        {isHidden ? (
          <Eye className="w-5 h-5" />
        ) : (
          <EyeOff className="w-5 h-5" />
        )}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="btn w-full justify-between text-red-600"
      >
        Xoá bạn bè <UserRoundX className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={onBlock}
        className="btn w-full justify-between text-red-700"
      >
        Chặn bạn bè <Ban className="w-5 h-5" />
      </button>
    </div>
  );
}
