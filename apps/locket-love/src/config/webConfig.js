// config/webConfig.js
//
// Centralized runtime configuration for Locket Love.
// All values are sourced from Vite-injected env vars so the same build can
// target self-hosted dev, staging, and prod by swapping `.env.*` files.

const env = import.meta.env;

// Fallback: when a service-specific URL is omitted, reuse VITE_API_URL.
// This mirrors the self-hosted (lovekit) convention and keeps single-origin
// deployments dead simple.
const apiBase = env.VITE_API_URL || "http://localhost:5001";
const pick = (specific) => (specific && specific.length > 0 ? specific : apiBase);

export const CONFIG = {
  api: {
    baseUrl: pick(env.VITE_BASE_API_URL), // REST + Socket primary host
    authUrl: pick(env.VITE_AUTH_API_URL),
    storage: pick(env.VITE_STORAGE_API_URL),
    data: pick(env.VITE_DATA_API_URL),
    payment: pick(env.VITE_PAYMENT_API_URL),
    cdnUrl: env.VITE_CDN_URL || "",
    locketApi: env.VITE_LOCKET_API_URL || "https://api.locketcamera.com",
    exportApi: pick(env.VITE_EXPORTS_API_URL),
    convertApi: pick(env.VITE_CONVERTS_API_URL),
    extenApi: pick(env.VITE_EXTENS_API_URL),
  },

  keys: {
    vapidPublicKey: env.VITE_VAPID_PUBLIC_KEY || "",
    turnstileKey: env.VITE_TURNSTILE_SITE_KEY || "",
    apiKey: env.VITE_PUBLIC_API_KEY || "LKD-LOCKETLOVE-PUBLIC-KEY",
  },

  app: {
    name: "Locket Love",
    author: "locket-love",
    shortname: "locketlove",
    fullName: "Locket Love — share warm moments",
    clientVersion: "1.0.0",
    apiVersion: "v2.2.1",
    startYear: 2025,
    env: env.MODE, // development | production
    camera: {
      limits: {
        maxRecordTime: 10, // seconds
        maxImageSizeMB: 10,
        maxVideoSizeMB: 10,
      },
      resolutions: {
        imageSizePx: 1920,
        videoResolutionPx: 1080,
      },
      constraints: {
        default: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        ultraHD: {
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
      },
    },
    moments: {
      initialVisible: 50,
      maxDisplayLimit: 5000,
      loadMoreLimit: 50,
      duplicateThreshold: 3,
    },
    messages: {
      initialVisible: 50,
      maxDisplayLimit: 5000,
      loadMoreLimit: 50,
    },
  },

  ui: {
    theme: "dark",
    maxToastVisible: 3,
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm:ss",
    moments: {
      initialVisible: 50,
      maxDisplayLimit: 5000,
      duplicateThreshold: 3,
    },
    chat: { initialVisible: 10 },
  },

  cache: {
    keys: {
      user: "userData",
      memberToken: "memberToken",
      memberHeader: "memberHeader",
    },
    ttl: {
      user: 24 * 60 * 60 * 1000, // 24h
    },
  },
};
