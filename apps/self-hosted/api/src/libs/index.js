const { instanceAppcheck } = require("./instanceAppcheck");
const { instanceFirebaseV2 } = require("./instanceFirebase");
const { instanceFirestore, instanceFirestoreUpload } = require("./instanceFirestore");
const { createGoogleInstance } = require("./instanceGoogleBase");
const { instanceLocketV2 } = require("./instanceLocket");
const { instanceBeta } = require("./instanceBeta");

module.exports = {
  instanceFirebaseV2,
  instanceFirestore,
  instanceFirestoreUpload,
  instanceLocketV2,
  instanceBeta,
  instanceAppcheck,
  createGoogleInstance
};
