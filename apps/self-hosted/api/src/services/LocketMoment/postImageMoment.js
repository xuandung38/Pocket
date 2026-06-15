const { instanceLocketV2 } = require("../../libs");
const { logInfo, logError, logBanner } = require("../../utils/logEventUtils");
const { uploadImageToFirebaseStorage } = require("../FirestorageService");
const { creImagePayload } = require("../LocketPayload");

const postImageToLocket = async ({ userId, idToken, image, optionsData }) => {
  try {
    logInfo("postImage", "Start");

    if (!optionsData || !optionsData.type) {
      throw new Error("Missing optionsData.type");
    }

    const imageUrl = await uploadImageToFirebaseStorage(userId, idToken, image);

    const { type } = optionsData;

    logBanner(`Type đang sử dụng: ${type}`);

    let postData;

    switch (type) {
      // caption mặc định
      case "default":
        postData = creImagePayload.imagePostPayloadDefault({
          imageUrl,
          optionsData,
        });
        break;

      // decorative của Locket
      case "decorative":
        postData = creImagePayload.imagePostPayloadDecorative({
          imageUrl,
          optionsData,
        });
        break;
      // custom của Dio
      case "image_icon":
      case "image_gif":
      case "caption_icon":
      case "caption_gif":
      case "custome":
        postData = creImagePayload.imagePostPayloadCustome({
          imageUrl,
          optionsData,
        });
        break;

      case "poll":
        postData = creImagePayload.imagePostPayloadPoll({ imageUrl, optionsData });
        break;

      default:
        postData = creImagePayload.imagePostPayloadDecorative({
          imageUrl,
          optionsData,
        });
	break;
    }

    const postResponse = await instanceLocketV2.post("postMomentV2", postData, {
      meta: { idToken },
    });

    logInfo("postImage", "End");

    return postResponse.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.statusText ||
      error.message;

    logError("postImage", message);

    throw new Error(message);
  }
};

const postImageToLocketV2 = async ({
  userId,
  idToken,
  imageBuffer,
  optionsData,
}) => {
  try {
    logInfo("postImage", "Start");

    if (!optionsData || !optionsData.type) {
      throw new Error("Missing optionsData.type");
    }

    const imageUrl = await uploadImageToFirebaseStorage(
      userId,
      idToken,
      imageBuffer,
    );

    const { type } = optionsData;

    logBanner(`Type đang sử dụng: ${type}`);

    let postData;

    switch (type) {
      // caption mặc định
      case "default":
        postData = creImagePayload.imagePostPayloadDefault({
          imageUrl,
          optionsData,
        });
        break;

      // decorative của Locket
      case "decorative":
        postData = creImagePayload.imagePostPayloadDecorative({
          imageUrl,
          optionsData,
        });
        break;

      // weather overlay
      case "weather":
        postData = creImagePayload.imagePostPayloadWeather({
          imageUrl,
          optionsData,
        });
        break;

      case "time":
        postData = creImagePayload.imagePostPayloadTime({ imageUrl, optionsData });
        break;
      case "battery":
        postData = creImagePayload.imagePostPayloadBattery({ imageUrl, optionsData });
        break;
      case "steps":
        postData = creImagePayload.imagePostPayloadSteps({ imageUrl, optionsData });
        break;
      case "special":
        postData = creImagePayload.imagePostPayloadSpecial({ imageUrl, optionsData });
        break;
      case "background":
        postData = creImagePayload.imagePostPayloadBackground({ imageUrl, optionsData });
        break;

      case "poll":
        postData = creImagePayload.imagePostPayloadPoll({ imageUrl, optionsData });
        break;

      // custom của Dio
      case "image_icon":
      case "image_gif":
      case "caption_icon":
      case "caption_gif":
      default:
        postData = creImagePayload.imagePostPayloadIcon({
          imageUrl,
          optionsData,
        });
        break;

    }

    const postResponse = await instanceLocketV2.post("postMomentV2", postData, {
      meta: { idToken },
    });

    logInfo("postImage", "End");

    return postResponse.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.statusText ||
      error.message;

    logError("postImage", message);

    throw new Error(message);
  }
};

/**
 * Post ảnh lên Locket API với imageUrl đã có sẵn (client đã upload trực tiếp lên Firebase).
 * Không cần download/upload lại — chỉ tạo payload và gọi Locket API.
 */
const postImageToLocketDirect = async ({ idToken, imageUrl, optionsData }) => {
  try {
    logInfo("postImageDirect", "Start");

    const { type } = optionsData;
    let postData;

    switch (type) {
      case "default":
        postData = creImagePayload.imagePostPayloadDefault({ imageUrl, optionsData });
        break;
      case "decorative":
        postData = creImagePayload.imagePostPayloadDecorative({ imageUrl, optionsData });
        break;
      case "weather":
        postData = creImagePayload.imagePostPayloadWeather({ imageUrl, optionsData });
        break;
      case "time":
        postData = creImagePayload.imagePostPayloadTime({ imageUrl, optionsData });
        break;
      case "battery":
        postData = creImagePayload.imagePostPayloadBattery({ imageUrl, optionsData });
        break;
      case "steps":
        postData = creImagePayload.imagePostPayloadSteps({ imageUrl, optionsData });
        break;
      case "special":
        postData = creImagePayload.imagePostPayloadSpecial({ imageUrl, optionsData });
        break;
      case "background":
        postData = creImagePayload.imagePostPayloadBackground({ imageUrl, optionsData });
        break;
      case "poll":
        postData = creImagePayload.imagePostPayloadPoll({ imageUrl, optionsData });
        break;
      case "image_icon":
      case "image_gif":
      case "caption_icon":
      case "caption_gif":
        postData = creImagePayload.imagePostPayloadIcon({ imageUrl, optionsData });
        break;
      default:
        postData = creImagePayload.imagePostPayloadDecorative({ imageUrl, optionsData });
        break;
    }

    const postResponse = await instanceLocketV2.post("postMomentV2", postData, {
      meta: { idToken },
    });

    logInfo("postImageDirect", "End");
    return postResponse.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.statusText ||
      error.message;
    logError("postImageDirect", message);
    throw new Error(message);
  }
};

module.exports = {
  postImageToLocket,
  postImageToLocketV2,
  postImageToLocketDirect,
};
