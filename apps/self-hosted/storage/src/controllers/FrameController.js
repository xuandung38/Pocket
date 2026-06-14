"use strict";

// Frame CRUD controller — stores frame metadata as JSON on R2.
// R2 key layout:
//   frames/builtin.json          → global built-in frame list (seed-managed)
//   frames/users/{uid}.json      → per-user custom frame list
//   frames/builtin/{slug}.png    → built-in PNG assets (seed-managed)
//
// CONCURRENCY NOTE: createFrame/deleteFrame do a read-modify-write on the
// per-user JSON. For a personal app (one user per JSON file) this is fine.
// Concurrent requests from the same user within the same ms window could
// cause a lost write. A per-user queue or conditional ETag PUT would be needed
// at higher concurrency, but is intentionally out of scope here.

const crypto = require("crypto");
const { s3, DeleteObjectCommand } = require("../../config/r2-storage");
const constants = require("../constants/storageConfig");
const { getJson, putJson } = require("../services/frame-store-r2");

const USER_FRAME_CAP = 50;
const BUILTIN_KEY = "frames/builtin.json";

/** R2 key for a user's frame manifest */
const userKey = (uid) => `frames/users/${uid}.json`;

/** Sort frames by order ASC, then createdAt ASC */
function sortFrames(frames) {
  return frames.slice().sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

/**
 * GET /api/frames
 * Returns merged builtin + caller's user frames, sorted by order then createdAt.
 */
exports.listFrames = async (req, res) => {
  try {
    const { uid } = req.user;
    const [builtin, userFrames] = await Promise.all([
      getJson(BUILTIN_KEY),
      getJson(userKey(uid)),
    ]);
    const merged = sortFrames([...builtin, ...userFrames]);
    return res.status(200).json({ data: merged });
  } catch (err) {
    console.error("[FrameController] listFrames error:", err);
    return res.status(500).json({ error: "Failed to list frames" });
  }
};

/**
 * POST /api/frames
 * Body: { name, url, key }
 * Creates a user frame. Enforces uid-segment check on key and 50-frame cap.
 *
 * The `key` must contain the caller's uid because the presign path is
 * `LocketCloud/<day>/<type>/<uid>/<file>` — this prevents a user from
 * registering another user's R2 object as their own frame.
 */
exports.createFrame = async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, url, key } = req.body;

    if (!name || !url || !key) {
      return res.status(400).json({ error: "Missing required fields: name, url, key" });
    }

    // Reject keys that don't include the caller's uid segment
    if (!key.includes(uid)) {
      return res.status(400).json({ error: "Invalid key" });
    }

    const frames = await getJson(userKey(uid));

    if (frames.length >= USER_FRAME_CAP) {
      return res
        .status(400)
        .json({ error: `User frame cap of ${USER_FRAME_CAP} reached` });
    }

    const nextOrder =
      frames.length > 0 ? Math.max(...frames.map((f) => f.order)) + 1 : 0;

    /** @type {import('../types').Frame} */
    const frame = {
      id: crypto.randomUUID(),
      scope: "user",
      ownerUid: uid,
      name,
      type: "png",
      url,
      key,
      order: nextOrder,
      createdAt: new Date().toISOString(),
    };

    frames.push(frame);
    await putJson(userKey(uid), frames);

    return res.status(200).json({ data: frame });
  } catch (err) {
    console.error("[FrameController] createFrame error:", err);
    return res.status(500).json({ error: "Failed to create frame" });
  }
};

/**
 * DELETE /api/frames/:id
 * Deletes a caller-owned user frame and best-effort removes the R2 object.
 * Returns 404 if the frame id is not found in the caller's list.
 */
exports.deleteFrame = async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    const frames = await getJson(userKey(uid));
    const idx = frames.findIndex((f) => f.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Frame not found" });
    }

    const [removed] = frames.splice(idx, 1);
    await putJson(userKey(uid), frames);

    // Best-effort delete the underlying R2 object; never fail the API response on R2 errors
    if (removed.key) {
      s3.send(
        new DeleteObjectCommand({ Bucket: constants.BUCKET_NAME, Key: removed.key })
      ).catch((err) => {
        console.warn(
          `[FrameController] deleteFrame: R2 object delete failed for key "${removed.key}":`,
          err.message
        );
      });
    }

    return res.status(200).json({ data: { id } });
  } catch (err) {
    console.error("[FrameController] deleteFrame error:", err);
    return res.status(500).json({ error: "Failed to delete frame" });
  }
};
