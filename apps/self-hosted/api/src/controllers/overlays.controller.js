// overlays.controller.js
// Serve the caption/overlay preset dataset by proxying the Locket Dio public
// data API. The self-hosted backend has no overlay dataset of its own, so we
// re-serve `getAllOverlaysV2` from data.locket-dio.com (same source the
// reference Locket Dio client uses).
//
// The key below is the locket-dio PUBLIC frontend key (published in their
// public client repo, marked "safe for frontend"); override via env if needed.
// Response is cached in-memory with a TTL to spare the upstream. On any upstream
// failure we return [] so the frontend degrades gracefully (no captions rather
// than a 500).

const axios = require("axios");

const UPSTREAM_BASE = process.env.LOCKETDIO_DATA_BASE || "https://data.locket-dio.com";
const UPSTREAM_KEY =
  process.env.LOCKETDIO_DATA_KEY || "LKD-LOCKETDIO-AB02F55KYM55DD02MM03YY25-LKD";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache = { data: null, ts: 0 };

async function getAllOverlaysV2(req, res, next) {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL_MS) {
      return res.json(cache.data);
    }

    const upstream = await axios.get(`${UPSTREAM_BASE}/v1/public/getAllOverlaysV2`, {
      timeout: 15000,
      headers: {
        "x-api-key": UPSTREAM_KEY,
        "x-app-name": "locket-dio",
        "x-app-author": "locket-dio",
        "Content-Type": "application/json",
      },
    });

    // Upstream may wrap the array in { data: [...] } — normalize to the array.
    const payload = upstream.data;
    const data = Array.isArray(payload) ? payload : payload?.data ?? [];

    cache = { data, ts: now };
    return res.json(data);
  } catch (err) {
    console.warn("[overlays.controller] upstream fetch failed:", err?.message);
    // Serve last good cache if we have one, else an empty list.
    if (cache.data) return res.json(cache.data);
    return res.json([]);
  }
}

module.exports = { getAllOverlaysV2 };
