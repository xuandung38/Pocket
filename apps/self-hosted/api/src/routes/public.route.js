const Router = require("express");
const router = Router();

// Returns empty themes list — overlay themes are not part of self-hosted
router.get("/themes", (req, res) => {
  res.json([]);
});

// Camera backgrounds and frames — not part of self-hosted, return empty list
router.get("/getAllbackgrounds", (req, res) => {
  res.json([]);
});

router.get("/myframes", (req, res) => {
  res.json([]);
});

module.exports = router;
