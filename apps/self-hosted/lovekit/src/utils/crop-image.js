import { createImage } from "./create-image";

export const getCroppedImg = async (imageSrc, crop, rotation = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  const croppedWidth = crop.width;
  const croppedHeight = crop.height;

  canvas.width = croppedWidth;
  canvas.height = croppedHeight;

  ctx.save();
  ctx.translate(croppedWidth / 2, croppedHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -croppedWidth / 2,
    -croppedHeight / 2,
    croppedWidth,
    croppedHeight
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      const file = new File([blob], "cropped-image.jpg", { type: blob.type });
      resolve(file);
    }, "image/jpeg");
  });
};
