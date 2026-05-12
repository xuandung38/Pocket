import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Settings, UserPlus } from "lucide-react";
import WarmCard from "@/components/ui/WarmCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import StreakCalendar from "@/components/StreakCalendar";
import FriendListItem from "@/components/FriendListItem";
import SettingsSheet from "@/components/SettingsSheet";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFriendStoreV2 } from "@/stores/friendStore";
import { useStreakStore } from "@/stores/useStreakStore";
import { useApp } from "@/context/AppContext";

// NOTE: App.jsx must pass `onLogout={() => { setAuthed(false); localStorage.clear(); }}`
// (or equivalent) to this screen so the SettingsSheet logout returns to LoginScreen.
// Verified: dev-2's App.jsx wires `handleLogout` -> setAuthed(false) + token cleanup.

export default function ProfileScreen({ className, onLogout }) {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const initAuth = useAuthStore((s) => s.init);

  const friends = useFriendStoreV2((s) => s.friendList);
  const friendsLoading = useFriendStoreV2((s) => s.loading);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);

  const streak = useStreakStore((s) => s.streak);
  const initStreak = useStreakStore((s) => s.initStreak);
  const syncStreak = useStreakStore((s) => s.syncStreak);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setFriendsTabOpen } = useApp().navigation;

  useEffect(() => {
    if (!user) {
      hydrate?.();
      initAuth?.();
    }
    initStreak?.();
    syncStreak?.();
    if (!friends || friends.length === 0) loadFriends?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedFriends = useMemo(() => {
    const list = Array.isArray(friends) ? [...friends] : [];
    list.sort((a, b) => {
      const ta = a?.last_moment_at || a?.last_active_at || 0;
      const tb = b?.last_moment_at || b?.last_active_at || 0;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
    return list;
  }, [friends]);

  const rollcallFriends = useMemo(
    () => sortedFriends.filter((f) => f?.rollcall_pending),
    [sortedFriends],
  );

  const displayName = user?.displayName || user?.first_name || "Bạn";
  const email = user?.email || "";
  const avatar = user?.profilePicture || user?.profile_picture_url;
  const initials = (displayName || "?").charAt(0).toUpperCase();

  return (
    <section
      role="tabpanel"
      aria-label="Profile"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <div className="px-4 pt-6 pb-8 flex flex-col gap-5 max-w-md mx-auto">
        {/* Header */}
        <WarmCard className="flex items-center gap-4">
          <div className="size-20 rounded-full bg-base-200 ring-2 ring-primary/30 overflow-hidden flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{displayName}</h1>
            {email && (
              <p className="text-sm text-base-content/60 truncate">{email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFriendsTabOpen(true)}
            aria-label="Thêm bạn"
            className="size-10 rounded-full bg-base-200/70 hover:bg-base-200 flex items-center justify-center text-base-content/70 active:scale-95 transition shrink-0"
          >
            <UserPlus className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Cài đặt"
            className="size-10 rounded-full bg-base-200/70 hover:bg-base-200 flex items-center justify-center text-base-content/70 active:scale-95 transition shrink-0"
          >
            <Settings className="size-5" />
          </button>
        </WarmCard>

        {/* Streak */}
        <WarmCard className="py-6">
          <StreakCalendar streak={streak} />
        </WarmCard>

        {/* Rollcall section */}
        {rollcallFriends.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-base-content/70 px-2 mb-2">
              Rollcall đang chờ
            </h2>
            <WarmCard padded={false} className="border-amber-400/40 ring-1 ring-amber-400/30 p-2">
              <ul className="flex flex-col">
                {rollcallFriends.map((f) => (
                  <li key={`rc-${f.uid}`}>
                    <FriendListItem friend={f} rollcallPending />
                  </li>
                ))}
              </ul>
            </WarmCard>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-sm font-semibold text-base-content/70 px-2 mb-2">
            Bạn bè ({sortedFriends.length})
          </h2>

          {friendsLoading && sortedFriends.length === 0 ? (
            <div className="flex flex-col gap-2">
              <LoadingSkeleton variant="card" className="h-16" />
              <LoadingSkeleton variant="card" className="h-16" />
              <LoadingSkeleton variant="card" className="h-16" />
            </div>
          ) : sortedFriends.length === 0 ? (
            <WarmCard padded={false}>
              <EmptyState
                icon={UserPlus}
                title="Chưa có bạn bè"
                subtitle="Thêm bạn để bắt đầu chia sẻ những khoảnh khắc."
              />
            </WarmCard>
          ) : (
            <WarmCard padded={false} className="p-2">
              <ul className="flex flex-col">
                {sortedFriends.map((f) => (
                  <li key={f.uid}>
                    <FriendListItem
                      friend={f}
                      rollcallPending={!!f.rollcall_pending}
                    />
                  </li>
                ))}
              </ul>
            </WarmCard>
          )}
        </section>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout}
      />
    </section>
  );
}
