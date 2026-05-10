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

const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];

const app = express();
app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

routes(app);
app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

setupChatNamespace(io);

const PORT = process.env.PORT;

server.listen(PORT, () => {
  logInfo("SERVER", `Server backend is running at localhost:${PORT}`);
});
