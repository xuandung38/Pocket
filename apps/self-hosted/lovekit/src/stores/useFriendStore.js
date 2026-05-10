// src/store/useFriendStore.js
import { create } from "zustand";
import { addFriendToCache, getAllFriendDetails } from "@/cache/friendsDB";
import { fetchAndSyncFriendDetails } from "@/utils/SyncData/friendSyncUtils";
import { SonnerError } from "@/components/ui/SonnerToast";

function normalizeFriend(f) {
  if (!f) return f;
  return {
    ...f,
    profilePic: f.profilePic ?? f.profile_picture_url ?? null,
    firstName: f.firstName ?? f.first_name ?? "",
    lastName: f.lastName ?? f.last_name ?? "",
    displayName:
      f.displayName ??
      `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim(),
  };
}

export const useFriendStore = create((set, get) => ({
  friendDetails: [],
  loading: false,

  setFriendDetails: (friends) =>
    set({ friendDetails: (friends ?? []).map(normalizeFriend) }),

  // 🔹 Load & sync friend data
  loadFriends: async () => {
    set({ loading: true });

    try {
      // 1️⃣ Lấy dữ liệu local trước (IndexedDB)
      const localFriends = await getAllFriendDetails();
      set({ friendDetails: (localFriends ?? []).map(normalizeFriend) });

      // 2️⃣ Sau đó đồng bộ server (background)
      const updated = await fetchAndSyncFriendDetails();
      set({ friendDetails: (updated ?? []).map(normalizeFriend) });
    } catch (err) {
      console.error("⚠️ Sync friends failed:", err);
      SonnerError("Không tải được danh sách bạn bè", err?.message || "");
    } finally {
      set({ loading: false });
    }
  },

  clearFriends: () => set({ friendDetails: [] }),

  addFriend: async (friend) => {
    await addFriendToCache(friend);
    const normalized = normalizeFriend(friend);
    set((state) => ({
      friendDetails: [...state.friendDetails, normalized],
    }));
  },
}));
