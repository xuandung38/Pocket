import clsx from "clsx";
import { useRef } from "react";
import { Play } from "lucide-react";
import WarmCard from "@/components/ui/WarmCard";
import FriendAvatar from "@/components/FriendAvatar";
import EmojiReactionBar from "@/components/EmojiReactionBar";
import { formatTimeAgo } from "@/utils";

const LONG_PRESS_MS = 600;

export default function MomentCard({
  moment,
  friend,
  isOwn = false,
  onOpen,
  onLongPress,
  className,
}) {
  const timerRef = useRef(null);
  const triggeredRef = useRef(false);

  const startPress = () => {
    if (!isOwn || !onLongPress) return;
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress(moment);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e) => {
    if (triggeredRef.current) {
      triggeredRef.current = false;
      e.preventDefault();
      return;
    }
    onOpen?.(moment);
  };

  const fullName =
    [friend?.firstName, friend?.lastName].filter(Boolean).join(" ").trim() ||
    (isOwn ? "Bạn" : "Người dùng");

  const thumb = moment?.thumbnailUrl || moment?.thumbnail_url || moment?.image_url;
  const hasVideo = !!(moment?.videoUrl || moment?.video_url);
  const caption = moment?.caption;

  return (
    <WarmCard
      padded={false}
      className={clsx("overflow-hidden", className)}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => isOwn && e.preventDefault()}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`Open moment from ${fullName}`}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <FriendAvatar src={friend?.profilePic} name={fullName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base-content truncate">
              {isOwn ? "Bạn" : fullName}
            </div>
            <div className="text-xs text-base-content/60">
              {formatTimeAgo(moment?.date || moment?.createTime)}
            </div>
          </div>
        </div>

        <div className="relative aspect-square w-full bg-base-200">
          {thumb ? (
            <img
              src={thumb}
              alt={caption || "Moment"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base-content/40 text-sm">
              No preview
            </div>
          )}

          {hasVideo && (
            <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 text-white text-xs">
              <Play className="size-3 fill-current" />
              Video
            </span>
          )}

          {caption && (
            <div className="absolute bottom-3 inset-x-3 px-3 py-1.5 rounded-2xl bg-black/45 backdrop-blur-sm text-white text-sm text-center truncate">
              {caption}
            </div>
          )}
        </div>
      </button>

      <div className="px-3 py-3">
        <EmojiReactionBar momentId={moment?.id} />
      </div>
    </WarmCard>
  );
}
