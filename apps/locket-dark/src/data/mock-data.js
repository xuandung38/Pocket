// Mock data for Locket Dark demo — no real API calls

export const currentUser = {
  id: "me",
  name: "Dio",
  username: "@diodio",
  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dio&backgroundColor=b6e3f4",
};

// Maximum allowed friends — shown in the friends sheet header (e.g., "2 / 20 người bạn")
export const FRIENDS_LIMIT = 20;

// Mock directory for "Thêm theo tên người dùng" search results
export const searchableUsers = [
  { id: "u1", name: "Hien Nguyen", username: "hien", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Hien&backgroundColor=ffd5dc" },
  { id: "u2", name: "Minh Anh", username: "minhanh", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=MinhAnh&backgroundColor=d1d4f9" },
  { id: "u3", name: "Tuấn Kiệt", username: "tuankiet", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=TuanKiet&backgroundColor=c0aede" },
  { id: "u4", name: "Linh Đan", username: "linhdan", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=LinhDan&backgroundColor=ffdfbf" },
];

export const friends = [
  {
    id: "f1",
    name: "Ngọc Ánh Nguyễn Thị",
    username: "@ngocanhnt",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=NgocanH&backgroundColor=ffdfbf",
  },
  {
    id: "f2",
    name: "trẻ người nonstop",
    username: "@trenguoi",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=TreNguoi&backgroundColor=c0aede",
  },
];

export const conversations = [
  {
    id: "c1",
    friend: friends[0],
    lastMessage: "Chốt nhé, nhưng chắc chờ con thi x...",
    lastTime: "10g",
    unread: 0,
  },
  {
    id: "c2",
    friend: friends[1],
    lastMessage: "hic",
    lastTime: "2ngày",
    unread: 0,
  },
];

export const chatMessages = [
  {
    id: "m1",
    senderId: "f1",
    text: "Chú đẹp anh kia cũng đẹp 😅",
    time: "Hôm qua 5:34 CH",
    isFirst: true,
  },
  {
    id: "m2",
    senderId: "me",
    text: "thích ko, chú giới thiệu kk",
    time: null,
  },
  {
    id: "m3",
    senderId: "me",
    text: "Nay ko đi đâu chơi à châu",
    time: null,
  },
  {
    id: "m4",
    senderId: "f1",
    text: null,
    time: "Hôm qua 10:42 CH",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
    caption: "Thượng hạng",
    rating: 5,
    isFirst: true,
  },
  {
    id: "m5",
    senderId: "me",
    text: "Nào qua nhà chú chơi trò tài xem nào",
    time: null,
  },
  {
    id: "m6",
    senderId: "f1",
    text: "Chốt nhé, nhưng chắc chờ con thi xong, giờ con đang vùi đầu vào 2 bài tiểu luận 😭",
    time: "Hôm nay 12:04 SA",
    isFirst: true,
  },
];

export const feedMoments = [
  {
    id: "p0",
    author: currentUser,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    caption: "góc nhỏ",
    timeAgo: "2g",
    reactions: ["🔥", "😍", "❤️"],
    // reactions received on this moment (only on own posts)
    reactionList: [
      { user: friends[0], emoji: "🔥", time: "1g" },
      { user: friends[1], emoji: "😍", time: "1g" },
      { user: friends[0], emoji: "❤️", time: "30p" },
    ],
  },
  {
    id: "p1",
    author: friends[1],
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80",
    caption: "sos",
    timeAgo: "1ngày",
    reactions: ["🙁", "😍", "❤️"],
  },
  {
    id: "p2",
    author: friends[0],
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
    caption: "My FML",
    timeAgo: "14g",
    reactions: ["🔥", "😍", "💛"],
  },
];

// Calendar data for memories screen — map "YYYY-MM-DD" → photo url
export const memoriesCalendar = {
  "2026-05-04": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=70",
  "2026-05-08": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=70",
  "2026-05-10": "https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=200&q=70",
};

export const memoriesStats = {
  lockets: 16,
  streak: 1,
};

// Photo detail strips
export const photoStrips = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&q=70",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&q=70",
  "https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=120&q=70",
];

// Caption stickers — bg/text colors match native Locket app
export const captionStickersGeneral = [
  { id: "text",     icon: "Aa",  label: "Văn bản",      bg: "#2c2c2e", text: "#fff" },
  { id: "review",   icon: "⭐",  label: "Review",        bg: "#2c2c2e", text: "#fff" },
  { id: "music",    icon: "🎵",  label: "Đang phát",    bg: "#2c2c2e", text: "#fff" },
  { id: "location", icon: "📍",  label: "Vị trí",       bg: "#2c2c2e", text: "#fff" },
  { id: "weather",  icon: "☀️",  label: "Thời tiết",    bg: "linear-gradient(135deg,#4facfe,#00f2fe)", text: "#fff" },
  { id: "time",     icon: "🕙",  label: "10:33 SA",     bg: "#2c2c2e", text: "#fff" },
  { id: "fire",     icon: "🔥",  label: "2",            bg: "linear-gradient(135deg,#f5a623,#e87d20)", text: "#fff" },
  { id: "zodiac",   icon: "♉",  label: "Mùa Kim Ngưu", bg: "linear-gradient(135deg,#11998e,#38ef7d)", text: "#fff" },
];

export const captionStickersDecorative = [
  { id: "party", icon: "🪩", label: "Party Time!", bg: "linear-gradient(135deg,#43e97b,#38f9d7)", text: "#000" },
  { id: "ootd",  icon: "🕶️", label: "OOTD",        bg: "#f0f0f0",                                text: "#000" },
  { id: "miss",  icon: "🥰", label: "Miss you",     bg: "linear-gradient(135deg,#e53935,#e35d5b)", text: "#fff" },
];

export const musicServices = [
  { id: "spotify", name: "Spotify", color: "#1db954" },
  { id: "apple", name: "Apple Music", color: "#fc3c44" },
];
