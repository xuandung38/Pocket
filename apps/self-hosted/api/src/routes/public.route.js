const Router = require("express");
const router = Router();

const overlaysController = require("../controllers/overlays.controller.js");

// Returns empty themes list — overlay themes are not part of self-hosted
router.get("/themes", (req, res) => {
  res.json([]);
});

// Full caption/overlay preset dataset, proxied from the Locket Dio public data
// API (cached + fallback []). See overlays.controller.js.
router.get("/getAllOverlaysV2", overlaysController.getAllOverlaysV2);

// Camera backgrounds and frames — not part of self-hosted, return empty list
router.get("/getAllbackgrounds", (req, res) => {
  res.json([]);
});

router.get("/myframes", (req, res) => {
  res.json([]);
});

module.exports = router;
