// instanceAuth.js
// Auth/identity endpoints (login, refresh-token, verify) — points at AUTH_API_URL.
// Pulled out of the main pool so the refresh-token retry loop in axios.js can
// call it without recursing through its own interceptors.

import axios from "axios";
import { CONFIG } from "@/config";
import { getToken } from "@/utils";

const BASE_URL = CONFIG.api.authUrl;

const APP_META = {
  "x-app-author": CONFIG.app.author,
  "x-app-name": CONFIG.app.shortname,
  "x-app-client": CONFIG.app.clientVersion,
  "x-app-api": CONFIG.app.apiVersion,
  "x-app-env": CONFIG.app.env,
};

export const instanceAuth = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": CONFIG.keys.apiKey,
    ...APP_META,
  },
});

instanceAuth.interceptors.request.use(
  (config) => {
    const { idToken } = getToken();
    if (idToken) {
      config.headers["Authorization"] = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
