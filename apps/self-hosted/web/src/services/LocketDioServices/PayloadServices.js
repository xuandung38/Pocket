import { getToken } from "@/utils";
import { uploadFileAndGetInfoR2 } from "./StorageServices";
import { useStreakStore } from "@/stores";
import { SonnerWarning } from "@/components/ui/SonnerToast";
import { instanceAuth } from "@/lib/axios.auth";

/**
 * Upload ảnh trực tiếp lên Firebase Storage từ client.
 * Server chỉ khởi tạo session và lấy download token — VPS không tốn bandwidth.
 */
const uploadImageDirectToFirebase = async (file) => {
  // 1. Lấy Firebase upload URL từ server
  const { data: { uploadUrl, getUrl } } = await instanceAuth.post("locket/initUpload", {
    fileSize: file.size,
  });

  // 2. Client PUT file thẳng lên Firebase
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-goog-upload-command": "upload, finalize",
      "x-goog-upload-offset": "0",
      "upload-incomplete": "?0",
      "upload-draft-interop-version": "3",
      "user-agent": "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Firebase upload failed: ${uploadRes.statusText}`);
  }

  // 3. Lấy download URL từ server
  const { data: { downloadUrl } } = await instanceAuth.post("locket/finalizeUpload", {
    getUrl,
  });

  return downloadUrl;
};

// Hàm con xác định recipients
const determineRecipients = (audience, selectedRecipients, localId) => {
  if (audience === "selected") return selectedRecipients || [];
  if (audience === "private") return localId ? [localId] : [];
  // Trường hợp public hoặc khác trả về mảng rỗng
  return [];
};
//Bản chính mới nhất
export const createRequestPayloadV5 = async (
  selectedFile,
  previewType,
  postOverlay,
  audience,
  selectedRecipients
) => {
  try {
    const { localId } = getToken() || {};
    const isStreakToday = useStreakStore.getState().isStreakUpdatedToday();

    if (!localId) {
      SonnerWarning("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      return null;
    }
    const optionsData = {
      caption: postOverlay.caption,
      overlay_id: postOverlay.overlay_id,
      type: postOverlay.type,
      icon: postOverlay.icon,
      text_color: postOverlay.text_color,
      color_top: postOverlay.color_top,
      color_bottom: postOverlay.color_bottom,
      audience,
      recipients: determineRecipients(audience, selectedRecipients, localId),
      music: postOverlay?.music || "",
      isStreaktoday: isStreakToday,
      ...(postOverlay.weatherData && { weatherData: postOverlay.weatherData }),
    };

    let mediaInfo;

    if (previewType === "image") {
      // Ảnh: client upload thẳng lên Firebase, VPS không tốn bandwidth
      const imageUrl = await uploadImageDirectToFirebase(selectedFile);
      mediaInfo = { imageUrl, type: previewType };
    } else {
      // Video: giữ luồng cũ qua R2 (cần server compress + tạo thumbnail)
      const fileInfo = await uploadFileAndGetInfoR2(selectedFile, previewType, localId);
      mediaInfo = {
        url: fileInfo.downloadURL,
        path: fileInfo.metadata.path,
        name: fileInfo.metadata.name,
        size: fileInfo.metadata.size,
        uploadedAt: fileInfo.metadata.uploadedAt,
        type: previewType,
      };
    }

    // Tạo payload cuối cùng
    const payload = {
      options: optionsData,
      model: "Version-UploadmediaV3.1",
      mediaInfo,
      contentType: previewType,
    };

    return payload;
  } catch (error) {
    console.error("Lỗi khi tạo payload:", error);
    throw error;
  }
};

export const createRequestPayloadV4 = async (
  selectedFile,
  previewType,
  postOverlay,
  restoreStreak,
  audience,
  selectedRecipients
) => {
  try {
    const { localId } = getToken() || {};

    if (!localId) {
      SonnerWarning("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      return null;
    }
    // Upload file & chuẩn bị thông tin media
    const fileInfo = await uploadFileAndGetInfoR2(
      selectedFile,
      previewType,
      localId
    );
    // console.log(fileInfo);

    const mediaInfo = {
      url: fileInfo.downloadURL,
      path: fileInfo.metadata.path, // đường dẫn đầy đủ trong Storage
      name: fileInfo.metadata.name, // tên file
      size: fileInfo.metadata.size, // kích thước file (bytes)
      uploadedAt: fileInfo.metadata.uploadedAt, // thời gian tạo
      type: previewType,
    };

    // Chuẩn bị dữ liệu tùy chọn (caption, overlay, v.v.)
    const optionsData = {
      caption: postOverlay.caption,
      overlay_id: postOverlay.overlay_id,
      type: postOverlay.type,
      icon: postOverlay.icon,
      text_color: postOverlay.text_color,
      color_top: postOverlay.color_top,
      color_bottom: postOverlay.color_bottom,
      audience,
      recipients: determineRecipients(audience, selectedRecipients, localId),
      music: postOverlay?.music || "",
      ...(postOverlay.weatherData && { weatherData: postOverlay.weatherData }),
    };

    // Chỉ thêm restoreStreakDate nếu mode là "restore"
    if (restoreStreak?.mode === "restore") {
      optionsData.restoreStreakDate = restoreStreak;
    }

    // Tạo payload cuối cùng
    const payload = {
      // userData: { idToken: idToken, localId },
      options: optionsData,
      model: "Version-UploadmediaV3.1",
      mediaInfo,
      contentType: previewType,
    };

    return payload;
  } catch (error) {
    console.error("Lỗi khi tạo payload:", error);
    throw error;
  }
};
