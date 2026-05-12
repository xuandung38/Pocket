import { useEffect, useState } from "react";
import { Camera as CameraIcon, Image as ImageIcon } from "lucide-react";
import BottomSheet from "./bottom-sheet";
import Avatar from "../ui/avatar";

// Generic single-input edit sheet — supports text / email / date inputs.
// Used for "Sửa tên", "Sửa ngày sinh", "Add email address".
export function EditTextSheet({
  open,
  onClose,
  title,
  type = "text",
  placeholder,
  initialValue,
  onSave,
}) {
  const [value, setValue] = useState(initialValue || "");

  // Reset to incoming value whenever the sheet opens
  useEffect(() => {
    if (open) setValue(initialValue || "");
  }, [open, initialValue]);

  const canSave = value.trim().length > 0;

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div style={{ padding: "16px 16px 24px" }}>
        <input
          autoFocus
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSave) onSave(value);
            if (e.key === "Escape") onClose();
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "var(--bg-elevated)",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 16,
            boxSizing: "border-box",
            colorScheme: "dark",
          }}
        />
        <button
          onClick={() => canSave && onSave(value)}
          disabled={!canSave}
          style={{
            width: "100%",
            background: canSave ? "var(--accent-yellow)" : "rgba(245,166,35,0.3)",
            color: canSave ? "#000" : "rgba(0,0,0,0.4)",
            border: "none",
            borderRadius: 14,
            padding: "14px 0",
            fontSize: 16,
            fontWeight: 700,
            cursor: canSave ? "pointer" : "default",
          }}
        >
          Lưu
        </button>
      </div>
    </BottomSheet>
  );
}

// Mock photo picker — current avatar preview + Camera / Library buttons.
// No real upload; selecting a source rotates between three demo seeds.
const DEMO_AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Dio&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Smile&backgroundColor=ffd5dc",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Cool&backgroundColor=c0aede",
];

export function EditPhotoSheet({ open, onClose, avatar, onSave }) {
  const [pending, setPending] = useState(avatar);

  useEffect(() => {
    if (open) setPending(avatar);
  }, [open, avatar]);

  function pickRandom() {
    const next = DEMO_AVATARS[Math.floor(Math.random() * DEMO_AVATARS.length)];
    setPending(next);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile photo">
      <div style={{ padding: "16px 16px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            padding: 4,
            borderRadius: "50%",
            border: "3px solid var(--accent-yellow)",
            marginBottom: 20,
          }}
        >
          <Avatar src={pending} name="preview" size={120} />
        </div>
        <div style={{ display: "flex", gap: 10, width: "100%", marginBottom: 16 }}>
          <PickerButton icon={<CameraIcon size={20} />} label="Chụp ảnh" onClick={pickRandom} />
          <PickerButton icon={<ImageIcon size={20} />} label="Thư viện" onClick={pickRandom} />
        </div>
        <button
          onClick={() => onSave(pending)}
          style={{
            width: "100%",
            background: "var(--accent-yellow)",
            color: "#000",
            border: "none",
            borderRadius: 14,
            padding: "14px 0",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Lưu
        </button>
      </div>
    </BottomSheet>
  );
}

function PickerButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: "var(--bg-elevated)",
        border: "none",
        borderRadius: 14,
        padding: "14px 0",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// Notification preferences — list of toggles
const NOTIF_OPTIONS = [
  { id: "moments", label: "Khoảnh khắc mới" },
  { id: "chats", label: "Tin nhắn" },
  { id: "reactions", label: "Phản ứng" },
  { id: "friendRequests", label: "Lời mời kết bạn" },
];

export function NotificationsSheet({ open, onClose, notifs, setNotifs }) {
  function toggle(id) {
    setNotifs((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications">
      <div style={{ padding: "8px 16px 24px" }}>
        <div style={{ background: "var(--bg-elevated)", borderRadius: 14, overflow: "hidden" }}>
          {NOTIF_OPTIONS.map((opt, idx) => (
            <ToggleRow
              key={opt.id}
              label={opt.label}
              on={!!notifs[opt.id]}
              onToggle={() => toggle(opt.id)}
              divider={idx < NOTIF_OPTIONS.length - 1}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

function ToggleRow({ label, on, onToggle, divider }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 16px",
        borderBottom: divider ? "1px solid var(--border-subtle)" : "none",
      }}
    >
      <span style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 500 }}>{label}</span>
      <button
        onClick={onToggle}
        style={{
          width: 50,
          height: 30,
          borderRadius: 999,
          background: on ? "var(--accent-yellow)" : "rgba(120,120,128,0.6)",
          border: "none",
          padding: 2,
          cursor: "pointer",
          display: "flex",
          justifyContent: on ? "flex-end" : "flex-start",
          transition: "background 0.2s",
        }}
      >
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff" }} />
      </button>
    </div>
  );
}
