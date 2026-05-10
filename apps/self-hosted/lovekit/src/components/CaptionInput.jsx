import clsx from "clsx";

const MAX_LEN = 80;

export default function CaptionInput({ value, onChange, className, placeholder = "Thêm chú thích…" }) {
  return (
    <div
      className={clsx(
        "px-4 py-2 rounded-full",
        "bg-black/45 backdrop-blur-md",
        "border border-white/10",
        "shadow-[0_4px_20px_-6px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value.slice(0, MAX_LEN))}
        placeholder={placeholder}
        maxLength={MAX_LEN}
        className={clsx(
          "w-full bg-transparent outline-none",
          "text-center text-white placeholder:text-white/60",
          "text-sm font-medium",
        )}
      />
    </div>
  );
}
