// rollcall-services.js
// Reactions + activity HTTP layer — wraps the self-hosted backend's
// /locket/* moment-reaction + rollcall endpoints.
//
// Phase 7 surface (consumed by EmojiStudio + useActivityStore):
//   - sendReactionOnMoment(momentUid, emoji, power?)
//       → POST /locket/proxy/reactToMoment
//   - getActivity({ limit? })
//       → Aggregates incoming reactions on own moments + rollcall posts into
//         a unified, time-sorted activity list. Returns `{ items, fetchedAt }`.
//   - getRollcallPosts({ selectWeek?, selectYear? })
//       → POST /locket/proxy/getRollcallPosts
//   - postRollcallReaction({ postUid, postUserUid, emoji, x?, y?, rotation?, scale? })
//       → POST /locket/proxy/postRollcallReaction
//
// All requests go through the authenticated `api` client (auto-refresh + bearer
// injection). Reactions arrive in realtime via the socket `new_message_with_user`
// event (see socket-service.js `onReaction` alias) — the store is responsible
// for incrementing the unread counter from that side-channel.

import { api } from "@/libs";
import { getToken } from "@/utils";
import { getInfoMoment, getAllMoments } from "@/services/moment-services";

// ---- ISO week helper (kept inline to avoid pulling a date util just for this)
// Mirrors the algorithm in lovekit/src/utils/index.js (getISOWeek). Returns
// `{ year, week }` for the *current* time — used as a default when no week is
// passed in.
function getISOWeek(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Monday = 0
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { year: target.getUTCFullYear(), week };
}

// ---- Reactions on own moments ---------------------------------------------

/**
 * Send a reaction emoji to a moment.
 *
 * Backend: POST /locket/proxy/reactToMoment
 * Body shape (Locket-native):
 *   { data: { intensity, moment_uid, reaction, owner_uid } }
 *
 * `power` is the reaction intensity (0-100; 0 = simple tap, >0 = hold).
 * Returns the parsed backend response on success, `null` on failure (failures
 * are logged but never thrown so the UI optimistic update stays in place).
 */
export const sendReactionOnMoment = async (momentUid, emoji, power = 0) => {
  if (!momentUid) return null;
  try {
    const { localId } = getToken() || {};
    const res = await api.post("/locket/proxy/reactToMoment", {
      data: {
        intensity: Number(power) || 0,
        moment_uid: momentUid,
        reaction: emoji || "💛",
        owner_uid: localId,
      },
    });
    return res?.data ?? null;
  } catch (err) {
    console.warn("[rollcall.services] sendReactionOnMoment failed:", err?.message);
    return null;
  }
};

// ---- Activity feed ---------------------------------------------------------

/**
 * Fetch the unified activity feed.
 *
 * Strategy:
 *   1. Pull a recent page of the current user's own moments
 *      (getAllMoments({ friendId: meUid })).
 *   2. For each own moment, fetch its reaction list via getInfoMoment.
 *   3. Pull the current week's rollcall posts via getRollcallPosts.
 *   4. Flatten each reaction + each rollcall into an activity item,
 *      sort by timestamp desc, and return.
 *
 * Returns `{ items, fetchedAt }`:
 *   - items: ActivityItem[] (never undefined; [] when none)
 *   - fetchedAt: Date.now() — used by the store to gate refetches
 *
 * ActivityItem shape:
 *   {
 *     id: string,             // unique key (moment+emoji+actor or rollcall id)
 *     type: "reaction" | "rollcall",
 *     emoji?: string,         // reaction only
 *     actor: { uid, name, avatar },
 *     momentId?: string,      // reaction only — links to the moment thumbnail
 *     thumbnail?: string,     // moment image url, when known
 *     createdAt: number,      // unix seconds for stable sort
 *     payload?: object,       // raw record for downstream lookups
 *   }
 *
 * Never throws — returns `{ items: [], fetchedAt }` on transport failure.
 */
