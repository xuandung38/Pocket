const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

const cors = require("cors");
const { Server } = require("socket.io");
const { logInfo } = require("./src/utils/logEventUtils.js");
const { setupChatNamespace } = require("./src/socket/chat-namespace-handler");

// Routers
const routes = require("./src/routes/index.js");
const errorHandler = require("./src/helpers/error-handler.js");

// CORS: allow any request origin. `credentials: true` forbids a "*" wildcard,
// so `origin: true` makes the cors middleware echo back the caller's Origin
// header instead — which is valid alongside credentials. This lets the app be
// reached from localhost, a LAN IP (e.g. http://192.168.x.x:5175 for phone /
// cross-device testing), or any host without maintaining an allowlist.
// (Self-hosted on a trusted network. If this API is ever exposed to the public
// internet, replace `origin: true` with an explicit allowlist or origin fn.)
const CORS_OPTIONS = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

const app = express();
app.use(cors(CORS_OPTIONS));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

routes(app);
app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

setupChatNamespace(io);

const PORT = process.env.PORT;

server.listen(PORT, () => {
  logInfo("SERVER", `Server backend is running at localhost:${PORT}`);
});
