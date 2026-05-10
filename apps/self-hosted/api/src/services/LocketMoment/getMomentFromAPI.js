const { instanceLocketV2 } = require("../../libs");
const { logError, logInfo } = require("../../utils/logEventUtils");

function replaceFirebaseWithCDN(url) {
  if (!url) return null;
  return url.replace("https://firebasestorage.googleapis.com", "https://cdn.locketcamera.com");
}

function normalizeApiMoment(moment) {
  if (!moment) return null;

  const {
    canonical_uid,
    user,
    thumbnail_url,
    image_url,
    video_url,
    caption,
    overlays = [],
    md5,
    sent_to_all,
    sent_to_self_only,
    date,
  } = moment;

  const id = canonical_uid;
  if (!id || !user) return null;

  let dateStr = null;
  let createTime = 0;

  if (date?._seconds) {
    createTime = date._seconds;
    dateStr = new Date(date._seconds * 1000).toISOString();
  } else if (typeof date === "string") {
    dateStr = date;
    createTime = Math.floor(new Date(date).getTime() / 1000);
  } else if (date?.seconds) {
    createTime = date.seconds;
    dateStr = new Date(date.seconds * 1000).toISOString();
  }

  const overlay = overlays[0] || {};
  const overlayData = overlay.data || {};
  const bgFields = overlayData.background || {};

  return {
    id,
    caption: caption || overlayData.text || "",
    user,
    thumbnailUrl: replaceFirebaseWithCDN(thumbnail_url || image_url || null),
    videoUrl: replaceFirebaseWithCDN(video_url || null),
    md5: md5 || null,
    date: dateStr,
    isPublic: !!sent_to_all && !sent_to_self_only,
    overlays: {
      id: overlay.overlay_id || null,
      type: overlay.overlay_type || null,
      text: overlayData.text || null,
      textColor: overlayData.text_color || null,
      maxLines: overlayData.max_lines || null,
      background: {
        materialBlur: bgFields.material_blur || null,
        colors: bgFields.colors || [],
      },
      icon: overlayData.icon || null,
      payload: overlayData.payload || null,
    },
    createTime,
    updateTime: createTime,
  };
}

const getLocketMomentsFromAPI = async (
  idToken,
  _userId,
  { timestamp, friendId, limit = 20, syncToken } = {},
) => {
  const body = {
    data: {
      should_count_missed_moments: true,
      excluded_users: [],
      include_group_moments: true,
      fetch_streak: false,
      ...(syncToken && { sync_token: syncToken }),
      ...(timestamp && {
        last_fetch: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: String(Math.floor(timestamp) * 1000),
        },
      }),
    },
  };

  try {
    const response = await instanceLocketV2.post("getLatestMomentV2", body, {
      meta: { idToken },
    });

    const result = response.data?.result;
    logInfo("getLocketMomentsFromAPI", `status=${response.status} result_keys=${JSON.stringify(Object.keys(result || {}))}`);

    const rawMoments = result?.data?.moments || result?.moments || [];
    const newSyncToken = result?.data?.sync_token || result?.sync_token || null;

    logInfo("getLocketMomentsFromAPI", `rawMoments.length=${rawMoments.length} syncToken=${newSyncToken}`);

    let moments = rawMoments.map(normalizeApiMoment).filter(Boolean);

    if (friendId) {
      moments = moments.filter((m) => m.user === friendId);
    }

    if (limit && moments.length > limit) {
      moments = moments.slice(0, limit);
    }

    return { moments, syncToken: newSyncToken };
  } catch (err) {
    logError("getLocketMomentsFromAPI", `status=${err.response?.status} error=${JSON.stringify(err.response?.data || err.message)}`);
    return { moments: [], syncToken: null };
  }
};

module.exports = { getLocketMomentsFromAPI };
