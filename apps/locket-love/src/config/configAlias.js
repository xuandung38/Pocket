// configAlias.js
// Convenience re-exports of nested CONFIG slices. Keeps consumer imports terse:
// `import { CACHE_CONFIG } from "@/config"` instead of digging through `CONFIG.cache.*`.

import { CONFIG } from "@/config/webConfig";

export const MOMENTS_CONFIG = {
  maxDisplayLimit: CONFIG.app.moments.maxDisplayLimit,
  duplicateThreshold: CONFIG.app.moments.duplicateThreshold,
  initialVisible: CONFIG.app.moments.initialVisible,
  loadMoreLimit: CONFIG.app.moments.loadMoreLimit,
};

export const MESSAGES_CONFIG = {
  maxDisplayLimit: CONFIG.app.messages.maxDisplayLimit,
  initialVisible: CONFIG.app.messages.initialVisible,
  loadMoreLimit: CONFIG.app.messages.loadMoreLimit,
};

export const CAMERA_CONFIG = {
  maxRecordTime: CONFIG.app.camera.limits.maxRecordTime,
  imageSizePx: CONFIG.app.camera.resolutions.imageSizePx,
  videoResolutionPx: CONFIG.app.camera.resolutions.videoResolutionPx,
  maxImageSizeMB: CONFIG.app.camera.limits.maxImageSizeMB,
  maxVideoSizeMB: CONFIG.app.camera.limits.maxVideoSizeMB,
};

export const CACHE_CONFIG = {
  keys: CONFIG.cache.keys,
  ttls: CONFIG.cache.ttl,
};
