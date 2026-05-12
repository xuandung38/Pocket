import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { Scissors, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getCroppedImg } from "@/utils/crop-image";

/**
 * Square-aspect image cropper modal.
 *
 * State (read/write via AppContext.post):
 *  - imageToCrop  : string | null — object URL of the source image; presence drives visibility
 *  - selectedFile : File          — written with the cropped output
 *  - preview      : {type,data}   — written with the cropped object URL (consumed by CameraScreen)
 *  - isSizeMedia  : string        — size in MB (2 decimals) for UI/upload limits
 *
 * Image-only MVP: video crop fields on AppContext.post are intentionally not used here.
 */
const CropImageStudio = () => {
  // useApp() may be undefined if AppProvider isn't mounted yet (during partial integration).
  // Short-circuit render to avoid crashes; component becomes a no-op until provider exists.
  const app = useApp();
  if (!app?.post) return null;

  const {
    setSelectedFile,
    setPreview,
    setSizeMedia,
    imageToCrop,
    setImageToCrop,
  } = app.post;

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropError, setCropError] = useState("");
  const [showCropper, setShowCropper] = useState(false);

  // Cleanup previous object URL when source changes/closes to prevent memory leaks.
  // We only revoke URLs we own; callers are responsible for not passing stale URLs.
  const handleCancel = useCallback(() => {
    if (imageToCrop) {
      try {
        URL.revokeObjectURL(imageToCrop);
      } catch {
        /* noop */
      }
    }
    setImageToCrop(null);
    setCropError("");
  }, [imageToCrop, setImageToCrop]);

  const handleCropConfirm = useCallback(async () => {
    if (!croppedAreaPixels || !imageToCrop) return;
    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const localPreviewUrl = URL.createObjectURL(croppedFile);
      setSelectedFile(croppedFile);
      setPreview({ type: "image", data: localPreviewUrl });
      const fileSizeInMB = croppedFile.size / (1024 * 1024);
      setSizeMedia?.(fileSizeInMB.toFixed(2));
      // Revoke source URL we no longer need.
      try {
        URL.revokeObjectURL(imageToCrop);
      } catch {
        /* noop */
      }
      setImageToCrop(null);
    } catch (e) {
      console.error("Crop failed", e);
      setCropError(`⚠️ Không thể cắt ảnh. Chi tiết lỗi: ${e?.message || e}`);
    }
  }, [
    croppedAreaPixels,
    imageToCrop,
    setSelectedFile,
    setPreview,
    setSizeMedia,
    setImageToCrop,
  ]);

  // Reset crop/zoom when a new image is loaded.
  useEffect(() => {
    if (imageToCrop) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropError("");
    }
  }, [imageToCrop]);

  // Mount/unmount with a brief animation hold so the close transition can play.
  useEffect(() => {
    if (imageToCrop) {
      setShowCropper(true);
      return;
    }
    const timer = setTimeout(() => setShowCropper(false), 300);
    return () => clearTimeout(timer);
  }, [imageToCrop]);

  // Lock body scroll while cropper is visible.
  useEffect(() => {
    if (imageToCrop) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [imageToCrop]);

  if (!showCropper) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-base-100/30 backdrop-blur-xl
        transition-all duration-500 ease-in-out overflow-hidden
        ${imageToCrop ? "opacity-100" : "opacity-0 pointer-events-none"}
        flex flex-col`}
    >
      <div className="flex-1 h-[calc(100vh-180px)] flex items-center justify-center relative">
        <Cropper
          image={imageToCrop}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, area) => setCroppedAreaPixels(area)}
          cropShape="rect"
          showGrid={true}
          zoomWithScroll={true}
          touchAction="pan"
          objectFit="contain"
          restrictPosition={true}
          disableAutomaticStylesInjection={false}
          style={{
            containerStyle: {
              width: "100%",
              height: "100%",
            },
          }}
        />
      </div>

      <div className="w-full bg-base-200 -mt-6 pt-4 pb-5 px-4 shadow-lg z-10 relative rounded-t-3xl">
        <h1 className="text-xl font-lovehouse text-center text-base-content">
          🖼️ Crop Image Studio
        </h1>
        <p className="text-sm text-center text-gray-600 mt-1">
          Kéo ảnh lên/xuống hoặc zoom để chọn vùng muốn cắt
        </p>
        {cropError && (
          <p className="text-sm text-center text-red-500 font-medium mt-2 break-words">
            {cropError}
          </p>
        )}

        <div className="flex justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-outline btn-error"
          >
            <X className="mr-1" /> Huỷ
          </button>
          <button
            type="button"
            onClick={handleCropConfirm}
            className="btn btn-primary"
          >
            <Scissors className="mr-1" /> Cắt ảnh
          </button>
        </div>
        <p className="text-xs italic text-center text-gray-400 mt-1">
          Nếu gặp lỗi, vui lòng báo với admin.
        </p>
      </div>
    </div>
  );
};

export default CropImageStudio;
