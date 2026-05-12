// createBase.js
// Factory for axios instances. Standardizes:
//   - Bearer auth from active idToken
//   - Optional member-token side-channel
//   - x-app-* meta headers for backend analytics / version negotiation
// Keeps each instance file thin (just baseURL + this factory call).

import axios from "axios";
import { CONFIG } from "@/config";
import { getToken, getMemberToken } from "@/utils";

const APP_META = {
  "x-app-author": CONFIG.app.author,
  "x-app-name": CONFIG.app.shortname,
  "x-app-client": CONFIG.app.clientVersion,
  "x-app-api": CONFIG.app.apiVersion,
  "x-app-env": CONFIG.app.env,
};

const attachHeaders = (config) => {
  const { idToken } = getToken();
  const member = getMemberToken();

  if (idToken) {
    config.headers["Authorization"] = `Bearer ${idToken}`;
  }

  if (member?.token && member?.header) {
    config.headers[member.header] = member.token;
  }

  Object.assign(config.headers, APP_META);

  return config;
};

// Default JSON client used for REST endpoints with a 30s timeout cap.
export const createHttpClient = (baseURL) => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.keys.apiKey,
    },
  });

  instance.interceptors.request.use(attachHeaders, (error) =>
    Promise.reject(error)
  );

  return instance;
};

// Upload client — no timeout cap (large media uploads can take a while).
export const createUploadClient = (baseURL) => {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.keys.apiKey,
    },
  });

  instance.interceptors.request.use(attachHeaders);
  return instance;
};
