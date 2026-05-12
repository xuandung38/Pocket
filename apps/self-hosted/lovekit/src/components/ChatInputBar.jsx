import { useState, useRef } from "react";
import { ArrowUp } from "lucide-react";
import clsx from "clsx";

export default function ChatInputBar({ onSubmit, disabled, className }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSubmit?.(trimmed);
      setText("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } catch (err) {
      console.error("ChatInputBar send error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    const max = 24 * 6;
    el.style.height = (el.scrollHeight > max ? max : el.scrollHeight) + "px";
  };

  const isDisabled = sending || disabled || !text.trim();

  return (
    <div
      className={clsx(
        "fixed bottom-0 inset-x-0 z-50 px-3 pt-2 bg-base-100/95 backdrop-blur",
        "border-t border-base-200",
        "pb-[calc(env(safe-area-inset-bottom)+0.5rem)]",
        className,
      )}
    >
      <div className="flex items-end gap-2 px-3 py-2 bg-base-200 rounded-3xl">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Gửi tin nhắn..."
          rows={1}
          disabled={disabled || sending}
          className="flex-1 bg-transparent focus:outline-none text-sm resize-none leading-6 max-h-36 disabled:opacity-50"
          aria-label="Message input"
        />
        <button
          type="button"
          onClick={send}
          disabled={isDisabled}
          aria-label="Send message"
          className={clsx(
            "shrink-0 size-9 rounded-full flex items-center justify-center transition-all",
            isDisabled
              ? "bg-base-300 text-base-content/40 cursor-not-allowed"
              : "bg-primary text-primary-content hover:opacity-90 active:scale-95",
          )}
        >
          {sending ? (
            <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUp className="size-5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
