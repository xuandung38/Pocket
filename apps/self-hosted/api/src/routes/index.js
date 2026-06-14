const locketRouter = require("./locket.route.js");
const publicRouter = require("./public.route.js");
const apiRouter = require("./api.route.js");

module.exports = (app) => {
  app.get("/", (req, res) => {
    res.json({ message: "🚀 Server is running!" });
  });

  app.use("/locket", locketRouter);
  app.use("/v1/public", publicRouter);
  app.use("/api", apiRouter);
};
