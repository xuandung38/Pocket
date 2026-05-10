const { instanceFirestore } = require("../../libs");

const getLocketMoments = async (
  idToken,
  userId,
  pageToken,
  userUid,
  limit = 20,
) => {
  const params = {
    orderBy: "date desc",
    pageSize: pageToken ? 100 : limit,
  };

  if (pageToken) params.pageToken = pageToken;

  try {
    const response = await instanceFirestore.get(
      `/locket/documents/history/${userId}/entries`,
      {
        params,
        meta: {
          idToken,
        },
      },
    );
    const documents = response.data.documents || [];

    // ✅ Chuẩn hoá ngay tại server
    const moments = documents
      .map((doc) => {
        const moment = normalizeMoment(doc);
        if (userUid && moment?.user !== userUid) return null;
        return moment;
      })
      .filter(Boolean);

    return {
      moments,
      nextPageToken: response.data.nextPageToken || null,
    };
  } catch (error) {
    console.error(
      "❌ Lỗi khi lấy moments:",
      error.response?.data || error.message,
    );
    return {
      moments: [],
      nextPageToken: null,
    };
  }
};

function normalizeMoment(doc) {
  if (!doc || !doc.fields) return null;

  const f = doc.fields;
  const overlays = f.overlays?.arrayValue?.values || [];

  // chỉ lấy overlay đầu tiên (nếu có)
  const overlay = overlays[0]?.mapValue?.fields || {};
  const overlayData = overlay.data?.mapValue?.fields || {};

  const backgroundFields = overlayData.background?.mapValue?.fields || {};

  const getIsPublic = (f) => {
    const sentToAll = parseFirestoreValue(f.sent_to_all);
    const sentToSelfOnly = parseFirestoreValue(f.sent_to_self_only);

    // Ưu tiên sent_to_self_only nếu có true
    if (sentToSelfOnly) return false;
    if (sentToAll) return true;
    return false;
  };

  return {
    id: f.canonical_uid?.stringValue || doc.name.split("/").pop(),
    caption: f.caption?.stringValue || overlay.alt_text?.stringValue || "",
    user: f.user?.stringValue || null,
    thumbnailUrl: replaceFirebaseWithCDN(f.thumbnail_url?.stringValue),
    videoUrl: replaceFirebaseWithCDN(f.video_url?.stringValue),
    md5: f.md5?.stringValue || null,
    date: f.date?.timestampValue || doc.createTime || null,
    isPublic: getIsPublic(f),
    overlays: {
      id: overlay.overlay_id?.stringValue || null,
      type: overlay.overlay_type?.stringValue || null,
      text: overlayData.text?.stringValue || null,
      textColor: overlayData.text_color?.stringValue || null,
      maxLines: overlayData.max_lines?.integerValue
        ? parseInt(overlayData.max_lines.integerValue, 10)
        : null,
      background: {
        materialBlur:
          overlayData.background?.mapValue?.fields?.material_blur
            ?.stringValue || null,
        colors: parseFirestoreValue(backgroundFields.colors) || [],
      },
      icon: parseFirestoreValue(overlayData.icon),
      payload: parseFirestoreValue(overlayData.payload),
    },
    createTime: doc.createTime || null,
    updateTime: doc.updateTime || null,
  };
}

function replaceFirebaseWithCDN(url) {
  if (!url) return null; // hoặc "" nếu bạn muốn
  return url.replace(
    "https://firebasestorage.googleapis.com",
    "https://cdn.locketcamera.com",
  );
}

function parseFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue !== undefined) {
    const fields = v.mapValue.fields || {};
    const obj = {};
    for (const key in fields) {
      obj[key] = parseFirestoreValue(fields[key]);
    }
    return obj;
  }
  if (v.arrayValue !== undefined) {
    return (v.arrayValue.values || []).map(parseFirestoreValue);
  }
  return null;
}

// Get reactions for a specific moment using Firestore collection group query
const getMomentInfo = async (idToken, userId, idMoment) => {
  try {
    // Reactions are stored as a subcollection under the moment entry.
    // Use runQuery on the (default) database to find reactions where
    // canonical_uid matches the moment ID across all users.
    const response = await instanceFirestore.post(
      `(default)/documents:runQuery`,
      {
        structuredQuery: {
          from: [{ collectionId: "reactions", allDescendants: true }],
          where: {
            fieldFilter: {
              field: { fieldPath: "moment_uid" },
              op: "EQUAL",
              value: { stringValue: idMoment },
            },
          },
        },
      },
      { meta: { idToken } },
    );

    const docs = (response.data || [])
      .filter((item) => item.document?.fields)
      .map((item) => {
        const f = item.document.fields;
        return {
          user: parseFirestoreValue(f.user_uid || f.user || f.uid),
          emoji: parseFirestoreValue(f.reaction || f.emoji),
          intensity: parseFirestoreValue(f.intensity) || 0,
          createdAt: parseFirestoreValue(f.created_at || f.date) || null,
        };
      })
      .filter((r) => r.user && r.emoji);

    return { reactions: docs };
  } catch {
    return { reactions: [] };
  }
};

module.exports = {
  getLocketMoments,
  getMomentInfo,
};
