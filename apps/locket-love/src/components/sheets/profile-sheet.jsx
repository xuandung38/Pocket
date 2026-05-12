import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Bell,
  Cake,
  User,
  Mail,
  Info,
  Users as UsersIcon,
  AlertCircle,
  MessageSquarePlus,
  Ban,
  Hand,
  Music,
  Instagram,
  Share2,
  ScrollText,
  Lock,
  LogOut,
  Plus,
} from "lucide-react";
import BottomSheet from "./bottom-sheet";
import Avatar from "../ui/avatar";
import { currentUser, friends } from "../../data/mock-data";
import {
  EditTextSheet,
  EditPhotoSheet,
  NotificationsSheet,
} from "./profile-edit-sheets";

// Profile sheet — opens when tapping the user avatar in any screen header.
// Follows the mock-up: profile header → utilities → settings sections.
// Edit sheets render as siblings so they layer on top of this sheet.

export default function ProfileSheet({ open, onClose }) {
  // Editable profile fields — start from currentUser
  const [name, setName] = useState(currentUser.name);
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [avatarSrc, setAvatarSrc] = useState(currentUser.avatar);
  const [notifs, setNotifs] = useState({
    moments: true,
    chats: true,
    reactions: true,
    friendRequests: true,
  });
  // Which edit sheet is open: "name" | "birthday" | "email" | "photo" | "notifications" | null
  const [activeEdit, setActiveEdit] = useState(null);
  const closeEdit = () => setActiveEdit(null);
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("locket-auth");
    navigate("/login", { replace: true });
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <div
          style={{
            padding: "0 16px 32px",
            maxHeight: "85vh",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          <ProfileHeader name={name} avatar={avatarSrc} />
          <ActionRow />
          <WidgetSection />
          <SectionGroup label="Tổng quát">
            <Row
              icon={<Bell size={20} color="#fff" />}
              text="Notifications"
              onClick={() => setActiveEdit("notifications")}
            />
            <Row
              icon={<Cake size={20} color="#fff" />}
              text="Sửa ngày sinh"
              onClick={() => setActiveEdit("birthday")}
            />
            <Row
              icon={<span style={{ fontSize: 16, fontWeight: 700 }}>Aa</span>}
              text="Sửa tên"
              onClick={() => setActiveEdit("name")}
            />
            <Row
              icon={<User size={20} color="#fff" />}
              text="Edit profile photo"
              onClick={() => setActiveEdit("photo")}
            />
            <Row
              icon={<Mail size={20} color="#fff" />}
              text="Add email address"
              onClick={() => setActiveEdit("email")}
            />
          </SectionGroup>
        <SectionGroup label="Hỗ trợ">
          <Row icon={<Info size={20} color="#fff" />} text="Trung tâm trợ giúp" />
          <Row icon={<AlertCircle size={20} color="#fff" />} text="Báo cáo sự cố" />
          <Row icon={<MessageSquarePlus size={20} color="#fff" />} text="Gửi đề xuất" />
        </SectionGroup>
        <SectionGroup label="Riêng tư & bảo mật">
          <Row icon={<Ban size={20} color="#fff" />} text="Tài khoản đã bị chặn" />
          <ToggleRow icon={<MessageSquarePlus size={20} color="#fff" />} text="Send read receipts" />
          <Row icon={<Hand size={20} color="#fff" />} text="Quyền riêng tư và dữ liệu" />
        </SectionGroup>
        <SectionGroup label="Giới thiệu">
          <Row icon={<Music size={20} color="#fff" />} text="TikTok" />
          <Row icon={<Instagram size={20} color="#fff" />} text="Instagram" />
          <Row icon={<ScrollText size={20} color="#fff" />} text="Điều khoản dịch vụ" />
          <Row icon={<Lock size={20} color="#fff" />} text="Chính sách quyền riêng tư" />
        </SectionGroup>
          <SectionGroup label="Vùng nguy hiểm">
            <Row
              icon={<LogOut size={20} color="#fff" />}
              text="Đăng xuất"
              onClick={handleLogout}
            />
          </SectionGroup>
        </div>
      </BottomSheet>

      {/* Edit sheets — siblings render above the profile sheet */}
      <EditTextSheet
        open={activeEdit === "name"}
        title="Sửa tên"
        placeholder="Nhập tên..."
        initialValue={name}
        onSave={(v) => {
          setName(v);
          closeEdit();
        }}
        onClose={closeEdit}
      />
      <EditTextSheet
        open={activeEdit === "birthday"}
        title="Sửa ngày sinh"
        type="date"
        initialValue={birthday}
        onSave={(v) => {
          setBirthday(v);
          closeEdit();
        }}
        onClose={closeEdit}
      />
      <EditTextSheet
        open={activeEdit === "email"}
        title="Add email address"
        type="email"
        placeholder="email@example.com"
        initialValue={email}
        onSave={(v) => {
          setEmail(v);
          closeEdit();
        }}
        onClose={closeEdit}
      />
      <EditPhotoSheet
        open={activeEdit === "photo"}
        avatar={avatarSrc}
        onSave={(v) => {
          setAvatarSrc(v);
          closeEdit();
        }}
        onClose={closeEdit}
      />
      <NotificationsSheet
        open={activeEdit === "notifications"}
        notifs={notifs}
        setNotifs={setNotifs}
        onClose={closeEdit}
      />
    </>
  );
}

function ProfileHeader({ name, avatar }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 12px" }}>
      <div
        style={{
          padding: 4,
          borderRadius: "50%",
          border: "3px solid var(--accent-yellow)",
        }}
      >
        <Avatar src={avatar} name={name} size={120} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 16 }}>{name}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 14,
          color: "var(--text-secondary)",
          marginTop: 2,
        }}
      >
        locket.cam/{currentUser.username.replace("@", "")}
        <span style={{ opacity: 0.6 }}>🔗</span>
      </div>
    </div>
  );
}

