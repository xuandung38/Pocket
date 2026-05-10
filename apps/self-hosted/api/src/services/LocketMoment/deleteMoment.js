const { instanceLocketV2 } = require("../../libs");
const { logError } = require("../../utils/logEventUtils");

const deleteLocketMoment = async (idToken, momentUid) => {
  try {
    const response = await instanceLocketV2.post(
      "deleteMomentV2",
      { data: { moment_uid: momentUid } },
      { meta: { idToken } },
    );

    const result = response.data?.result;
    if (result?.status && result.status !== 200) {
      throw new Error(result?.errors?.[0] || "Delete failed");
    }

    return { success: true };
  } catch (err) {
    logError("deleteLocketMoment", err.response?.data || err.message);
    throw err;
  }
};

module.exports = { deleteLocketMoment };
