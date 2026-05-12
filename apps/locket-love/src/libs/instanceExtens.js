// instanceExtens.js
// Extended services (CONFIG.api.extenApi). Auxiliary endpoints that don't
// belong to the main API surface but still need authenticated access.

import axios from "axios";
import { CONFIG } from "@/config";
import { getToken } from "@/utils";

export const BASE_URL_EXTEN = CONFIG.api.extenApi;

export const instanceExten = axios.create({
  baseURL: BASE_URL_EXTEN,
  httpAgent: "http",
  httpsAgent: "https",
  timeout: 30000,
});

instanceExten.interceptors.request.use(
  (config) => {
    const { idToken } = getToken();
    if (idToken) {
      config.headers["Authorization"] = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
