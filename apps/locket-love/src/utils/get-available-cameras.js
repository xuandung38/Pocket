// Enumerate and classify the device's video cameras.
// When labels are absent (permission not yet granted), we request a temporary
// getUserMedia stream to unlock labels, then stop it immediately so we don't
// hold the camera open longer than needed.

const FRONT_REGEX =
  /mặt trước|front|user|trước|facing front|selfie|camera2 1|camera1 1/i;
const BACK_REGEX =
  /mặt sau|back|rear|environment|sau|facing back|outer|world|camera2 0|camera1 0/i;
const ULTRAWIDE_REGEX = /cực rộng|ultra|0\.5x|góc rộng|camera2 2/i;
const ZOOM_REGEX = /chụp xa|tele|zoom|2x|3x|5x/i;
// Normal back camera: has a generic "camera" label but isn't ultrawide or zoom.
const NORMAL_BACK_REGEX = /camera kép|camera|bình thường|1x|rộng/i;

/**
 * Classify a flat array of videoinput MediaDeviceInfo objects into named roles.
 * @param {MediaDeviceInfo[]} videoDevices
 * @returns {{ allCameras, frontCameras, backCameras, backUltraWideCamera, backNormalCamera, backZoomCamera }}
 */
function classifyVideoDevices(videoDevices) {
  const frontCameras = [];
  const backCameras = [];

  let backUltraWideCamera = null;
  let backNormalCamera = null;
  let backZoomCamera = null;

  for (const device of videoDevices) {
    const label = device.label.toLowerCase();

    if (FRONT_REGEX.test(label)) {
      frontCameras.push(device);
    } else if (BACK_REGEX.test(label)) {
      backCameras.push(device);

      if (ULTRAWIDE_REGEX.test(label)) {
        backUltraWideCamera ??= device;
      } else if (ZOOM_REGEX.test(label)) {
        backZoomCamera ??= device;
      } else if (NORMAL_BACK_REGEX.test(label) && !ULTRAWIDE_REGEX.test(label) && !ZOOM_REGEX.test(label)) {
        backNormalCamera ??= device;
      }
    }
  }

  // Devices that matched neither front nor back pattern.
  const remaining = videoDevices.filter(
    (d) =>
      !frontCameras.some((c) => c.deviceId === d.deviceId) &&
      !backCameras.some((c) => c.deviceId === d.deviceId),
  );

  // Promote first unclassified device to back so we always have something.
  if (!backCameras.length && remaining.length) {
    backCameras.push(remaining[0]);
  }

  // Promote first non-back device to front when nothing matched the front pattern.
  if (!frontCameras.length) {
    const fallbackFront = videoDevices.find(
      (d) => !backCameras.some((c) => c.deviceId === d.deviceId),
    );
    if (fallbackFront) frontCameras.push(fallbackFront);
  }

  // Always have a "normal" back camera to fall back to when switching lenses.
  backNormalCamera ??= backCameras[0] ?? null;

  return {
    allCameras: videoDevices,
    frontCameras,
    backCameras,
    backUltraWideCamera,
    backNormalCamera,
    backZoomCamera,
  };
}

/**
 * Enumerate available video cameras and return them classified by role.
 * Requests a temporary permission stream when labels are hidden so the
 * caller gets labelled devices on the first meaningful call.
 *
 * @returns {Promise<ReturnType<classifyVideoDevices>>}
 */
export async function getAvailableCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  let videoDevices = devices.filter((d) => d.kind === "videoinput");

  const hasLabels = videoDevices.some((d) => d.label);

  if (!hasLabels) {
    // Probe getUserMedia to trigger the browser permission prompt and unlock labels.
    const permissionStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    try {
      const refreshed = await navigator.mediaDevices.enumerateDevices();
      videoDevices = refreshed.filter((d) => d.kind === "videoinput");
    } finally {
      // Release the probe stream immediately — we only needed the labels.
      permissionStream.getTracks().forEach((t) => t.stop());
    }
  }

  return classifyVideoDevices(videoDevices);
}
