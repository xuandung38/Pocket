import { getToken } from "@/utils";
import {
  uploadFileAndGetInfoR2,
  uploadFileViaInitFinalize,
} from "./StorageServices";
import { useStreakStore } from "@/stores";
import { SonnerWarning } from "@/components/ui/SonnerToast";

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
      ...(postOverlay.weatherData && { payload: postOverlay.weatherData }),
      ...(postOverlay.payload && { payload: postOverlay.payload }),
    };

    // Upload directly to Firebase via /locket/initUpload + /locket/finalizeUpload
    // (browser → Firebase, VPS bandwidth = 0). For images we use the BE "direct"
    // path (mediaInfo.imageUrl) which skips the server-side download+reupload.
    // For videos we still need server-side processing (thumbnail, transcode), so
    // we use the "indirect" path with url/path/name/size/type fields.
    const fileInfo = await uploadFileViaInitFinalize(
      selectedFile,
      previewType,
      localId
    );

    const isVideo = String(previewType).toLowerCase() === "video";
    const mediaInfo = isVideo
      ? {
          url: fileInfo.downloadURL,
          path: fileInfo.metadata.path,
          name: fileInfo.metadata.name,
          size: fileInfo.metadata.size,
          uploadedAt: fileInfo.metadata.uploadedAt,
          type: previewType,
        }
      : {
          // BE fast path — postImageToLocketDirect, no server download/reupload
          imageUrl: fileInfo.downloadURL,
        };

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
      ...(postOverlay.weatherData && { payload: postOverlay.weatherData }),
      ...(postOverlay.payload && { payload: postOverlay.payload }),
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
