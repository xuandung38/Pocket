// instanceLocket.js
// External Locket API proxy (api.locketcamera.com). Public V1 surface for
// scraping moments + login. Phase 2 will wire login through V2.

import axios from "axios";
import { CONFIG } from "@/config";
import { getToken } from "@/utils";

export const BASE_URL_LOCKET = CONFIG.api.locketApi;

export const instanceLocket = axios.create({
  baseURL: BASE_URL_LOCKET,
  httpAgent: "http",
  httpsAgent: "https",
  timeout: 30000,
});

// V2 — authenticated calls that need a Bearer token attached per request.
export const instanceLocketV2 = axios.create({
  baseURL: BASE_URL_LOCKET,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

instanceLocketV2.interceptors.request.use(
  (config) => {
    const { idToken } = getToken();
    if (idToken) {
      config.headers["Authorization"] = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
