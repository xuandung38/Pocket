import clsx from "clsx";
import { useState } from "react";
import { SendReactMoment } from "@/services/LocketServices";

const EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

export default function EmojiReactionBar({
  momentId,
  className,
  onReact,
  size = "md",
}) {
  const [pending, setPending] = useState(null);
  const [active, setActive] = useState(null);

  const handleTap = async (emoji, e) => {
    e?.stopPropagation();
    if (!momentId || pending) return;
    setPending(emoji);
    try {
      await SendReactMoment(emoji, momentId, 1);
      setActive(emoji);
      onReact?.(emoji);
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-1 rounded-full bg-base-200/60 backdrop-blur-sm px-2 py-1.5",
        className,
      )}
      role="toolbar"
      aria-label="Quick reactions"
    >
      {EMOJIS.map((emoji) => {
        const isActive = active === emoji;
        const isPending = pending === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => handleTap(emoji, e)}
            disabled={isPending}
            aria-label={`React ${emoji}`}
            className={clsx(
              "flex items-center justify-center rounded-full transition-transform",
              size === "lg" ? "size-10 text-2xl" : "size-9 text-xl",
              "hover:scale-110 active:scale-95",
              isActive && "bg-amber-100 ring-2 ring-amber-400",
              isPending && "opacity-50",
            )}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
