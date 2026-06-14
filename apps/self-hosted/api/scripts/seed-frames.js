// Seed script — writes built-in frame docs to Firestore and uploads placeholder PNGs to R2.
//
// DESIGN NOTES:
// - R2 upload uses pure Node.js built-ins (crypto + https) with AWS Signature V4,
//   so @aws-sdk/client-s3 is NOT required. The script runs entirely in the api container.
// - PNG generation uses `sharp` (api/node_modules/sharp).
// - Firestore writes use `axios` (api/node_modules/axios) + FIREBASE_FIRESTORE_API_BASE.
// - IDEMPOTENT: skips any built-in frame whose `name` already exists in Firestore.
//
// REQUIRED ENV VARS:
//   FIREBASE_FIRESTORE_API_BASE  — e.g. https://firestore.googleapis.com/v1/projects/{id}/databases/
//   SEED_ID_TOKEN                — a valid Firebase user ID token (from any logged-in user)
//   R2_ENDPOINT                  — Cloudflare R2 endpoint, e.g. https://{accountId}.r2.cloudflarestorage.com
//   R2_ACCESS_KEY                — R2 access key ID
//   R2_SECRET_KEY                — R2 secret access key
//   R2_BUCKET                    — R2 bucket name
//   MEDIA_URL                    — public CDN base URL, e.g. https://media.example.com
//
// HOW TO RUN (api container has all required dependencies + env vars from .env):
//   1. Add R2_* vars to api/.env (copy from storage/.env) for this one-time run, OR
//   2. Pass them inline:
//        R2_ENDPOINT=... R2_ACCESS_KEY=... R2_SECRET_KEY=... R2_BUCKET=... \
//        MEDIA_URL=... SEED_ID_TOKEN=<token> \
//        docker compose exec api node scripts/seed-frames.js
//
// PLACEHOLDER PNGS:
//   These are transparent-center frames with a colored SVG border rendered via sharp.
//   Replace them with production-quality PNGs by updating the R2 objects at the same keys.

"use strict";

require("dotenv").config();

const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const path = require("path");
const axios = require("axios");

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------

const REQUIRED_VARS = [
  "FIREBASE_FIRESTORE_API_BASE",
  "SEED_ID_TOKEN",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY",
  "R2_SECRET_KEY",
  "R2_BUCKET",
  "MEDIA_URL",
];

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`[seed-frames] Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const {
  FIREBASE_FIRESTORE_API_BASE,
  SEED_ID_TOKEN,
  R2_ENDPOINT,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  R2_BUCKET,
  MEDIA_URL,
} = process.env;

// ---------------------------------------------------------------------------
// AWS Signature V4 — PUT object (no @aws-sdk dependency)
// ---------------------------------------------------------------------------

function hmacSha256(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// PUT a Buffer to R2 via raw HTTPS + AWS SigV4.
async function r2PutObject(key, body, contentType) {
  const region = "auto"; // Cloudflare R2 uses region "auto"
  const service = "s3";
  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const amzdate = datestamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";

  const objectUrl = new URL(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`);
  const host = objectUrl.host;
  const urlPath = objectUrl.pathname;
  const payloadHash = sha256hex(body);

  // Canonical headers — must be sorted alphabetically by key.
  const hdrMap = {
    "content-type": contentType,
    "host": host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzdate,
  };
  const sortedKeys = Object.keys(hdrMap).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${hdrMap[k]}\n`).join("");
  const signedHeaders = sortedKeys.join(";");

  const canonicalRequest = [
    "PUT",
    urlPath,
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzdate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmacSha256(
    hmacSha256(hmacSha256(hmacSha256(`AWS4${R2_SECRET_KEY}`, datestamp), region), service),
    "aws4_request",
  );
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const protocol = objectUrl.protocol === "https:" ? https : http;
    const port = objectUrl.port
      ? parseInt(objectUrl.port, 10)
      : objectUrl.protocol === "https:" ? 443 : 80;

    const req = protocol.request(
      {
        method: "PUT",
        hostname: objectUrl.hostname,
        port,
        path: urlPath,
        headers: {
          ...hdrMap,
          authorization,
          "content-length": body.length,
        },
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () =>
            reject(new Error(`R2 PUT ${res.statusCode} for key "${key}": ${data}`)),
          );
        }
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// PNG generation via sharp (available in api/node_modules)
// ---------------------------------------------------------------------------

async function generateFramePng(width, height, borderColor, borderWidth) {
  // Dynamically require sharp — available in api container.
  const sharp = require("sharp");

  // Transparent center, colored rectangular border via SVG overlay.
  const innerX = borderWidth / 2;
  const innerY = borderWidth / 2;
  const innerW = width - borderWidth;
  const innerH = height - borderWidth;

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}"
            fill="none" stroke="${borderColor}" stroke-width="${borderWidth}"/>
    </svg>`,
  );

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: svg }])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Firestore helpers (REST API via axios, same base as instanceFirestore)
// ---------------------------------------------------------------------------

