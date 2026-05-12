const Router = require("express");
const router = Router();
const { getCurrentWeather } = require("../services/Weather/weather-service");
const { verifyIdToken } = require("../middlewares/verifyToken.js");
const storageController = require("../controllers/storage.controller.js");

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

// Compatibility shim — FE expects R2-style `/api/presignedV3`. Maps to a
// Firebase resumable upload session under the hood. To be removed when FE
// migrates to `/locket/initUpload` + `/locket/finalizeUpload` (Phase 05).
router.post("/presignedV3", verifyIdToken, storageController.presignedV3);

module.exports = router;
