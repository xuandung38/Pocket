// frame-services.js
// CRUD layer for photo-frame library.
//   getFrames      — GET  /api/frames  (built-in global + caller's custom, merged server-side)
//   createFrame    — POST /api/frames
//   deleteFrame    — DELETE /api/frames/:id
//   uploadCustomFrame — validate PNG → R2 upload → createFrame (full flow for UI)

import { CONFIG } from "@/config";
import { api } from "@/libs";
import { getToken } from "@/utils";
import { uploadFileAndGetInfoR2 } from "./storage-services";
import { validateFramePng } from "@/utils/validate-frame-png";

/**
 * Fetch all frames visible to the caller (built-in + own custom).
 * @returns {Promise<Array>}
 */
export const getFrames = async () => {
  const res = await api.get(`${CONFIG.api.storage}/api/frames`);
  // Storage service wraps responses as { data: ... }; unwrap .data.data
  return Array.isArray(res?.data?.data) ? res.data.data : [];
};

/**
 * Create a custom frame metadata record.
 * @param {{ name: string, url: string, key: string }} payload
 * @returns {Promise<object>} created frame
 */
export const createFrame = async ({ name, url, key }) => {
  const res = await api.post(`${CONFIG.api.storage}/api/frames`, { name, url, key });
  // Storage service wraps response; unwrap .data.data for the created frame object
  return res.data?.data;
};

/**
 * Delete a custom frame by id (caller must own it — enforced server-side).
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteFrame = async (id) => {
  await api.delete(`${CONFIG.api.storage}/api/frames/${id}`);
};

/**
 * Full custom-frame upload flow:
 *   1. Validate PNG (square + transparency) — throws on failure with Vietnamese message.
 *   2. Upload file to R2 via `uploadFileAndGetInfoR2`.
 *   3. Register metadata with `createFrame`.
 *
 * @param {File} file  - Must be image/png, square, with transparent pixels.
 * @returns {Promise<object>} created frame from backend
 * @throws {Error} with Vietnamese `message` on validation failure or upload error
 */
export const uploadCustomFrame = async (file) => {
  // Validate format before touching the network
  const validation = await validateFramePng(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const { localId } = getToken();
  const { downloadURL, metadata } = await uploadFileAndGetInfoR2(
    file,
    "image",
    localId,
  );

  return createFrame({ name: file.name, url: downloadURL, key: metadata.path });
};
