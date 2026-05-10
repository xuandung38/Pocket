const { firebase } = require("./app.config");

// v3 (www.googleapis.com/identitytoolkit/v3) is deprecated — default to v1
const FIREBASE_API_MAP = {
  auth: firebase.apiBase.auth || "https://identitytoolkit.googleapis.com/v1/",
  appCheck: firebase.apiBase.appCheck,
  firestore: firebase.apiBase.firestore,
  secureToken: firebase.apiBase.secureToken || "https://securetoken.googleapis.com/",
};

module.exports = FIREBASE_API_MAP;