function ActionRow() {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 16 }}>
      <button
        style={{
          flex: 1,
          background: "var(--bg-elevated)",
          border: "none",
          borderRadius: 16,
          padding: "14px 0",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <UsersIcon size={18} />
        {friends.length} Friends
      </button>
      <button
        style={{
          flex: 1,
          background: "var(--bg-elevated)",
          border: "none",
          borderRadius: 16,
          padding: "14px 0",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <Share2 size={18} />
        Chia sẻ
      </button>
    </div>
  );
}

function WidgetSection() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 18, marginRight: 6 }}>📱</span>
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>Tiện ích</span>
        <button
          style={{
            background: "var(--accent-yellow)",
            color: "#000",
            border: "none",
            borderRadius: 999,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          Mới <Plus size={14} strokeWidth={3} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <WidgetTile label="Mọi người" actionLabel="Sửa" preview="people" />
        <WidgetTile label="" actionLabel="Tạo" preview="add" />
      </div>
    </>
  );
}

function WidgetTile({ label, actionLabel, preview }) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        borderRadius: 18,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        aspectRatio: "1 / 1",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {preview === "people" ? (
          <div style={{ display: "flex" }}>
            <Avatar src={friends[0]?.avatar} name="A" size={42} />
            <div style={{ marginLeft: -10 }}>
              <Avatar src={friends[1]?.avatar} name="B" size={42} />
            </div>
          </div>
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "3px solid var(--accent-yellow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-yellow)",
            }}
          >
            <Plus size={32} strokeWidth={2.5} />
          </div>
        )}
      </div>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{label}</div>
      )}
      <button
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.08)",
          border: "none",
          borderRadius: 10,
          padding: "6px 0",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function SectionGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, paddingLeft: 4 }}>
        {label}
      </div>
      <div style={{ background: "var(--bg-elevated)", borderRadius: 16, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, text, right, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: danger ? "#ef4444" : "#fff",
        fontSize: 15,
        fontWeight: 500,
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{text}</span>
      {right || <ChevronRight size={18} color="var(--text-secondary)" />}
    </button>
  );
}

function ToggleRow({ icon, text }) {
  const [on, setOn] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        color: "#fff",
        fontSize: 15,
        fontWeight: 500,
      }}
    >
      <span style={{ width: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        onClick={() => setOn((v) => !v)}
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
