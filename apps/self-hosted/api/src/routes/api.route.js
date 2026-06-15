const Router = require("express");
const router = Router();
const { getCurrentWeather } = require("../services/Weather/weather-service");
const { getMusicInfo } = require("../services/Music/music-service");
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

// Resolve a Spotify/Apple Music share link → caption metadata for the music
// overlay. Bad/unsupported links return 400 (not a 500) so the client can show
// a friendly "check your link" toast.
router.post("/getInfoMusic", verifyIdToken, async (req, res) => {
  try {
    const { url, platform } = req.body;
    if (!url) {
      return res.status(400).json({ status: "error", message: "Thiếu url" });
    }
    const data = await getMusicInfo(url, platform);
    return res.json({ status: "success", message: "ok", data });
  } catch (error) {
    return res
      .status(400)
      .json({ status: "error", message: error.message || "Không lấy được thông tin nhạc" });
  }
});

// Compatibility shim — FE expects R2-style `/api/presignedV3`. Maps to a
// Firebase resumable upload session under the hood. To be removed when FE
// migrates to `/locket/initUpload` + `/locket/finalizeUpload` (Phase 05).
router.post("/presignedV3", verifyIdToken, storageController.presignedV3);

module.exports = router;
