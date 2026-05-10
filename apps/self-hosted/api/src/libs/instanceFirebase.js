const axios = require("axios");
const constants = require("../utils/constants");
const { firebase } = require("../config/app.config");

// v3 (www.googleapis.com/identitytoolkit/v3) is deprecated — default to v1
// fetch adapter bypasses follow-redirects which causes ECONNRESET in Docker for Google APIs
const instanceFirebaseV2 = axios.create({
  baseURL: firebase.apiBase.auth || "https://identitytoolkit.googleapis.com/v1/",
  timeout: 30000,
  adapter: "fetch",
  params: {
    key: firebase.apiKey,
  },
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": constants.USER_AGENT,
    "X-Ios-Bundle-Identifier": constants.IOS_BUNDLE_ID,
  },
});

module.exports = { instanceFirebaseV2 };
