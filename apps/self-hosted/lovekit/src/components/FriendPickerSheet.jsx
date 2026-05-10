import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Users, X } from "lucide-react";
import { useFriendStoreV2 } from "@/stores";

const Avatar = ({ friend }) => {
  const [errored, setErrored] = useState(false);
  const initials = (
    (friend?.firstName?.[0] || "") + (friend?.lastName?.[0] || "")
  ).toUpperCase() || "?";

  if (errored || !friend?.profilePic) {
    return (
      <div className="w-11 h-11 rounded-full bg-base-300 flex items-center justify-center text-sm font-semibold text-primary">
        {initials}
      </div>
    );
  }
  return (
    <img
      src={friend.profilePic}
      alt={friend.firstName || "friend"}
      onError={() => setErrored(true)}
      className="w-11 h-11 rounded-full object-cover"
    />
  );
};

export default function FriendPickerSheet({
  open,
  onClose,
  audience,
  selectedIds,
  onChange,
  onConfirm,
}) {
  const friendDetailsMap = useFriendStoreV2((s) => s.friendDetailsMap);
  const friends = useMemo(
    () =>
      Object.values(friendDetailsMap || {}).filter((f) => f && !f.isCelebrity),
    [friendDetailsMap],
  );

  const [localSelected, setLocalSelected] = useState(selectedIds || []);
  const [localAudience, setLocalAudience] = useState(audience || "all");

  useEffect(() => {
    if (open) {
      setLocalSelected(selectedIds || []);
      setLocalAudience(audience || "all");
    }
  }, [open, selectedIds, audience]);

  const allSelected =
    localAudience === "all" ||
    (friends.length > 0 && localSelected.length === friends.length);

  const toggleAll = () => {
    if (allSelected) {
      setLocalAudience("selected");
      setLocalSelected([]);
    } else {
      setLocalAudience("all");
      setLocalSelected(friends.map((f) => f.uid));
    }
  };

  const toggleFriend = (uid) => {
    setLocalAudience("selected");
    setLocalSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleConfirm = () => {
    const audienceOut =
      localAudience === "all" || localSelected.length === friends.length
        ? "all"
        : "selected";
    onChange?.({ audience: audienceOut, selectedIds: localSelected });
    onConfirm?.({ audience: audienceOut, selectedIds: localSelected });
    onClose?.();
  };

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <section
        role="dialog"
        aria-label="Chọn người nhận"
        aria-modal="true"
        className={clsx(
          "fixed left-0 right-0 bottom-0 z-50",
          "bg-base-100 text-base-content",
          "rounded-t-3xl border-t border-base-200",
          "shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.35)]",
          "transition-transform duration-300 ease-out",
          "max-h-[80vh] flex flex-col pb-[env(safe-area-inset-bottom)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <header className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1.5 bg-base-300 rounded-full mx-auto absolute left-0 right-0 top-2" />
          <h2 className="text-base font-semibold mt-2">Gửi tới</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 -mr-2 rounded-full text-base-content/60 hover:bg-base-200 mt-2"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="px-5 py-2">
          <button
            type="button"
            onClick={toggleAll}
            className={clsx(
              "w-full flex items-center gap-3 p-3 rounded-2xl transition",
              "border-2",
              allSelected
                ? "border-amber-400 bg-primary/10"
                : "border-base-200 hover:bg-base-200/50",
            )}
          >
            <span className="size-11 rounded-full bg-base-200 flex items-center justify-center text-primary">
              <Users className="size-5" />
            </span>
            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold">Tất cả bạn bè</span>
              <span className="block text-xs text-base-content/60">
                {friends.length} người
              </span>
            </span>
            {allSelected && (
              <Check className="size-5 text-amber-400" strokeWidth={2.5} />
            )}
          </button>
        </div>

        <div className="px-2 pb-3 flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-center text-sm text-base-content/60 py-8">
              Chưa có bạn bè nào.
            </p>
          ) : (
            <ul className="divide-y divide-base-200">
              {friends.map((friend) => {
                const checked = localSelected.includes(friend.uid);
                return (
                  <li key={friend.uid}>
                    <button
                      type="button"
                      onClick={() => toggleFriend(friend.uid)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-base-200/50 rounded-xl transition"
                    >
                      <Avatar friend={friend} />
                      <span className="flex-1 text-left text-sm font-medium truncate">
                        {[friend.firstName, friend.lastName]
                          .filter(Boolean)
                          .join(" ") || friend.uid}
                      </span>
                      <span
                        className={clsx(
                          "size-6 rounded-full flex items-center justify-center border-2 transition",
                          checked
                            ? "border-amber-400 bg-amber-400 text-white"
                            : "border-base-300",
                        )}
                      >
                        {checked && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 pt-2 pb-4 border-t border-base-200">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={localAudience === "selected" && localSelected.length === 0}
            className={clsx(
              "w-full rounded-full bg-primary text-primary-content font-semibold py-3",
              "shadow-[0_8px_20px_-6px_rgba(249,115,22,0.55)]",
              "active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Xong
          </button>
        </div>
      </section>
    </>
  );
}
