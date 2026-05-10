const Router = require("express");
const router = Router();

// Returns empty themes list — overlay themes are not part of self-hosted
router.get("/themes", (req, res) => {
  res.json([]);
});

module.exports = router;
