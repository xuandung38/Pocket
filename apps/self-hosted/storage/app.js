require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const { logGroupWrapper, logInfo } = require("./src/utils/logEventUtils");

const app = express();

// ✅ CORS: allow any request origin (reflects the caller's Origin). `credentials:
// true` forbids a "*" wildcard, so cors echoes the Origin back instead — valid
// with credentials. Matches the api service so the presignedV3 upload call works
// from localhost, a LAN IP (phone / cross-device testing), or any host.
// (Self-hosted on a trusted network; tighten with an allowlist if exposed publicly.)
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Các middleware khác
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logGroupWrapper);

// Nạp các route vào ứng dụng
routes(app);

// Khởi động server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  logInfo("SERVER", `🚀 Backend đang chạy tại http://localhost:${PORT}`);
});
