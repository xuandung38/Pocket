const mediaRoutes = require("./PresignedRoutes");
const frameRoutes = require("./FrameRoutes");

module.exports = (app) => {
  app.get("/", (req, res) => {
    res.json({ message: "🚀 Server is running!" });
  });

  app.use("/api", mediaRoutes);
  app.use("/api", frameRoutes);
};
