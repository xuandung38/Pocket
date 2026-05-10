import clsx from "clsx";

function formatTime(createdAt) {
  if (!createdAt) return "";
  const ts =
    String(createdAt).length === 10 ? Number(createdAt) * 1000 : Number(createdAt);
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message, isMine, className }) {
  const text = message?.body ?? "";
  const thumbnail = message?.thumbnailUrl;
  const time = formatTime(message?.createdAt);

  return (
    <div
      className={clsx(
        "flex w-full",
        isMine ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div className={clsx("flex flex-col max-w-[75%]", isMine ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "px-4 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap",
            isMine
              ? "bg-primary text-primary-content rounded-br-sm ml-auto"
              : "bg-base-200 text-base-content rounded-bl-sm mr-auto",
          )}
        >
          {thumbnail && (
            <img
              src={thumbnail}
              alt="attachment"
              className="w-32 h-32 object-cover rounded-lg mb-1"
            />
          )}
          {text}
        </div>
        {time && (
          <span className="text-[10px] text-base-content/50 mt-0.5 px-1">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
