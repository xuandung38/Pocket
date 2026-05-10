const os = require("os");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { logError } = require("../../utils/logEventUtils");
const { getTodayFolder } = require("../../utils/getTodayFolder");

const downloadMediaOnStorage = async (
  url,
  mediaType = "image",
  filename = "temp"
) => {
  try {
    // Thư mục tạm dựa trên hệ thống
    const tmpBaseDir = path.join(os.tmpdir(), "dowloads-media");

    // Thư mục con theo loại media
    const downloadDir =
      mediaType === "image"
        ? path.join(tmpBaseDir, getTodayFolder(), "images")
        : path.join(tmpBaseDir, getTodayFolder(), "videos");

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Xác định phần mở rộng
    const ext = mediaType === "image" ? ".webp" : ".mp4";

    // Loại bỏ phần mở rộng cũ nếu filename đã có
    let safeName = filename.replace(/\//g, "_");
    if (!safeName.endsWith(ext)) {
      safeName += ext;
    }

    // Đường dẫn file cuối cùng
    const downloadPath = path.join(downloadDir, safeName);

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    if (response.status !== 200) {
      throw new Error(`Tải media thất bại với mã lỗi: ${response.status}`);
    }

    const writer = fs.createWriteStream(downloadPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      // Guard against double-rejection if both streams error
      let settled = false;
      const rejectOnce = (err) => {
        if (!settled) { settled = true; reject(err); }
      };

      response.data.on("error", (err) =>
        rejectOnce(new Error("Lỗi stream nguồn: " + err.message))
      );
      writer.on("error", (err) =>
        rejectOnce(new Error("Lỗi ghi file: " + err.message))
      );
      writer.on("finish", () => {
        fs.readFile(downloadPath, (err, data) => {
          if (err) return rejectOnce(new Error("Lỗi đọc file tạm: " + err.message));
          settled = true;
          resolve({ buffer: data, path: downloadPath });
        });
      });
    });
  } catch (err) {
    logError(
      "downloadMediaOnStorage",
      `❌ Lỗi khi tải media từ URL: ${err.message}`
    );
    return null;
  }
};

module.exports = { downloadMediaOnStorage };
