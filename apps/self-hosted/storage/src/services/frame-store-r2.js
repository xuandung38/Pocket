"use strict";

// R2 JSON store helpers for frame metadata.
// All frame lists are stored as plain JSON arrays in R2:
//   frames/builtin.json          — global built-in frame array (written by seed)
//   frames/users/{uid}.json      — per-user custom frame array (written by API)

const { s3, PutObjectCommand, GetObjectCommand } = require("../../config/r2-storage");
const constants = require("../constants/storageConfig");

/**
 * Read a JSON value from R2. Returns [] when the key does not exist (NoSuchKey / 404).
 * Throws on any other R2 error.
 *
 * @param {string} key  R2 object key
 * @returns {Promise<any>}
 */
async function getJson(key) {
  try {
    const cmd = new GetObjectCommand({
      Bucket: constants.BUCKET_NAME,
      Key: key,
    });
    const result = await s3.send(cmd);

    // result.Body is a Node.js Readable (aws-sdk v3 on Node). Stream to buffer.
    const chunks = [];
    for await (const chunk of result.Body) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch (err) {
    // R2 / S3 uses "NoSuchKey" error code for missing objects
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw err;
  }
}

/**
 * Serialize `obj` as JSON and PUT it to R2 at `key`.
 *
 * @param {string} key   R2 object key
 * @param {any}    obj   Value to serialize
 * @returns {Promise<void>}
 */
async function putJson(key, obj) {
  const body = JSON.stringify(obj);
  const cmd = new PutObjectCommand({
    Bucket: constants.BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: "application/json",
  });
  await s3.send(cmd);
}

module.exports = { getJson, putJson };
