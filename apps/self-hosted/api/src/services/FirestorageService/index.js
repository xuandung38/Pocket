const {
  uploadImageToFirebaseStorage,
  initImageUploadSession,
  getFirebaseDownloadUrl,
} = require("./uploadImage");
const {
  uploadVideoToFirebaseStorage,
  uploadThumbnailFromVideo,
} = require("./uploadVideo");

module.exports = {
  uploadImageToFirebaseStorage,
  initImageUploadSession,
  getFirebaseDownloadUrl,
  uploadVideoToFirebaseStorage,
  uploadThumbnailFromVideo,
};
