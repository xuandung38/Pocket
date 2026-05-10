const Router = require("express");
const router = Router();
const { getCurrentWeather } = require("../services/Weather/weather-service");

router.post("/weatherV2", async (req, res, next) => {
  try {
    const { lat, lon } = req.body;
    if (!lat || !lon) {
      return res.status(400).json({ status: "error", message: "Thiếu lat hoặc lon" });
    }
    const data = await getCurrentWeather(lat, lon);
    return res.json({ status: "success", message: "Lấy thông tin thời tiết thành công!", data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
