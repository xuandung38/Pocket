// moment-media.js
// Defensive accessors for a moment's media + owner. Backend shape varies across
// endpoints/proxies, so read several field aliases. Shared by feed, grid,
// camera, and the share sheet to keep the field list in one place.

export const getMomentImage = (m) =>
  m?.thumbnailUrl || m?.thumbnail_url || m?.image_url || m?.image || null;

export const getMomentVideo = (m) => m?.videoUrl || m?.video_url || null;

export const getMomentOwnerUid = (m) => m?.user ?? m?.userUid ?? m?.owner ?? null;
