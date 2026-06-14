"use strict";

const express = require("express");
const { listFrames, createFrame, deleteFrame } = require("../controllers/FrameController");
const { verifyIdToken } = require("../middlewares/verifyIdToken");

const router = express.Router();

// All frame routes require a valid idToken — req.user.uid is set by verifyIdToken
router.get("/frames", verifyIdToken, listFrames);
router.post("/frames", verifyIdToken, createFrame);
router.delete("/frames/:id", verifyIdToken, deleteFrame);

module.exports = router;
