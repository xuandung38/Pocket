const { instanceFirestore } = require("../../libs/instanceFirestore.js");

const getAllFriends = async (idToken, localId) => {
  let pageToken = null;
  const allFriends = [];

  try {
    do {
      const response = await instanceFirestore.get(
        `(default)/documents/users/${localId}/friends`,
        {
          params: {
            pageSize: 100,
            ...(pageToken && { pageToken }),
          },
          meta: { idToken },
        }
      );

      const documents = response.data.documents || [];

      const parsedFriends = documents.map((doc) => ({
        uid: doc.fields?.user?.stringValue,
        date: doc.createTime,
      }));

      allFriends.push(...parsedFriends);

      pageToken = response.data.nextPageToken || null;

    } while (pageToken);

    return allFriends;

  } catch (error) {
    console.error(
      "❌ Lỗi khi lấy danh sách bạn bè:",
      error.response?.data || error.message
    );
    return [];
  }
};

const getIncomingFriendRequests = async (idToken, localId, pageToken = null, limit = 10) => {
  try {
    const params = { pageSize: limit };
    if (pageToken) params.pageToken = pageToken;

    const response = await instanceFirestore.get(
      `(default)/documents/users/${localId}/incomingFriendRequests`,
      { params, meta: { idToken } },
    );

    const documents = response.data.documents || [];
    const data = documents.map((doc) => ({
      uid: doc.fields?.user?.stringValue || doc.name?.split("/").pop(),
      date: doc.createTime,
    }));

    return { data, nextPageToken: response.data.nextPageToken || null };
  } catch (error) {
    console.error("❌ getIncomingFriendRequests:", error.response?.data || error.message);
    return { data: [], nextPageToken: null };
  }
};

const getOutgoingFriendRequests = async (idToken, localId, pageToken = null, limit = 100) => {
  try {
    const params = { pageSize: limit };
    if (pageToken) params.pageToken = pageToken;

    const response = await instanceFirestore.get(
      `(default)/documents/users/${localId}/outgoingFriendRequests`,
      { params, meta: { idToken } },
    );

    const documents = response.data.documents || [];
    const data = documents.map((doc) => ({
      to: doc.fields?.user?.stringValue || doc.name?.split("/").pop(),
      date: doc.createTime,
    }));

    return { data, nextPageToken: response.data.nextPageToken || null };
  } catch (error) {
    console.error("❌ getOutgoingFriendRequests:", error.response?.data || error.message);
    return { data: [], nextPageToken: null };
  }
};

module.exports = {
  getAllFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
};
