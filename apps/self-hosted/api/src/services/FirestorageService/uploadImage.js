const fs = require("fs");
const { logInfo, logError } = require("../../utils/logEventUtils");
const { instanceFirestoreUpload } = require("../../libs");

//#region Image handlers

/**
 * Uploads an image to Firebase Storage.
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {File|Buffer} image - The image to be uploaded. Can be a `File` object or a `Buffer`.
 * @returns
 */
const uploadImageToFirebaseStorage = async (userId, idToken, image) => {
  try {
    logInfo("uploadImageToFirebaseStorage", "Start");
    const imageName = `${Date.now()}_vtd182.webp`;

    // Bước 1: Khởi tạo quá trình upload
    const url = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/users%2F${userId}%2Fmoments%2Fthumbnails%2F${imageName}?uploadType=resumable&name=users%2F${userId}%2Fmoments%2Fthumbnails%2F${imageName}`;
    const initHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
      "x-goog-upload-protocol": "resumable",
      accept: "*/*",
      "x-goog-upload-command": "start",
      "x-goog-upload-content-length": `${image.size || image.length}`,
      "accept-language": "vi-VN,vi;q=0.9",
      "x-firebase-storage-version": "ios/10.13.0",
      "user-agent":
        "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
      "x-goog-upload-content-type": "image/webp",
      "x-firebase-gmpid": "1:641029076083:ios:cc8eb46290d69b234fa609",
    };

    const data = JSON.stringify({
      name: `users/${userId}/moments/thumbnails/${imageName}`,
      contentType: "image/*",
      bucket: "",
      metadata: { creator: userId, visibility: "private" },
    });

    const response = await fetch(url, {
      method: "POST",
      headers: initHeaders,
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Failed to start upload: ${response.statusText}`);
    }

    const uploadUrl = response.headers.get("X-Goog-Upload-URL");

    if (!uploadUrl) {
      throw new Error("Firebase did not return upload URL");
    }
    // Bước 2: Tải dữ liệu hình ảnh lên thông qua URL resumable trả về từ bước 1
    let imageBuffer;
    if (image instanceof Buffer) {
      imageBuffer = image;
    } else {
      imageBuffer = fs.readFileSync(image.path);
    }

    try {
      await instanceFirestoreUpload.put(uploadUrl, imageBuffer);
    } catch (err) {
      console.error("Upload error:", err);
      throw new Error("Failed to upload image");
    }

    // Lấy URL tải về hình ảnh từ Firebase Storage
    const getUrl = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/users%2F${userId}%2Fmoments%2Fthumbnails%2F${imageName}`;
    const getHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
    };

    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: getHeaders,
    });

    if (!getResponse.ok) {
      throw new Error(
        `Failed to get download token: ${getResponse.statusText}`,
      );
    }

    const downloadToken = (await getResponse.json()).downloadTokens;
    logInfo("uploadImageToFirebaseStorage", "End");

    return `${getUrl}?alt=media&token=${downloadToken}`;
  } catch (error) {
    logError("uploadImageToFirebaseStorage", error.message);
    throw error;
  } finally {
    // Xoá file ảnh tạm
    if (image.path) {
      fs.unlinkSync(image.path);
    }
  }
};
//#endregion

/**
 * Khởi tạo Firebase resumable upload session cho ảnh hoặc video.
 * Trả về uploadUrl (client dùng để PUT trực tiếp) và getUrl (để lấy download token sau khi upload xong).
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {number} fileSize - kích thước file (bytes)
 * @param {object} [opts]
 * @param {string} [opts.type="image"] - "image" hoặc "video"
 * @param {string} [opts.contentType] - MIME type override (mặc định theo `type`)
 * @returns {Promise<{ uploadUrl: string, getUrl: string }>}
 */
const initImageUploadSession = async (userId, idToken, fileSize, opts = {}) => {
  const type = opts.type === "video" ? "video" : "image";
  const isVideo = type === "video";

  // Bucket / folder / extension / MIME khác nhau giữa ảnh và video.
  // Match exactly with uploadImage.js (legacy) & uploadVideo.js để CORS + permissions giữ nguyên.
  const bucket = isVideo ? "locket-video" : "locket-img";
  const folder = isVideo ? "videos" : "thumbnails";
  const ext = isVideo ? "mp4" : "webp";
  const defaultMime = isVideo ? "video/mp4" : "image/webp";
  const contentType = opts.contentType || defaultMime;
  // Top-level contentType in the init body uses wildcard form (parity with legacy code paths).
  const objectContentType = isVideo ? "video/mp4" : "image/*";

  const objectName = `${Date.now()}_vtd182.${ext}`;
  const objectPath = `users/${userId}/moments/${folder}/${objectName}`;
  const encodedPath = encodeURIComponent(objectPath);

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?uploadType=resumable&name=${encodedPath}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
      "x-goog-upload-protocol": "resumable",
      accept: "*/*",
      "x-goog-upload-command": "start",
      "x-goog-upload-content-length": `${fileSize}`,
      "accept-language": "vi-VN,vi;q=0.9",
      "x-firebase-storage-version": "ios/10.13.0",
      "user-agent": "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
      "x-goog-upload-content-type": contentType,
      "x-firebase-gmpid": "1:641029076083:ios:cc8eb46290d69b234fa609",
    },
    body: JSON.stringify({
      name: objectPath,
      contentType: objectContentType,
      bucket: "",
      metadata: { creator: userId, visibility: "private" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firebase init upload failed: ${response.statusText}`);
  }

  const uploadUrl = response.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) throw new Error("Firebase did not return upload URL");

  const getUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}`;

  return { uploadUrl, getUrl };
};

/**
 * Lấy download URL từ Firebase sau khi client đã upload xong.
 */
const getFirebaseDownloadUrl = async (getUrl, idToken) => {
  const response = await fetch(getUrl, {
    method: "GET",
    headers: {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get download token: ${response.statusText}`);
  }

  const downloadToken = (await response.json()).downloadTokens;
  return `${getUrl}?alt=media&token=${downloadToken}`;
};

module.exports = {
  uploadImageToFirebaseStorage,
  initImageUploadSession,
  getFirebaseDownloadUrl,
};
