import { CONFIG } from "@/config";
import { instanceExten } from "@/lib/axios.exten";
import api from "@/lib/axios";

export const fetchUserById = async (uid) => {
  if (!uid) return;

  const body = {
    data: {
      user_uid: uid,
    },
  };
  const res = await api.post("/locket/proxy/fetchUserV2", body);

  return res?.data?.result?.data;
};

const Link = CONFIG.api.extenApi;
export const fetchUserByToken = async (token) => {
  if (!token) return;
  const url = `${Link}/fetchUserV3`;
  const body = {
    token: token,
  };
  const res = await instanceExten.post(url, body);

  return res?.data?.data;
};