export const getActivity = async ({ limit = 30 } = {}) => {
  const fetchedAt = Date.now();
  const items = [];

  try {
    const { localId } = getToken() || {};

    // ---- 1) Reactions on own moments --------------------------------------
    if (localId) {
      try {
        const { items: ownMoments } = await getAllMoments({
          friendId: localId,
          limit,
        });
        // Fetch reaction list in parallel; tolerate per-moment failure.
        const detailed = await Promise.allSettled(
          (ownMoments ?? []).map((m) =>
            getInfoMoment(m.id).then((info) => ({ moment: m, info })),
          ),
        );

        for (const r of detailed) {
          if (r.status !== "fulfilled" || !r.value) continue;
          const { moment, info } = r.value;
          const reactions = Array.isArray(info?.reactions) ? info.reactions : [];
          for (const rx of reactions) {
            // Reactions can come in a few shapes — read defensively.
            const actorUid = rx?.user?.uid || rx?.user_uid || rx?.uid || "";
            const actorName =
              rx?.user?.firstName ||
              rx?.user?.name ||
              rx?.user?.first_name ||
              rx?.firstName ||
              "Người dùng";
            const actorAvatar =
              rx?.user?.profilePic ||
              rx?.user?.profile_picture_url ||
              rx?.user?.avatar ||
              null;
            const createdAtMs =
              Number(rx?.createdAt) ||
              Number(rx?.created_at) ||
              Number(rx?.date) ||
              0;
            // Normalize to unix seconds for consistent sort with rollcall items.
            const createdAt =
              createdAtMs > 1e12 ? Math.floor(createdAtMs / 1000) : createdAtMs;
            items.push({
              id: `rx-${moment.id}-${actorUid}-${rx?.emoji || rx?.reaction || ""}-${createdAt}`,
              type: "reaction",
              emoji: rx?.emoji || rx?.reaction || "💛",
              actor: { uid: actorUid, name: actorName, avatar: actorAvatar },
              momentId: moment.id,
              thumbnail:
                moment?.thumbnailUrl ||
                moment?.thumbnail_url ||
                moment?.image_url ||
                moment?.image ||
                null,
              createdAt,
              payload: rx,
            });
          }
        }
      } catch (err) {
        console.warn(
          "[rollcall.services] getActivity reactions failed:",
          err?.message,
        );
      }
    }

    // ---- 2) Rollcall posts (current ISO week) -----------------------------
    try {
      const rollcalls = await getRollcallPosts();
      for (const rc of rollcalls ?? []) {
        const actorUid = rc?.user?.uid || rc?.user_uid || rc?.uid || "";
        const actorName =
          rc?.user?.firstName || rc?.user?.first_name || rc?.user?.name || "Người dùng";
        const actorAvatar =
          rc?.user?.profilePic || rc?.user?.profile_picture_url || null;
        const createdAtMs =
          Number(rc?.createdAt) || Number(rc?.created_at) || Number(rc?.date) || 0;
        const createdAt =
          createdAtMs > 1e12 ? Math.floor(createdAtMs / 1000) : createdAtMs;
        items.push({
          id: `rc-${rc?.uid || rc?.post_uid || createdAt}`,
          type: "rollcall",
          actor: { uid: actorUid, name: actorName, avatar: actorAvatar },
          thumbnail:
            rc?.thumbnailUrl || rc?.thumbnail_url || rc?.image_url || null,
          prompt: rc?.prompt || rc?.body || rc?.question || "",
          createdAt,
          payload: rc,
        });
      }
    } catch (err) {
      console.warn(
        "[rollcall.services] getActivity rollcalls failed:",
        err?.message,
      );
    }
  } catch (err) {
    console.warn("[rollcall.services] getActivity failed:", err?.message);
  }

  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { items, fetchedAt };
};

// ---- Rollcall raw helpers (kept for future direct access) -----------------

/**
 * Fetch rollcall posts for a given ISO week (defaults to current week).
 * Returns the raw `posts` array from the backend, or [] on failure.
 */
export const getRollcallPosts = async ({ selectWeek, selectYear } = {}) => {
  try {
    const { year, week } = getISOWeek();
    const body = {
      data: {
        week_of_year: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: selectWeek || week,
        },
        source: "feed",
        year: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: selectYear || year,
        },
      },
    };
    const res = await api.post("/locket/proxy/getRollcallPosts", body);
    return res?.data?.result?.data?.posts ?? [];
  } catch (err) {
    console.warn("[rollcall.services] getRollcallPosts failed:", err?.message);
    return [];
  }
};

/**
 * React to a rollcall post (distinct from moment reactions).
 * x/y/rotation/scale are visual placement hints rendered on the receiver side.
 */
export const postRollcallReaction = async ({
  postUid,
  postUserUid,
  emoji,
  x = 0,
  y = 1,
  rotation = 0,
  scale = 1,
}) => {
  if (!postUid || !postUserUid || !emoji) return null;
  try {
    const res = await api.post("/locket/proxy/postRollcallReaction", {
      data: {
        x,
        y,
        rotation,
        reaction: emoji,
        post_user_uid: postUserUid,
        post_uid: postUid,
        scale,
      },
    });
    return res?.data ?? null;
  } catch (err) {
    console.warn(
      "[rollcall.services] postRollcallReaction failed:",
      err?.message,
    );
    return null;
  }
};
