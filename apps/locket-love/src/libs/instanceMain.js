// instanceMain.js
// Default authenticated REST client → CONFIG.api.baseUrl.
// Sibling of `api` (axios.js) but without the refresh-token retry loop, used
// by stores/services that handle auth errors themselves.

import axios from "axios";
import { CONFIG } from "@/config";
import { getToken } from "@/utils";

const BASE_URL = CONFIG.api.baseUrl;

const APP_META = {
  "x-app-author": CONFIG.app.author,
  "x-app-name": CONFIG.app.shortname,
  "x-app-client": CONFIG.app.clientVersion,
  "x-app-api": CONFIG.app.apiVersion,
  "x-app-env": CONFIG.app.env,
};

export const instanceMain = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": CONFIG.keys.apiKey,
    ...APP_META,
  },
});

instanceMain.interceptors.request.use(
  (config) => {
    const { idToken } = getToken();
    if (idToken) {
      config.headers["Authorization"] = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
