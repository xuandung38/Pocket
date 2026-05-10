const { getLocketMoments } = require("./getMoment");
const { postImageToLocket, postImageToLocketV2, postImageToLocketDirect } = require("./postImageMoment");
const { postVideoToLocket, postVideoToLocketV2 } = require("./postVideoMoment");

module.exports = {
  postImageToLocket,
  postImageToLocketV2,
  postImageToLocketDirect,

  postVideoToLocket,
  postVideoToLocketV2,

  getLocketMoments,
};
