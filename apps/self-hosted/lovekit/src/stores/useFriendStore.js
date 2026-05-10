// src/store/useFriendStore.js
import { create } from "zustand";
import { addFriendToCache, getAllFriendDetails } from "@/cache/friendsDB";
import { fetchAndSyncFriendDetails } from "@/utils/SyncData/friendSyncUtils";
import { SonnerError } from "@/components/ui/SonnerToast";

export const useFriendStore = create((set, get) => ({
  friendDetails: [],
  loading: false,

  setFriendDetails: (friends) => set({ friendDetails: friends }),

  // 🔹 Load & sync friend data
  loadFriends: async () => {
    set({ loading: true });

    try {
      // 1️⃣ Lấy dữ liệu local trước (IndexedDB)
      const localFriends = await getAllFriendDetails();
      set({ friendDetails: localFriends });

      // 2️⃣ Sau đó đồng bộ server (background)
      const updated = await fetchAndSyncFriendDetails();
      set({ friendDetails: updated });
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
    set((state) => ({
      friendDetails: [...state.friendDetails, friend],
    }));
  },
}));
