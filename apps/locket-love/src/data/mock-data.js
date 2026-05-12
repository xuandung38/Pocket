// Static UI assets + remaining demo seed data for Locket Love.
//
// History: this file was the original mock backend for the design prototype.
// Phases 2–7 wired real services + stores, so the user/friends/chat/feed
// fixtures here have been removed. Demo seeds that still drive screens with
// no API counterpart (memories calendar, photo strips, caption stickers,
// music service list) remain until those screens migrate fully.
//
// Phase 8 cleanup removed (orphans with no remaining consumer):
//   - searchableUsers                → request-services.findFriendByUserName
//   - conversations, chatMessages    → chat store / chat-services
//
// Still exported as stubs because callers haven't migrated yet — drop them
// when the consumer screen switches to the live store:
//   - currentUser → useAuthStore       (consumer: memories-screen)
//   - friends     → useFriendStoreV2   (consumer: send-screen recipient grid)
//
// FRIENDS_LIMIT is a real product constant (Locket allows up to 20 friends);
// kept here as a single source of truth for the friends-sheet UI.

// Maximum allowed friends — shown in the friends sheet header (e.g., "2 / 20 người bạn")
export const FRIENDS_LIMIT = 20;

// Stub owner used by memories-screen for the header avatar. Memories has no
// per-account API counterpart yet; once it does, this export can be removed.
export const currentUser = {
  id: "me",
  name: "Bạn",
  username: "",
  avatar: null,
};

// Internal alias used by the feedMoments seed below.
const fallbackOwner = currentUser;

// Stub friend list — still exported for send-screen (recipient picker grid)
// which has not yet migrated to useFriendStoreV2. Once it does, drop the
// `friends` export. The default `[]` would break the demo recipient grid
// when no real friends are loaded, so we keep two placeholder entries.
export const friends = [
  {
    id: "f1",
    name: "Bạn 1",
    username: "@friend1",
    avatar: null,
  },
  {
    id: "f2",
    name: "Bạn 2",
    username: "@friend2",
    avatar: null,
  },
];

// Internal alias preserved for the feedMoments demo seed.
const fallbackFriends = friends;

export const feedMoments = [
  {
    id: "p0",
    author: fallbackOwner,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    caption: "góc nhỏ",
    timeAgo: "2g",
    date: "2026-05-04", // matches memoriesCalendar key for date-filter on feed
    reactions: ["🔥", "😍", "❤️"],
    // reactions received on this moment (only on own posts)
    reactionList: [
      { user: fallbackFriends[0], emoji: "🔥", time: "1g" },
      { user: fallbackFriends[1], emoji: "😍", time: "1g" },
      { user: fallbackFriends[0], emoji: "❤️", time: "30p" },
    ],
  },
  {
    id: "p1",
    author: fallbackFriends[1],
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80",
    caption: "sos",
    timeAgo: "1ngày",
    date: "2026-05-08",
    reactions: ["🙁", "😍", "❤️"],
  },
  {
    id: "p2",
    author: fallbackFriends[0],
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
    caption: "My FML",
    timeAgo: "14g",
    date: "2026-05-08",
    reactions: ["🔥", "😍", "💛"],
  },
];

// Photo pool reused across months to keep the mock dataset small but visually varied
const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=70",
  "https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=200&q=70",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&q=70",
  "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=200&q=70",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=70",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=70",
];

// Calendar data for memories screen — map "YYYY-MM-DD" → array of photo urls.
// Length of the array = number of moments captured that day (shown as a badge).
// Data spans November 2025 → May 2026 (the user can scroll until no more data).
export const memoriesCalendar = {
  // November 2025 (oldest with data)
  "2025-11-15": [PHOTO_POOL[0], PHOTO_POOL[1]],
  "2025-11-28": [PHOTO_POOL[2]],

  // December 2025
  "2025-12-03": [PHOTO_POOL[3]],
  "2025-12-24": [PHOTO_POOL[4], PHOTO_POOL[5], PHOTO_POOL[0]],
  "2025-12-31": [PHOTO_POOL[1], PHOTO_POOL[2]],

  // January 2026
  "2026-01-01": [PHOTO_POOL[3], PHOTO_POOL[4]],
  "2026-01-14": [PHOTO_POOL[5]],
  "2026-01-22": [PHOTO_POOL[0]],

  // February 2026
  "2026-02-09": [PHOTO_POOL[1], PHOTO_POOL[2]],
  "2026-02-14": [PHOTO_POOL[3], PHOTO_POOL[4], PHOTO_POOL[5], PHOTO_POOL[0]],
  "2026-02-27": [PHOTO_POOL[1]],

  // March 2026
  "2026-03-08": [PHOTO_POOL[2]],
  "2026-03-20": [PHOTO_POOL[3], PHOTO_POOL[4]],

  // April 2026
  "2026-04-12": [PHOTO_POOL[0]],
  "2026-04-19": [PHOTO_POOL[1], PHOTO_POOL[2]],
  "2026-04-25": [PHOTO_POOL[3]],

  // May 2026 (current)
  "2026-05-04": [PHOTO_POOL[4]],
  "2026-05-08": [PHOTO_POOL[0], PHOTO_POOL[5], PHOTO_POOL[2]],
  "2026-05-10": [PHOTO_POOL[1]],
};

// Generate the list of months to render in chronological order, from the
// earliest date with data through the current month. The user scrolls up to
// reach older months and stops when there are no more.
function buildMemoriesMonths() {
  const dates = Object.keys(memoriesCalendar);
  if (dates.length === 0) return [];
  const earliest = dates.reduce((min, d) => (d < min ? d : min));
  const [y, m] = earliest.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  // "Current" anchor — matches TODAY in memories-screen
  const end = new Date(2026, 4, 1); // May 2026
  const months = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

// Months to render — older above, current month last (bottom of list).
export const memoriesMonths = buildMemoriesMonths();

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