const firestoreBase = FIREBASE_FIRESTORE_API_BASE.replace(/\/$/, "");
const framesCollection = `${firestoreBase}/(default)/documents/frames`;
const runQueryUrl = `${firestoreBase}/(default)/documents:runQuery`;

function firestoreHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SEED_ID_TOKEN}`,
  };
}

// Check if a builtin frame with this name already exists (idempotency).
async function builtinFrameExists(name) {
  const res = await axios.post(
    runQueryUrl,
    {
      structuredQuery: {
        from: [{ collectionId: "frames" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "scope" },
                  op: "EQUAL",
                  value: { stringValue: "builtin" },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: "name" },
                  op: "EQUAL",
                  value: { stringValue: name },
                },
              },
            ],
          },
        },
        limit: 1,
      },
    },
    { headers: firestoreHeaders() },
  );
  return (res.data || []).some((item) => item.document);
}

// Write a builtin frame doc to Firestore. Returns the created doc.
async function writeBuiltinFrameDoc({ name, type, url, key, order }) {
  const fields = {
    scope: { stringValue: "builtin" },
    ownerUid: { nullValue: null },
    name: { stringValue: name },
    type: { stringValue: type },
    order: { integerValue: String(order) },
    createdAt: { timestampValue: new Date().toISOString() },
  };

  // url and key only present for PNG frames (Polaroid has neither).
  if (url) fields.url = { stringValue: url };
  if (key) fields.key = { stringValue: key };

  const res = await axios.post(
    framesCollection,
    { fields },
    { headers: firestoreHeaders() },
  );
  return res.data;
}

// ---------------------------------------------------------------------------
// Built-in frame definitions
// ---------------------------------------------------------------------------

const PNG_FRAME_DEFS = [
  { name: "White Border", borderColor: "#FFFFFF", borderWidth: 24, order: 0 },
  { name: "Gold Border",  borderColor: "#D4AF37", borderWidth: 18, order: 1 },
  { name: "Black Border", borderColor: "#000000", borderWidth: 24, order: 2 },
];

const POLAROID_FRAME_DEF = {
  name: "Polaroid",
  type: "polaroid",
  order: 3, // displayed after PNG frames
};

const FRAME_SIZE = 400; // placeholder square PNG dimension in px
const FRAME_CONTENT_TYPE = "image/png";

// R2 key prefix for built-in frame assets.
function frameR2Key(slug) {
  return `frames/builtin/${slug}.png`;
}

// Public CDN URL for an R2 key.
function framePublicUrl(key) {
  return `${MEDIA_URL.replace(/\/$/, "")}/${key}`;
}

// Slugify a frame name to a safe file name.
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[seed-frames] Starting built-in frame seed...");

  // 1. Seed PNG frames.
  for (const def of PNG_FRAME_DEFS) {
    if (await builtinFrameExists(def.name)) {
      console.log(`[seed-frames] Skipping "${def.name}" — already exists.`);
      continue;
    }

    console.log(`[seed-frames] Generating PNG for "${def.name}"...`);
    const pngBuffer = await generateFramePng(FRAME_SIZE, FRAME_SIZE, def.borderColor, def.borderWidth);

    const key = frameR2Key(slugify(def.name));
    console.log(`[seed-frames] Uploading to R2: ${key} (${pngBuffer.length} bytes)...`);
    await r2PutObject(key, pngBuffer, FRAME_CONTENT_TYPE);
    console.log(`[seed-frames] R2 upload OK: ${key}`);

    const url = framePublicUrl(key);
    const doc = await writeBuiltinFrameDoc({ name: def.name, type: "png", url, key, order: def.order });
    const docId = doc.name?.split("/").pop();
    console.log(`[seed-frames] Firestore doc created: frames/${docId} — "${def.name}" url=${url}`);
  }

  // 2. Seed Polaroid entry (no R2 asset — client renders it based on type).
  if (await builtinFrameExists(POLAROID_FRAME_DEF.name)) {
    console.log(`[seed-frames] Skipping "${POLAROID_FRAME_DEF.name}" — already exists.`);
  } else {
    const doc = await writeBuiltinFrameDoc({
      name: POLAROID_FRAME_DEF.name,
      type: POLAROID_FRAME_DEF.type,
      url: null,
      key: null,
      order: POLAROID_FRAME_DEF.order,
    });
    const docId = doc.name?.split("/").pop();
    console.log(`[seed-frames] Firestore doc created: frames/${docId} — "${POLAROID_FRAME_DEF.name}" (no R2 asset)`);
  }

  console.log("[seed-frames] Done.");
}

main().catch((err) => {
  console.error("[seed-frames] Fatal error:", err?.message || err);
  if (err?.response?.data) {
    console.error("[seed-frames] Response body:", JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
