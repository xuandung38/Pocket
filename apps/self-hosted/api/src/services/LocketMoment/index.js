const { getLocketMoments, getMomentInfo } = require("./getMoment");
const { getLocketMomentsFromAPI } = require("./getMomentFromAPI");
const { postImageToLocket, postImageToLocketV2, postImageToLocketDirect } = require("./postImageMoment");
const { postVideoToLocket, postVideoToLocketV2 } = require("./postVideoMoment");
const { deleteLocketMoment } = require("./deleteMoment");

module.exports = {
  postImageToLocket,
  postImageToLocketV2,
  postImageToLocketDirect,

  postVideoToLocket,
  postVideoToLocketV2,

  getLocketMoments,
  getLocketMomentsFromAPI,
  getMomentInfo,
  deleteLocketMoment,
};
