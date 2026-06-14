// validate-frame-png.js
// Browser-side validation for custom photo-frame PNGs before upload.
// Checks two requirements:
//   1. Square: naturalWidth === naturalHeight.
//   2. Has transparency: at least one pixel with alpha < 255.
// Downscales to 64×64 canvas for a fast pixel scan on large files.

/**
 * Validate that `file` is a square PNG with at least one transparent pixel.
 *
 * @param {File} file
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function validateFramePng(file) {
  if (!file || file.type !== "image/png") {
    return { ok: false, reason: "Chỉ chấp nhận file PNG." };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // 1. Square check
      if (img.naturalWidth !== img.naturalHeight) {
        resolve({
          ok: false,
          reason: "Khung phải có kích thước vuông (chiều rộng = chiều cao).",
        });
        return;
      }

      // 2. Transparency check — downscale to 64² for speed
      const SIZE = 64;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, SIZE, SIZE);

      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
      // RGBA layout: alpha channel is every 4th byte starting at index 3
      let hasTransparency = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          hasTransparency = true;
          break;
        }
      }

      if (!hasTransparency) {
        resolve({
          ok: false,
          reason:
            "Khung phải có vùng trong suốt (không có pixel alpha < 255). Vui lòng dùng PNG có nền trong suốt.",
        });
        return;
      }

      resolve({ ok: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ ok: false, reason: "Không thể đọc file ảnh. Vui lòng thử lại." });
    };

    img.src = objectUrl;
  });
}
