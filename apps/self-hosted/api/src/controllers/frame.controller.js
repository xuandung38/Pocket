// Frame library controller — Firestore-backed per-user custom frames + global built-ins.
// Reuses instanceFirestore (Firestore REST API via axios) from libs/instanceFirestore.js,
// the same pattern as LocketFriend/index.js and LocketMoment/getMoment.js.
// Auth: verifyIdToken middleware — req.user = { idToken, localId, ... }.

"use strict";

const axios = require("axios");
const { instanceFirestore } = require("../libs/instanceFirestore");
const { services } = require("../config/app.config");

// Firestore REST path prefix (relative to instanceFirestore.baseURL).
// instanceFirestore.baseURL = FIREBASE_FIRESTORE_API_BASE, which ends at the databases/ level,
// e.g. https://firestore.googleapis.com/v1/projects/{project}/databases/
// So all paths below are appended: (default)/documents/...
const FRAMES_PATH = "(default)/documents/frames";
const RUNQUERY_PATH = "(default)/documents:runQuery";
const CUSTOM_FRAME_CAP = 50;

// Convert a raw Firestore document REST response to a plain frame object.
function normalizeFrame(doc) {
  if (!doc || !doc.name) return null;
  const f = doc.fields || {};
  return {
    id: doc.name.split("/").pop(),
    scope: f.scope?.stringValue || "user",
    ownerUid: f.ownerUid?.stringValue || null,
    name: f.name?.stringValue || "",
    type: f.type?.stringValue || "png",
    url: f.url?.stringValue || null,
    key: f.key?.stringValue || null,
    order: f.order?.integerValue ? parseInt(f.order.integerValue, 10) : 0,
    createdAt: f.createdAt?.timestampValue || doc.createTime || null,
  };
}

// Build a Firestore AND composite filter for scope + ownerUid queries.
function buildUserFrameFilter(localId) {
  return {
    compositeFilter: {
      op: "AND",
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: "scope" },
            op: "EQUAL",
            value: { stringValue: "user" },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: "ownerUid" },
            op: "EQUAL",
            value: { stringValue: localId },
          },
        },
      ],
    },
  };
}

// Run a Firestore structuredQuery and return normalized frame docs.
async function runFrameQuery(idToken, structuredQuery) {
  const res = await instanceFirestore.post(RUNQUERY_PATH, { structuredQuery }, { meta: { idToken } });
  return (res.data || [])
    .filter((item) => item.document?.fields)
    .map((item) => normalizeFrame(item.document));
}

// GET /api/frames — merge global built-ins + caller's own custom frames.
// Built-ins sorted by order ASC; user frames sorted by createdAt ASC (appended after).
async function listFrames(req, res, next) {
  try {
    const { idToken, localId } = req.user;

    const [builtinFrames, userFrames] = await Promise.all([
      runFrameQuery(idToken, {
        from: [{ collectionId: "frames" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "scope" },
            op: "EQUAL",
            value: { stringValue: "builtin" },
          },
        },
        orderBy: [{ field: { fieldPath: "order" }, direction: "ASCENDING" }],
      }),
      runFrameQuery(idToken, {
        from: [{ collectionId: "frames" }],
        where: buildUserFrameFilter(localId),
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "ASCENDING" }],
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: [...builtinFrames, ...userFrames],
      message: "ok",
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/frames — create a custom frame from an already-uploaded R2 URL.
// Body: { name: string, url: string, key: string }
// Enforces a cap of CUSTOM_FRAME_CAP custom frames per user.
async function createFrame(req, res, next) {
  try {
    const { idToken, localId } = req.user;
    const { name, url, key } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Missing or empty 'name'" });
    }
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "Missing 'url'" });
    }
    if (!key || typeof key !== "string") {
      return res.status(400).json({ success: false, message: "Missing 'key'" });
    }
    // Storage path convention: LocketCloud/<day>/<type>/<uid>/<file>
    // Reject keys that don't contain the caller's uid segment so a user
    // cannot register another user's R2 object and later trigger its deletion.
    if (!key.includes("/" + localId + "/")) {
      return res.status(400).json({ success: false, message: "Invalid key" });
    }

    // Count existing custom frames for this user (cap enforcement).
    // Note: do NOT use a __name__-only projection here — Firestore returns docs
    // without a `fields` map when projected to __name__ alone, which causes the
    // runFrameQuery filter (item.document?.fields) to drop all rows → count = 0.
    const existing = await runFrameQuery(idToken, {
      from: [{ collectionId: "frames" }],
      where: buildUserFrameFilter(localId),
    });

    if (existing.length >= CUSTOM_FRAME_CAP) {
      return res.status(400).json({
        success: false,
        message: `Custom frame cap of ${CUSTOM_FRAME_CAP} reached. Delete an existing frame first.`,
      });
    }

    const now = new Date().toISOString();
    const docBody = {
      fields: {
        scope: { stringValue: "user" },
        ownerUid: { stringValue: localId },
        name: { stringValue: name.trim() },
        type: { stringValue: "png" },
        url: { stringValue: url },
        key: { stringValue: key },
        order: { integerValue: "0" },
        createdAt: { timestampValue: now },
      },
    };

    // POST to collection creates a doc with a Firestore-assigned auto-ID.
    const createRes = await instanceFirestore.post(FRAMES_PATH, docBody, { meta: { idToken } });

    return res.status(201).json({
      success: true,
      data: normalizeFrame(createRes.data),
      message: "Frame created",
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/frames/:id — delete a caller-owned custom frame.
// Blocks: deleting builtin frames, or frames owned by another user.
// Best-effort: also deletes the R2 object via the storage service HTTP API.
async function deleteFrame(req, res, next) {
  try {
    const { idToken, localId } = req.user;
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({ success: false, message: "Missing frame id" });
    }

    // Fetch the document to verify it exists and check ownership.
    let doc;
    try {
      const getRes = await instanceFirestore.get(
        `${FRAMES_PATH}/${id}`,
        { meta: { idToken } },
      );
      doc = getRes.data;
    } catch (getErr) {
      if (getErr.response?.status === 404) {
        return res.status(404).json({ success: false, message: "Frame not found" });
      }
      throw getErr;
    }

    if (!doc || !doc.fields) {
      return res.status(404).json({ success: false, message: "Frame not found" });
    }

    const scope = doc.fields.scope?.stringValue;
    const ownerUid = doc.fields.ownerUid?.stringValue;

    // Ownership and scope enforcement.
    if (scope !== "user") {
      return res.status(403).json({ success: false, message: "Built-in frames cannot be deleted" });
    }
    if (ownerUid !== localId) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this frame" });
    }

    // Delete the Firestore document.
    await instanceFirestore.delete(`${FRAMES_PATH}/${id}`, { meta: { idToken } });

    // Best-effort: remove the R2 object via the storage HTTP service.
    const r2Key = doc.fields.key?.stringValue;
    if (r2Key && services.storageUrl) {
      axios
        .post(
          `${services.storageUrl}/api/delete`,
          { key: r2Key },
          { headers: { "Content-Type": "application/json" } },
        )
        .catch((r2Err) => {
          // Non-fatal: log warning but do not fail the response.
          console.warn(`[frame] R2 delete best-effort failed for key ${r2Key}:`, r2Err.message);
        });
    }

    return res.status(200).json({ success: true, message: "Frame deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = { listFrames, createFrame, deleteFrame };
