const axios = require("axios");
const serverConfig = require("../config/app.config");

const instanceBeta = axios.create({
  baseURL: serverConfig.function.betaApi,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": serverConfig.function.betaApiKey,
    "x-app-author": "lovekit",
    "x-app-name": "lovekit",
  },
});

instanceBeta.interceptors.request.use(
  (config) => {
    const token = config?.meta?.idToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

module.exports = { instanceBeta };
