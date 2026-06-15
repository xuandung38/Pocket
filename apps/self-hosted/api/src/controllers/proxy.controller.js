// proxy.controller.js
// Stream remote moment/CDN images through this origin so the browser can fetch
// their bytes (for Save / Web Share file). Locket's CDN (cdn.locketcamera.com)
// and Firebase Storage do NOT send CORS headers, so a direct browser fetch is
// blocked; re-serving here lets the global CORS middleware apply.
//
// A host allowlist keeps this from becoming an open proxy / SSRF vector.

const axios = require("axios");

const ALLOWED_HOSTS = new Set([
  "cdn.locketcamera.com",
  "firebasestorage.googleapis.com",
]);

async function proxyImage(req, res, next) {
  try {
    const raw = req.query.url;
    if (!raw) {
      return res.status(400).json({ status: "error", message: "Thiếu url" });
    }

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return res.status(400).json({ status: "error", message: "url không hợp lệ" });
    }

    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
      return res.status(403).json({ status: "error", message: "Host không được phép" });
    }

    const upstream = await axios.get(raw, {
      responseType: "stream",
      timeout: 15000,
    });

    res.setHeader("Content-Type", upstream.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    if (upstream.headers["content-length"]) {
      res.setHeader("Content-Length", upstream.headers["content-length"]);
    }
    upstream.data.pipe(res);
  } catch (err) {
    if (err.response) {
      return res
        .status(err.response.status)
        .json({ status: "error", message: "Không tải được ảnh nguồn" });
    }
    next(err);
  }
}

module.exports = { proxyImage };
