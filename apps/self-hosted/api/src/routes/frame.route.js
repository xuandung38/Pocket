// Frame library routes.
// All endpoints require a valid Firebase ID token via verifyIdToken.
// Mounted at /api/frames in src/routes/index.js.

"use strict";

const Router = require("express");
const router = Router();

const { verifyIdToken } = require("../middlewares/verifyToken");
const frameController = require("../controllers/frame.controller");

// GET  /api/frames          — list builtin frames + caller's custom frames
router.get("/", verifyIdToken, frameController.listFrames);

// POST /api/frames          — create a custom frame (body: { name, url, key })
router.post("/", verifyIdToken, frameController.createFrame);

// DELETE /api/frames/:id    — delete a caller-owned custom frame
router.delete("/:id", verifyIdToken, frameController.deleteFrame);

module.exports = router;
