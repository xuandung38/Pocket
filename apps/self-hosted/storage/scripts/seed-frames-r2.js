"use strict";

// Seed script — renders 20 built-in PNG frames + Polaroid entry and writes them to R2.
// Produces:
//   frames/builtin/<slug>.png   — transparent-center 1080×1080 PNG for each design
//   frames/builtin.json         — Frame[] manifest consumed by GET /api/frames
//
// NO Firebase dependency. No SEED_ID_TOKEN. R2 env vars only.
//
// REQUIRED ENV:
//   R2_ENDPOINT    — e.g. https://<accountId>.r2.cloudflarestorage.com
//   R2_ACCESS_KEY  — R2 access key ID
//   R2_SECRET_KEY  — R2 secret access key
//   R2_BUCKET      — R2 bucket name
//   MEDIA_URL      — public CDN base URL  (or MEDIA_API_URL as fallback)
//
// PREREQUISITES:
//   sharp must be available: npm install --no-save sharp
//
// HOW TO RUN (from storage/ directory):
//   R2_ENDPOINT=https://... R2_ACCESS_KEY=... R2_SECRET_KEY=... \
//     R2_BUCKET=... MEDIA_URL=https://... node scripts/seed-frames-r2.js
//
//   Or with a .env file in storage/ already populated:
//     node scripts/seed-frames-r2.js
//
// IDEMPOTENT: overwrites existing PNGs and builtin.json on every run (safe).

require("dotenv").config();

// ---------------------------------------------------------------------------
// sharp — must be installed separately; fail fast with a helpful message
// ---------------------------------------------------------------------------
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(
    "[seed-frames-r2] 'sharp' is not installed. Run:\n  npm install --no-save sharp\nthen retry."
  );
  process.exit(1);
}

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { FEMININE_FRAMES } = require("./frame-designs");

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------

const REQUIRED_VARS = ["R2_ENDPOINT", "R2_ACCESS_KEY", "R2_SECRET_KEY", "R2_BUCKET"];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`[seed-frames-r2] Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const MEDIA_URL = (process.env.MEDIA_URL || process.env.MEDIA_API_URL || "").replace(/\/$/, "");
if (!MEDIA_URL) {
  console.error("[seed-frames-r2] Missing MEDIA_URL or MEDIA_API_URL env var.");
  process.exit(1);
}

const BUCKET = process.env.R2_BUCKET;
const FRAME_SIZE = 1080; // must match client CANVAS_SIZE

// ---------------------------------------------------------------------------
// S3 client (uses storage's installed @aws-sdk/client-s3)
// ---------------------------------------------------------------------------

const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/**
 * Render an SVG string to a transparent-center 1080×1080 PNG buffer via sharp.
 * Only the frame decoration pixels carry colour — the center remains transparent.
 *
 * @param {string} svgString  Full <svg>…</svg> markup
 * @returns {Promise<Buffer>}
 */
async function generateFramePng(svgString) {
  return sharp({
    create: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: Buffer.from(svgString), gravity: "northwest" }])
    .png()
    .toBuffer();
}

/**
 * Upload a Buffer to R2.
 *
 * @param {string} key
 * @param {Buffer|string} body
 * @param {string} contentType
 */
async function putObject(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Serialize `obj` as JSON and PUT to R2. */
async function putJson(key, obj) {
  await putObject(key, JSON.stringify(obj), "application/json");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[seed-frames-r2] Starting — bucket: ${BUCKET}, MEDIA_URL: ${MEDIA_URL}`);

  const createdAt = new Date().toISOString();
  const builtinFrames = [];

  // 1. Render + upload 20 PNG frames and build manifest entries
  for (const def of FEMININE_FRAMES) {
    const slug = slugify(def.name);
    const key = `frames/builtin/${slug}.png`;
    const url = `${MEDIA_URL}/${key}`;

    console.log(`[seed-frames-r2] Generating PNG: "${def.name}" → ${key}`);
    const pngBuffer = await generateFramePng(def.svg);

    console.log(`[seed-frames-r2] Uploading ${key} (${pngBuffer.length} bytes)…`);
    await putObject(key, pngBuffer, "image/png");

    builtinFrames.push({
      id: slug,            // stable slug-based id — deterministic across re-runs
      scope: "builtin",
      ownerUid: null,
      name: def.name,
      type: "png",
      url,
      key,
      order: def.order,
      createdAt,
    });
    console.log(`[seed-frames-r2] ✓ ${key}`);
  }

  // 2. Polaroid entry — client-rendered; no R2 asset needed
  builtinFrames.push({
    id: "polaroid",
    scope: "builtin",
    ownerUid: null,
    name: "Polaroid",
    type: "polaroid",
    url: null,
    key: null,
    order: 20,
    createdAt,
  });

  // 3. Write manifest to frames/builtin.json
  const manifestKey = "frames/builtin.json";
  console.log(
    `[seed-frames-r2] Writing manifest ${manifestKey} (${builtinFrames.length} entries)…`
  );
  await putJson(manifestKey, builtinFrames);

  console.log("[seed-frames-r2] Done.");
}

main().catch((err) => {
  console.error("[seed-frames-r2] Fatal:", err?.message || err);
  process.exit(1);
});
