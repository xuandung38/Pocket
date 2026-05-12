// apiConfig.js
// REST + Socket endpoint shapes shared across the data layer.

import { CONFIG } from "./webConfig";

export const BASE_SERVER_HOST = CONFIG.api.baseUrl;
export const BETA_SERVER_HOST =
  import.meta.env.VITE_BETA_API_URL || CONFIG.api.baseUrl;

export const API_NAMESPACE = {
  main: "/api",
  locket: "/locket",
  chat: "/chat",
};

export const API_ENDPOINTS = {
  socketUrl: BASE_SERVER_HOST,
};

export const PUBLIC_API = {
  feeds: "v1/public/feeds",
  notifications: "v1/public/notification",
};
