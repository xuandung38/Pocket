import api from "@/lib/axios";
import { getISOWeek } from "@/utils";

export const getRollcallPosts = async ({ selectWeek, selectYear }) => {
  const { year, week } = getISOWeek();
  try {
    const body = {
      data: {
        week_of_year: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: selectWeek || week,
        },
        source: "feed",
        year: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: selectYear || year,
        },
      },
    };
    const res = await api.post("/locket/proxy/getRollcallPosts", body);
    const moments = res.data?.result?.data?.posts;
    return moments;
  } catch (err) {
    console.warn("❌ getRollcallPosts Failed", err);
  }
};

export const postRollcallReaction = async ({}) => {
  try {
    const body = {
      data: {
        x: 0,
        y: 1,
        rotation: 0.17351480882007525,
        reaction: "🔥",
        post_user_uid: "NzGrCyCyOjcVPpGvlLcaiIiujaA3",
        post_uid: "bSIcLYRunxenfxptYFeQ",
        scale: 1,
      },
    };
    const res = await api.post("/locket/proxy/postRollcallReaction", body);
    const moments = res.data?.result?.data?.posts;
    return moments;
  } catch (err) {
    console.warn("❌ postRollcallReaction Failed", err);
  }
};

export const likeRollcallComment = async ({}) => {
  try {
    const body = {
      data: {
        post_user_uid: "NzGrCyCyOjcVPpGvlLcaiIiujaA3",
        post_uid: "bSIcLYRunxenfxptYFeQ",
        post_comment_id: "STgwjqm0Kq4bzPHQ4x25",
        like: true,
      },
    };
    const res = await api.post("/locket/proxy/likeRollcallComment", body);
    const moments = res.data?.result;
    return moments;
  } catch (err) {
    console.warn("❌ likeRollcallComment Failed", err);
  }
};

export const postRollcallComment = async ({}) => {
  try {
    const body = {
      data: {
        reply_user_uid: "uid",
        post_user_uid: "NzGrCyCyOjcVPpGvlLcaiIiujaA3",
        post_uid: "bSIcLYRunxenfxptYFeQ",
        post_item_id: "STgwjqm0Kq4bzPHQ4x25",
        body: "string",
      },
    };
    const res = await api.post("/locket/proxy/postRollcallComment", body);
    const moments = res.data?.result;
    return moments;
  } catch (err) {
    console.warn("❌ postRollcallComment Failed", err);
  }
};
