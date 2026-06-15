// moment-media.js
// Defensive accessors for a moment's media + owner. Backend shape varies across
// endpoints/proxies, so read several field aliases. Shared by feed, grid,
// camera, and the share sheet to keep the field list in one place.

import { CONFIG } from "@/config/webConfig";

export const getMomentImage = (m) =>
  m?.thumbnailUrl || m?.thumbnail_url || m?.image_url || m?.image || null;

export const getMomentVideo = (m) => m?.videoUrl || m?.video_url || null;

export const getMomentOwnerUid = (m) => m?.user ?? m?.userUid ?? m?.owner ?? null;

// Hosts whose images lack CORS headers — fetching them in the browser (for
// Save / Web Share) is blocked, so route those through the API image proxy.
const NO_CORS_HOSTS = ["cdn.locketcamera.com", "firebasestorage.googleapis.com"];

// Rewrite a CORS-less CDN image URL to the same-origin API proxy so the browser
// can fetch its bytes. Other hosts (e.g. self-hosted R2, already CORS-enabled)
// pass through unchanged. Display via <img src> never needs this.
export function proxyImageUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    if (!NO_CORS_HOSTS.includes(u.hostname)) return rawUrl;
    const base = (CONFIG.api.baseUrl || "").replace(/\/$/, "");
    return `${base}/api/proxyImage?url=${encodeURIComponent(rawUrl)}`;
  } catch {
    return rawUrl;
  }
}
