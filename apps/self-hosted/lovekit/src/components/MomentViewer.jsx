import clsx from "clsx";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Virtual } from "swiper/modules";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DeleteMoment } from "@/services/LocketServices";
import FriendAvatar from "@/components/FriendAvatar";
import EmojiReactionBar from "@/components/EmojiReactionBar";
import { formatTimeAgo } from "@/utils";
import "swiper/css";

export default function MomentViewer({
  moments,
  initialIndex = 0,
  meUid,
  friendMap = {},
  onClose,
  onDeleted,
  className,
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, []);

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!moments?.length) return null;

  const current = moments[activeIndex];
  const isOwn = current?.user === meUid;

  const handleDelete = async () => {
    if (!current?.id || deleting) return;
    if (!confirm("Xoá moment này?")) return;
    setDeleting(true);
    try {
      const deletedId = await DeleteMoment(current.id);
      if (deletedId) {
        onDeleted?.(deletedId);
        toast.success("Đã xoá moment");
        onClose?.();
      } else {
        toast.error("Không xoá được");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Moment viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
        aria-label="Close"
      >
        <X className="size-6" />
      </button>

      {isOwn && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/10 hover:bg-red-500/40 text-white disabled:opacity-50"
          aria-label="Delete moment"
        >
          <Trash2 className="size-5" />
        </button>
      )}

      <Swiper
        direction="vertical"
        modules={[Virtual]}
        className="w-full h-full max-w-md"
        slidesPerView={1}
        initialSlide={initialIndex}
        onSlideChange={(s) => setActiveIndex(s.activeIndex)}
        virtual
      >
        {moments.map((m, idx) => {
          const friend = friendMap[m.user];
          const fullName =
            [friend?.firstName, friend?.lastName].filter(Boolean).join(" ").trim() ||
            (m.user === meUid ? "Bạn" : "Người dùng");
          const thumb = m.thumbnailUrl || m.thumbnail_url || m.image_url;
          const video = m.videoUrl || m.video_url;
          return (
            <SwiperSlide
              key={m.id}
              virtualIndex={idx}
              className="flex flex-col items-center justify-center px-4"
            >
              <div className="w-full max-w-md flex flex-col items-center gap-3">
                <div className="flex items-center gap-3 w-full">
                  <FriendAvatar src={friend?.profilePic} name={fullName} size="md" />
                  <div className="flex-1 min-w-0 text-white">
                    <div className="font-semibold truncate">{fullName}</div>
                    <div className="text-xs opacity-70">{formatTimeAgo(m.date)}</div>
                  </div>
                </div>

                <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black">
                  {video ? (
                    <video
                      src={video}
                      poster={thumb}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : thumb ? (
                    <img
                      src={thumb}
                      alt={m.caption || "Moment"}
                      className="w-full h-full object-cover"
                    />
                  ) : null}

                  {m.caption && (
                    <div className="absolute bottom-3 inset-x-3 px-3 py-2 rounded-2xl bg-black/55 backdrop-blur-sm text-white text-center text-sm">
                      {m.caption}
                    </div>
                  )}
                </div>

                <EmojiReactionBar
                  momentId={m.id}
                  size="lg"
                  className="bg-white/10 backdrop-blur-md"
                />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
