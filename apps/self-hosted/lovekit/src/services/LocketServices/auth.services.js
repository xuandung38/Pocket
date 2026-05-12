import api from "@/lib/axios";

export const ValidateEmailAddress = async (email) => {
  try {
    const body = {
      data: {
        email: email,
        operation: "sign_in",
        platform: "ios",
      },
    };
    const res = await api.post("/locket/proxy/validateEmailAddress", body);
    return res.data;
  } catch (error) {
    if (error.response && error.response.data?.error) {
      throw error.response.data.error;
    }
    console.error("❌ Network Error:", error.message);
    throw new Error(
      "Có sự cố khi kết nối đến hệ thống, vui lòng thử lại sau ít phút."
    );
  }
};
